import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData?.user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", authData.user.id)
            .maybeSingle();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from("notification_queue")
            .update({
                status: "pending",
                scheduled_for: new Date().toISOString(),
                error_message: null,
            })
            .eq("status", "failed")
            .select("id");

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await supabaseAdmin.from("notification_logs").insert({
            notification_type: "manual",
            recipient_type: "admin",
            recipient_id: authData.user.id,
            title: "Queue Retry Failed",
            body: `Moved ${data?.length || 0} failed queue item(s) back to pending.`,
            status: "sent",
            sent_at: new Date().toISOString(),
        });

        return NextResponse.json({
            ok: true,
            retried: data?.length || 0,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
