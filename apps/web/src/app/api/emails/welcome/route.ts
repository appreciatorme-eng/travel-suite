import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

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
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("full_name, email, welcome_email_sent_at")
            .eq("id", user.id)
            .single();

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        if (profile?.welcome_email_sent_at) {
            return NextResponse.json({ success: true, status: "already_sent" });
        }

        const toEmail = profile?.email || user.email;
        if (!toEmail) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        const result = await sendWelcomeEmail({
            toEmail,
            fullName: profile?.full_name || (user.user_metadata?.full_name as string | undefined),
        });

        if (result.success) {
            await supabaseAdmin
                .from("profiles")
                .update({ welcome_email_sent_at: new Date().toISOString() })
                .eq("id", user.id);
        }

        return NextResponse.json({ success: result.success, skipped: result.skipped, reason: result.reason });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Welcome email error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
