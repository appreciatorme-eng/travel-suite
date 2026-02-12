import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const lifecycleStages = [
    "lead",
    "prospect",
    "proposal",
    "payment_pending",
    "payment_confirmed",
    "active",
    "review",
    "past",
] as const;

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
    try {
        const adminProfile = await getAdminProfile(req);
        if (!adminProfile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!adminProfile.organization_id) {
            return NextResponse.json({ error: "Admin organization not configured" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("workflow_notification_rules")
            .select("lifecycle_stage,notify_client")
            .eq("organization_id", adminProfile.organization_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const dbMap = new Map((data || []).map((row) => [row.lifecycle_stage, row.notify_client]));
        const rules = lifecycleStages.map((stage) => ({
            lifecycle_stage: stage,
            notify_client: dbMap.has(stage) ? Boolean(dbMap.get(stage)) : true,
        }));

        return NextResponse.json({ rules });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminProfile = await getAdminProfile(req);
        if (!adminProfile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!adminProfile.organization_id) {
            return NextResponse.json({ error: "Admin organization not configured" }, { status: 400 });
        }

        const body = await req.json();
        const lifecycleStage = String(body.lifecycle_stage || "").trim();
        const notifyClient = Boolean(body.notify_client);

        if (!lifecycleStages.includes(lifecycleStage as (typeof lifecycleStages)[number])) {
            return NextResponse.json({ error: "Invalid lifecycle_stage" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("workflow_notification_rules")
            .upsert(
                {
                    organization_id: adminProfile.organization_id,
                    lifecycle_stage: lifecycleStage,
                    notify_client: notifyClient,
                    updated_by: adminProfile.id,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "organization_id,lifecycle_stage" }
            );

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ ok: true, lifecycle_stage: lifecycleStage, notify_client: notifyClient });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
