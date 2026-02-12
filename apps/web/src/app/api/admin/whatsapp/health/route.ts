import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function minutesSince(iso?: string | null): number | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / 60000));
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

export async function GET(req: NextRequest) {
    try {
        const adminUserId = await getAdminUserId(req);
        if (!adminUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const [
            { data: driverProfiles = [] },
            { count: location1h = 0 },
            { count: location24h = 0 },
            { data: activeTrips = [] },
            { data: externalDrivers = [] },
            { data: driverLinks = [] },
        ] = await Promise.all([
            supabaseAdmin
                .from("profiles")
                .select("id,full_name,email,phone,phone_normalized")
                .eq("role", "driver"),
            supabaseAdmin
                .from("driver_locations")
                .select("*", { count: "exact", head: true })
                .gte("recorded_at", oneHourAgo),
            supabaseAdmin
                .from("driver_locations")
                .select("*", { count: "exact", head: true })
                .gte("recorded_at", dayAgo),
            supabaseAdmin
                .from("trips")
                .select("id,driver_id,status")
                .in("status", ["confirmed", "in_progress"])
                .not("driver_id", "is", null),
            supabaseAdmin
                .from("external_drivers")
                .select("id")
                .eq("is_active", true),
            supabaseAdmin
                .from("driver_accounts")
                .select("external_driver_id,is_active")
                .eq("is_active", true),
        ]);

        const driverIds = Array.from(new Set((activeTrips || []).map((trip) => trip.driver_id).filter(Boolean)));

        const latestByDriver = new Map<string, { recorded_at: string; trip_id: string | null }>();
        if (driverIds.length > 0) {
            const { data: locationData } = await supabaseAdmin
                .from("driver_locations")
                .select("driver_id,trip_id,recorded_at")
                .in("driver_id", driverIds)
                .order("recorded_at", { ascending: false })
                .limit(1000);

            const locationRows = locationData || [];

            for (const row of locationRows) {
                if (!row.driver_id) continue;
                if (!latestByDriver.has(row.driver_id)) {
                    latestByDriver.set(row.driver_id, {
                        recorded_at: row.recorded_at,
                        trip_id: row.trip_id,
                    });
                }
            }
        }

        const staleThresholdMinutes = 15;
        let staleActiveDriverTrips = 0;
        for (const trip of activeTrips || []) {
            if (!trip.driver_id) continue;
            const latest = latestByDriver.get(trip.driver_id);
            const ageMin = minutesSince(latest?.recorded_at || null);
            if (ageMin == null || ageMin > staleThresholdMinutes) {
                staleActiveDriverTrips += 1;
            }
        }

        const driverById = new Map((driverProfiles || []).map((item) => [item.id, item]));
        const latestPings = driverIds
            .map((driverId) => {
                const latest = latestByDriver.get(driverId);
                const profile = driverById.get(driverId);
                const ageMinutes = minutesSince(latest?.recorded_at || null);
                return {
                    driver_id: driverId,
                    driver_name: profile?.full_name || profile?.email || "Unknown driver",
                    trip_id: latest?.trip_id || null,
                    recorded_at: latest?.recorded_at || null,
                    age_minutes: ageMinutes,
                    status: ageMinutes != null && ageMinutes <= staleThresholdMinutes ? "fresh" : "stale",
                };
            })
            .sort((a, b) => {
                const at = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
                const bt = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
                return bt - at;
            })
            .slice(0, 8);

        const missingPhoneDrivers = (driverProfiles || [])
            .filter((driver) => !driver.phone_normalized)
            .map((driver) => ({
                id: driver.id,
                full_name: driver.full_name,
                email: driver.email,
                phone: driver.phone,
            }))
            .slice(0, 8);

        const linkedExternalIds = new Set((driverLinks || []).map((item) => item.external_driver_id));
        const unmappedExternalDrivers = (externalDrivers || []).filter(
            (driver) => !linkedExternalIds.has(driver.id)
        ).length;

        return NextResponse.json({
            ok: true,
            summary: {
                total_driver_profiles: (driverProfiles || []).length,
                drivers_with_phone: (driverProfiles || []).filter((driver) => !!driver.phone_normalized).length,
                drivers_missing_phone: (driverProfiles || []).filter((driver) => !driver.phone_normalized).length,
                active_trips_with_driver: (activeTrips || []).length,
                stale_active_driver_trips: staleActiveDriverTrips,
                location_pings_last_1h: Number(location1h || 0),
                location_pings_last_24h: Number(location24h || 0),
                unmapped_external_drivers: unmappedExternalDrivers,
            },
            latest_pings: latestPings,
            drivers_missing_phone_list: missingPhoneDrivers,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
