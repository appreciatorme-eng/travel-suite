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

export async function POST(req: NextRequest, { params }: { params?: { id?: string } }) {
    const startedAt = Date.now();
    const requestId = getRequestId(req);
    const requestContext = getRequestContext(req, requestId);

    try {
        const adminProfile = await getAdminProfile(req);
        if (!adminProfile) return withRequestId({ error: "Unauthorized" }, requestId, { status: 401 });
        if (!adminProfile.organization_id) return withRequestId({ error: "Admin organization not configured" }, requestId, { status: 400 });

        const id = (params?.id || "").trim();
        const { data: contact } = await supabaseAdmin
            .from("crm_contacts")
            .select("id,organization_id,full_name,email,phone,phone_normalized,converted_profile_id")
            .eq("id", id)
            .maybeSingle();

        if (!contact || contact.organization_id !== adminProfile.organization_id) {
            return withRequestId({ error: "Contact not found" }, requestId, { status: 404 });
        }

        if (contact.converted_profile_id) {
            return withRequestId({ ok: true, profile_id: contact.converted_profile_id, already_converted: true }, requestId);
        }

        const normalizedPhone = contact.phone_normalized || normalizePhone(contact.phone);
        let profileId: string | null = null;

        if (contact.email) {
            const { data: existingByEmail } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("email", contact.email.toLowerCase())
                .maybeSingle();
            profileId = existingByEmail?.id || null;
        }

        if (!profileId && normalizedPhone) {
            const { data: existingByPhone } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("phone_normalized", normalizedPhone)
                .maybeSingle();
            profileId = existingByPhone?.id || null;
        }

        if (!profileId) {
            if (!contact.email) {
                return withRequestId(
                    { error: "Cannot promote contact without email unless phone is already linked to an existing user profile." },
                    requestId,
                    { status: 400 }
                );
            }

            const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: contact.email.toLowerCase(),
                email_confirm: true,
                user_metadata: {
                    full_name: contact.full_name,
                },
            });
            if (createError || !created?.user?.id) {
                return withRequestId({ error: createError?.message || "Failed to create user" }, requestId, { status: 400 });
            }
            profileId = created.user.id;
        }

        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                full_name: contact.full_name,
                email: contact.email?.toLowerCase() || null,
                phone: contact.phone || null,
                phone_normalized: normalizedPhone || null,
                role: "client",
                organization_id: adminProfile.organization_id,
                lead_status: "new",
                lifecycle_stage: "lead",
                client_tag: "standard",
                phase_notifications_enabled: true,
            })
            .eq("id", profileId);

        if (updateError) {
            return withRequestId({ error: updateError.message }, requestId, { status: 400 });
        }

        await supabaseAdmin
            .from("crm_contacts")
            .update({
                converted_profile_id: profileId,
                converted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", contact.id);

        await supabaseAdmin.from("workflow_stage_events").insert({
            organization_id: adminProfile.organization_id,
            profile_id: profileId,
            from_stage: "pre_lead",
            to_stage: "lead",
            changed_by: adminProfile.id,
        });

        const durationMs = Date.now() - startedAt;
        logEvent("info", "Contact promoted to lead", {
            ...requestContext,
            contact_id: contact.id,
            profile_id: profileId,
            durationMs,
        });
        void captureOperationalMetric("api.admin.contacts.promote", {
            request_id: requestId,
            contact_id: contact.id,
            profile_id: profileId,
            duration_ms: durationMs,
        });

        return withRequestId({ ok: true, profile_id: profileId }, requestId);
    } catch (error) {
        Sentry.captureException(error);
        logError("Contact promote crashed", error, requestContext);
        return withRequestId(
            { error: error instanceof Error ? error.message : "Unknown error" },
            requestId,
            { status: 500 }
        );
    }
}
