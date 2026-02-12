import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function getAdminUserId(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (!authError && authData?.user) return authData.user.id;
    }

    const serverClient = await createServerClient();
    const {
        data: { user },
    } = await serverClient.auth.getUser();
    return user?.id || null;
}

async function resolveQueueOrg(queueId: string): Promise<string | null> {
    const { data: queueRow } = await supabaseAdmin
        .from("notification_queue")
        .select("trip_id,user_id")
        .eq("id", queueId)
        .maybeSingle();

    if (!queueRow) return null;

    if (queueRow.trip_id) {
        const { data: trip } = await supabaseAdmin
            .from("trips")
            .select("organization_id")
            .eq("id", queueRow.trip_id)
            .maybeSingle();
        if (trip?.organization_id) return trip.organization_id;
    }

    if (queueRow.user_id) {
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("organization_id")
            .eq("id", queueRow.user_id)
            .maybeSingle();
        if (profile?.organization_id) return profile.organization_id;
    }

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const adminUserId = await getAdminUserId(req);
        if (!adminUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: adminProfile } = await supabaseAdmin
            .from("profiles")
            .select("role,organization_id")
            .eq("id", adminUserId)
            .single();

        if (!adminProfile || adminProfile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!adminProfile.organization_id) {
            return NextResponse.json({ error: "Admin organization not configured" }, { status: 400 });
        }

        const body = await req.json();
        const queueId = String(body.queue_id || "").trim();
        if (!queueId) {
            return NextResponse.json({ error: "queue_id is required" }, { status: 400 });
        }

        const queueOrg = await resolveQueueOrg(queueId);
        if (!queueOrg || queueOrg !== adminProfile.organization_id) {
            return NextResponse.json({ error: "Queue item not found in your organization" }, { status: 404 });
        }

        const { data: updatedRows, error } = await supabaseAdmin
            .from("notification_queue")
            .update({
                status: "pending",
                scheduled_for: new Date().toISOString(),
                error_message: null,
                last_attempt_at: null,
                processed_at: null,
            })
            .eq("id", queueId)
            .in("status", ["failed", "retrying"])
            .select("id");

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!updatedRows || updatedRows.length === 0) {
            return NextResponse.json({ error: "Queue item is not retryable" }, { status: 400 });
        }

        return NextResponse.json({ ok: true, queue_id: queueId });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
