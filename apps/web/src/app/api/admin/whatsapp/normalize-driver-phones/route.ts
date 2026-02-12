import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    const normalized = phone.replace(/\D/g, "");
    return normalized || null;
}

async function getAdminUserId(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return null;

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

    return profile?.role === "admin" ? authData.user.id : null;
}

export async function POST(req: NextRequest) {
    try {
        const adminUserId = await getAdminUserId(req);
        if (!adminUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const driverId = typeof body?.driver_id === "string" ? body.driver_id : null;

        let query = supabaseAdmin
            .from("profiles")
            .select("id,full_name,email,phone,phone_normalized")
            .eq("role", "driver")
            .is("phone_normalized", null);

        if (driverId) {
            query = query.eq("id", driverId);
        }

        const { data: rows, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const candidates = (rows || []).filter((row) => !!normalizePhone(row.phone));
        let updated = 0;
        const skipped = (rows || []).length - candidates.length;

        for (const row of candidates) {
            const normalized = normalizePhone(row.phone);
            if (!normalized) continue;
            const { error: updateError } = await supabaseAdmin
                .from("profiles")
                .update({ phone_normalized: normalized })
                .eq("id", row.id);

            if (!updateError) {
                updated += 1;
            }
        }

        await supabaseAdmin.from("notification_logs").insert({
            notification_type: "manual",
            recipient_type: "admin",
            recipient_id: adminUserId,
            title: "Normalize Driver Phone Mapping",
            body: `Updated ${updated} driver phone mapping(s), skipped ${skipped}.`,
            status: "sent",
            sent_at: new Date().toISOString(),
        });

        return NextResponse.json({
            ok: true,
            scanned: rows?.length || 0,
            updated,
            skipped,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

