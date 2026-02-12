import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function inRange(value: number, min: number, max: number) {
    return Number.isFinite(value) && value >= min && value <= max;
}

export async function POST(req: NextRequest) {
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

        const body = await req.json();
        const tripId = String(body.tripId || "").trim();
        const latitude = Number(body.latitude);
        const longitude = Number(body.longitude);
        const heading = body.heading != null ? Number(body.heading) : null;
        const speed = body.speed != null ? Number(body.speed) : null;
        const accuracy = body.accuracy != null ? Number(body.accuracy) : null;
        const explicitDriverId = body.driverId ? String(body.driverId) : null;

        if (!tripId) {
            return NextResponse.json({ error: "tripId is required" }, { status: 400 });
        }
        if (!inRange(latitude, -90, 90) || !inRange(longitude, -180, 180)) {
            return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
        }

        const userId = authData.user.id;
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

        const { data: trip } = await supabaseAdmin
            .from("trips")
            .select("id,driver_id")
            .eq("id", tripId)
            .maybeSingle();

        if (!trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        }

        const isAdmin = profile?.role === "admin";
        const resolvedDriverId = isAdmin && explicitDriverId ? explicitDriverId : userId;

        const isPrimaryTripDriver = trip.driver_id === userId;
        const { data: assignmentRows } = await supabaseAdmin
            .from("trip_driver_assignments")
            .select("external_driver_id")
            .eq("trip_id", tripId);

        const assignmentDriverIds = (assignmentRows || [])
            .map((row: { external_driver_id: string | null }) => row.external_driver_id)
            .filter((id: string | null): id is string => !!id);

        let hasMappedExternalDriverAssignment = false;
        if (assignmentDriverIds.length > 0) {
            const { data: driverAccount } = await supabaseAdmin
                .from("driver_accounts")
                .select("id")
                .eq("profile_id", userId)
                .eq("is_active", true)
                .in("external_driver_id", assignmentDriverIds)
                .maybeSingle();
            hasMappedExternalDriverAssignment = !!driverAccount;
        }

        const isAssignedDriver = isPrimaryTripDriver || hasMappedExternalDriverAssignment;

        if (!isAdmin && !isAssignedDriver) {
            return NextResponse.json({ error: "Driver access required" }, { status: 403 });
        }

        // Basic write throttling to reduce noisy high-frequency pings.
        const { data: latestPing } = await supabaseAdmin
            .from("driver_locations")
            .select("recorded_at")
            .eq("trip_id", tripId)
            .eq("driver_id", resolvedDriverId)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestPing?.recorded_at) {
            const sinceMs = Date.now() - new Date(latestPing.recorded_at).getTime();
            if (sinceMs < 5000) {
                return NextResponse.json({ ok: true, throttled: true });
            }
        }

        const { error: insertError } = await supabaseAdmin
            .from("driver_locations")
            .insert({
                trip_id: tripId,
                driver_id: resolvedDriverId,
                latitude,
                longitude,
                heading,
                speed,
                accuracy,
                recorded_at: new Date().toISOString(),
            });

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
