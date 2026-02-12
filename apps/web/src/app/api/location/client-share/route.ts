import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function buildLiveUrl(req: NextRequest, token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    return `${appUrl.replace(/\/$/, "")}/live/${token}`;
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData?.user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const tripId = req.nextUrl.searchParams.get("tripId") || "";
        const dayNumber = Number(req.nextUrl.searchParams.get("dayNumber") || 0) || null;
        if (!tripId) {
            return NextResponse.json({ error: "tripId is required" }, { status: 400 });
        }

        const { data: trip } = await supabaseAdmin
            .from("trips")
            .select("id,client_id")
            .eq("id", tripId)
            .maybeSingle();

        if (!trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        }

        if (trip.client_id !== authData.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const nowIso = new Date().toISOString();
        let existingQuery = supabaseAdmin
            .from("trip_location_shares")
            .select("id,share_token,expires_at,is_active,day_number")
            .eq("trip_id", tripId)
            .eq("is_active", true)
            .gt("expires_at", nowIso)
            .order("created_at", { ascending: false })
            .limit(1);

        if (dayNumber) {
            existingQuery = existingQuery.eq("day_number", dayNumber);
        }

        const { data: existing } = await existingQuery.maybeSingle();
        if (existing?.share_token) {
            return NextResponse.json({
                share: {
                    ...existing,
                    live_url: buildLiveUrl(req, existing.share_token),
                },
                reused: true,
            });
        }

        const shareToken = crypto.randomUUID().replace(/-/g, "");
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from("trip_location_shares")
            .insert({
                trip_id: tripId,
                day_number: dayNumber,
                created_by: authData.user.id,
                share_token: shareToken,
                expires_at: expiresAt,
                is_active: true,
            })
            .select("id,share_token,expires_at,is_active,day_number")
            .single();

        if (insertError || !inserted) {
            return NextResponse.json(
                { error: insertError?.message || "Failed to create share" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            share: {
                ...inserted,
                live_url: buildLiveUrl(req, inserted.share_token),
            },
            reused: false,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
