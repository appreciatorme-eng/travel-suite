import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { captureOperationalMetric } from "@/lib/observability/metrics";
import { getRequestContext, getRequestId, logError, logEvent } from "@/lib/observability/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function withRequestId(body: Record<string, unknown>, requestId: string, init?: ResponseInit) {
    const response = NextResponse.json({ ...body, request_id: requestId }, init);
    response.headers.set("x-request-id", requestId);
    return response;
}

function normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    const normalized = phone.replace(/\D/g, "");
    return normalized || null;
}

async function getAdminProfile(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return null;

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id,role,organization_id")
        .eq("id", authData.user.id)
        .maybeSingle();

    if (!profile || profile.role !== "admin") return null;
    return profile;
}

export async function GET(req: NextRequest) {
    const startedAt = Date.now();
    const requestId = getRequestId(req);
    const requestContext = getRequestContext(req, requestId);

    try {
        const adminProfile = await getAdminProfile(req);
        if (!adminProfile) return withRequestId({ error: "Unauthorized" }, requestId, { status: 401 });
        if (!adminProfile.organization_id) return withRequestId({ error: "Admin organization not configured" }, requestId, { status: 400 });

        const { searchParams } = new URL(req.url);
        const search = (searchParams.get("search") || "").trim().toLowerCase();

        let query = supabaseAdmin
            .from("crm_contacts")
            .select("id,full_name,email,phone,phone_normalized,source,notes,converted_profile_id,converted_at,created_at")
            .eq("organization_id", adminProfile.organization_id)
            .is("converted_profile_id", null)
            .order("created_at", { ascending: false })
            .limit(200);

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
            logError("Contacts list query failed", error, requestContext);
            return withRequestId({ error: error.message }, requestId, { status: 500 });
        }

        const durationMs = Date.now() - startedAt;
        logEvent("info", "Contacts list fetched", {
            ...requestContext,
            rows: data?.length || 0,
            durationMs,
        });
        void captureOperationalMetric("api.admin.contacts.list", {
            request_id: requestId,
            rows: data?.length || 0,
            duration_ms: durationMs,
        });

        return withRequestId({ contacts: data || [] }, requestId);
    } catch (error) {
        Sentry.captureException(error);
        logError("Contacts list crashed", error, requestContext);
        return withRequestId(
            { error: error instanceof Error ? error.message : "Unknown error" },
            requestId,
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const startedAt = Date.now();
    const requestId = getRequestId(req);
    const requestContext = getRequestContext(req, requestId);

    try {
        const adminProfile = await getAdminProfile(req);
        if (!adminProfile) return withRequestId({ error: "Unauthorized" }, requestId, { status: 401 });
        if (!adminProfile.organization_id) return withRequestId({ error: "Admin organization not configured" }, requestId, { status: 400 });

        const body = await req.json();
        const source = String(body.source || "manual").trim();
        const payload = Array.isArray(body.contacts) ? body.contacts : [body];

        let imported = 0;

        for (const item of payload) {
            const fullName = String(item.full_name || item.name || "").trim();
            const email = String(item.email || "").trim().toLowerCase() || null;
            const phone = String(item.phone || item.tel || "").trim() || null;
            const phoneNormalized = normalizePhone(phone);
            const notes = String(item.notes || "").trim() || null;

            if (!fullName && !email && !phoneNormalized) {
                continue;
            }

            let existingId: string | null = null;
            if (email) {
                const { data: existingByEmail } = await supabaseAdmin
                    .from("crm_contacts")
                    .select("id")
                    .eq("organization_id", adminProfile.organization_id)
                    .eq("email", email)
                    .is("converted_profile_id", null)
                    .maybeSingle();
                existingId = existingByEmail?.id || null;
            }

            if (!existingId && phoneNormalized) {
                const { data: existingByPhone } = await supabaseAdmin
                    .from("crm_contacts")
                    .select("id")
                    .eq("organization_id", adminProfile.organization_id)
                    .eq("phone_normalized", phoneNormalized)
                    .is("converted_profile_id", null)
                    .maybeSingle();
                existingId = existingByPhone?.id || null;
            }

            if (existingId) {
                const { error } = await supabaseAdmin
                    .from("crm_contacts")
                    .update({
                        full_name: fullName || undefined,
                        email,
                        phone,
                        phone_normalized: phoneNormalized,
                        notes,
                        source,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingId);

                if (!error) imported += 1;
                continue;
            }

            const { error } = await supabaseAdmin
                .from("crm_contacts")
                .insert({
                    organization_id: adminProfile.organization_id,
                    full_name: fullName || email || phoneNormalized || "Unknown Contact",
                    email,
                    phone,
                    phone_normalized: phoneNormalized,
                    notes,
                    source,
                    created_by: adminProfile.id,
                });

            if (!error) imported += 1;
        }

        const durationMs = Date.now() - startedAt;
        logEvent("info", "Contacts imported", {
            ...requestContext,
            imported,
            source,
            durationMs,
        });
        void captureOperationalMetric("api.admin.contacts.import", {
            request_id: requestId,
            imported,
            source,
            duration_ms: durationMs,
        });
        return withRequestId({ ok: true, imported }, requestId);
    } catch (error) {
        Sentry.captureException(error);
        logError("Contacts import crashed", error, requestContext);
        return withRequestId(
            { error: error instanceof Error ? error.message : "Unknown error" },
            requestId,
            { status: 500 }
        );
    }
}
