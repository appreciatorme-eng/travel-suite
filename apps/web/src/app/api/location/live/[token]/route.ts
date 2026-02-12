import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const SHARE_RATE_LIMIT_WINDOW_MS = 60_000;
const SHARE_RATE_LIMIT_MAX_REQUESTS = 40;

function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || "unknown";
    }
    return req.headers.get("x-real-ip") || "unknown";
}

export async function GET(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const { token } = params;
        if (!/^[a-f0-9]{32}$/i.test(token)) {
            return NextResponse.json({ error: "Invalid share token format" }, { status: 400 });
        }

        const ipHash = sha256(getClientIp(req));
        const tokenHash = sha256(token);
        const windowStartIso = new Date(Date.now() - SHARE_RATE_LIMIT_WINDOW_MS).toISOString();

        const { count: recentCount } = await supabaseAdmin
            .from("trip_location_share_access_logs")
            .select("*", { count: "exact", head: true })
            .eq("share_token_hash", tokenHash)
            .eq("ip_hash", ipHash)
            .gte("created_at", windowStartIso);

        if ((recentCount || 0) >= SHARE_RATE_LIMIT_MAX_REQUESTS) {
            return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
        }

        void supabaseAdmin.from("trip_location_share_access_logs").insert({
            share_token_hash: tokenHash,
            ip_hash: ipHash,
        });

        const { data: share, error: shareError } = await supabaseAdmin
            .from("trip_location_shares")
            .select(`
                id,
                trip_id,
                day_number,
                expires_at,
                is_active,
                trips (
                    id,
                    destination,
                    start_date,
                    end_date,
                    profiles:client_id (
                        full_name
                    )
                )
            `)
            .eq("share_token", token)
            .eq("is_active", true)
            .single();

        if (shareError || !share) {
            return NextResponse.json({ error: "Invalid share token" }, { status: 404 });
        }

        if (share.expires_at && new Date(share.expires_at) < new Date()) {
            return NextResponse.json({ error: "Share link expired" }, { status: 410 });
        }

        const { data: latestLocation } = await supabaseAdmin
            .from("driver_locations")
            .select("latitude,longitude,heading,speed,accuracy,recorded_at,driver_id")
            .eq("trip_id", share.trip_id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        const assignmentQuery = supabaseAdmin
            .from("trip_driver_assignments")
            .select(`
                day_number,
                pickup_time,
                pickup_location,
                external_drivers (
                    full_name,
                    phone,
                    vehicle_type,
                    vehicle_plate
                )
            `)
            .eq("trip_id", share.trip_id)
            .order("day_number", { ascending: true })
            .limit(1);

        const { data: assignment } = share.day_number
            ? await assignmentQuery.eq("day_number", share.day_number).maybeSingle()
            : await assignmentQuery.maybeSingle();

        return NextResponse.json({
            share: {
                trip_id: share.trip_id,
                day_number: share.day_number,
                expires_at: share.expires_at,
            },
            trip: {
                destination: share.trips?.destination || "Trip",
                start_date: share.trips?.start_date,
                end_date: share.trips?.end_date,
                client_name: share.trips?.profiles?.full_name || null,
            },
            assignment: assignment || null,
            location: latestLocation || null,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
