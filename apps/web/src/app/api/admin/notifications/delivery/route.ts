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
        if (!authError && authData?.user) {
            return authData.user.id;
        }
    }

    const serverClient = await createServerClient();
    const {
        data: { user },
    } = await serverClient.auth.getUser();

    return user?.id || null;
}

export async function GET(req: NextRequest) {
    try {
        const adminUserId = await getAdminUserId(req);
        if (!adminUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: adminProfile } = await supabaseAdmin
            .from("profiles")
            .select("role, organization_id")
            .eq("id", adminUserId)
            .single();

        if (!adminProfile || adminProfile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!adminProfile.organization_id) {
            return NextResponse.json({ error: "Admin organization not configured" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const status = (searchParams.get("status") || "all").trim();
        const channel = (searchParams.get("channel") || "all").trim();
        const tripId = (searchParams.get("trip_id") || "").trim();
        const failedOnly = (searchParams.get("failed_only") || "false").toLowerCase() === "true";
        const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
        const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

        let query = supabaseAdmin
            .from("notification_delivery_status")
            .select(
                "id,queue_id,trip_id,user_id,recipient_phone,recipient_type,channel,provider,provider_message_id,notification_type,status,attempt_number,error_message,metadata,sent_at,failed_at,created_at",
                { count: "exact" }
            )
            .eq("organization_id", adminProfile.organization_id);

        if (status !== "all") {
            query = query.eq("status", status);
        }

        if (channel !== "all") {
            query = query.eq("channel", channel);
        }

        if (tripId) {
            query = query.eq("trip_id", tripId);
        }

        if (failedOnly) {
            query = query.in("status", ["failed", "retrying"]);
        }

        const { data, count, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const { data: groupedRows, error: groupedError } = await supabaseAdmin
            .from("notification_delivery_status")
            .select("status")
            .eq("organization_id", adminProfile.organization_id)
            .order("created_at", { ascending: false })
            .limit(1000);

        if (groupedError) {
            return NextResponse.json({ error: groupedError.message }, { status: 400 });
        }

        const countsByStatus = (groupedRows || []).reduce<Record<string, number>>((acc, row) => {
            const key = row.status || "unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        return NextResponse.json({
            rows: data || [],
            pagination: {
                total: count || 0,
                limit,
                offset,
            },
            summary: {
                counts_by_status: countsByStatus,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
