import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface AssignmentRow {
    id: string;
    day_number: number;
    external_driver_id: string | null;
    pickup_time: string | null;
    pickup_location: string | null;
    notes: string | null;
}

interface AccommodationRow {
    id: string;
    day_number: number;
    hotel_name: string | null;
    address: string | null;
    check_in_time: string | null;
    contact_phone: string | null;
}

interface ReminderQueueRow {
    status: "pending" | "processing" | "sent" | "failed" | string;
    scheduled_for: string | null;
    payload: {
        day_number?: number | string;
    } | null;
}

interface ReminderDayStatus {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    lastScheduledFor: string | null;
}

async function requireAdmin(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (!authError && authData?.user) {
            const { data: adminProfile } = await supabaseAdmin
                .from("profiles")
                .select("role, organization_id")
                .eq("id", authData.user.id)
                .single();

            if (adminProfile?.role === "admin" && adminProfile.organization_id) {
                return { userId: authData.user.id, organizationId: adminProfile.organization_id };
            }
        }
    }

    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const { data: adminProfile } = await supabaseAdmin
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    if (!adminProfile.organization_id) {
        return { error: NextResponse.json({ error: "Admin organization not configured" }, { status: 400 }) };
    }

    return { userId: user.id, organizationId: adminProfile.organization_id };
}

export async function GET(req: NextRequest, { params }: { params?: { id?: string } }) {
    try {
        const admin = await requireAdmin(req);
        if ("error" in admin) return admin.error;

        const pathId = req.nextUrl.pathname.split("/").pop();
        const tripId = (params?.id || pathId || "").trim();

        if (!tripId || tripId === "undefined") {
            return NextResponse.json({ error: "Missing trip id" }, { status: 400 });
        }

        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
        if (!uuidRegex.test(tripId)) {
            return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
        }

        const { data: tripData, error: tripError } = await supabaseAdmin
            .from("trips")
            .select(`
                id,
                status,
                start_date,
                end_date,
                organization_id,
                profiles:client_id (
                    id,
                    full_name,
                    email,
                    phone
                ),
                itineraries (
                    id,
                    trip_title,
                    duration_days,
                    destination,
                    raw_data
                )
            `)
            .eq("id", tripId)
            .eq("organization_id", admin.organizationId)
            .single();

        if (tripError || !tripData) {
            return NextResponse.json({ error: tripError?.message || "Trip not found" }, { status: 404 });
        }

        const mappedTrip = {
            ...tripData,
            destination: tripData.itineraries?.destination || "TBD",
            itineraries: tripData.itineraries
                ? {
                    ...tripData.itineraries,
                    raw_data: {
                        days: tripData.itineraries.raw_data?.days || [],
                    },
                }
                : null,
        };

        const { data: driversData } = await supabaseAdmin
            .from("external_drivers")
            .select("*")
            .eq("is_active", true)
            .order("full_name");

        const { data: assignmentsData } = await supabaseAdmin
            .from("trip_driver_assignments")
            .select("*")
            .eq("trip_id", tripId);

        const assignmentsMap: Record<number, AssignmentRow> = {};
        ((assignmentsData || []) as AssignmentRow[]).forEach((a) => {
            assignmentsMap[a.day_number] = {
                id: a.id,
                day_number: a.day_number,
                external_driver_id: a.external_driver_id,
                pickup_time: a.pickup_time || "",
                pickup_location: a.pickup_location || "",
                notes: a.notes || "",
            };
        });

        const { data: accommodationsData } = await supabaseAdmin
            .from("trip_accommodations")
            .select("*")
            .eq("trip_id", tripId);

        const accommodationsMap: Record<number, AccommodationRow> = {};
        ((accommodationsData || []) as AccommodationRow[]).forEach((a) => {
            accommodationsMap[a.day_number] = {
                id: a.id,
                day_number: a.day_number,
                hotel_name: a.hotel_name || "",
                address: a.address || "",
                check_in_time: a.check_in_time || "15:00",
                contact_phone: a.contact_phone || "",
            };
        });

        const { data: reminderRows } = await supabaseAdmin
            .from("notification_queue")
            .select("id,status,scheduled_for,payload,recipient_type")
            .eq("trip_id", tripId)
            .eq("notification_type", "pickup_reminder")
            .order("scheduled_for", { ascending: false });

        const reminderStatusByDay: Record<number, ReminderDayStatus> = {};

        ((reminderRows || []) as ReminderQueueRow[]).forEach((row) => {
            const dayNumber = Number(row?.payload?.day_number || 0);
            if (!dayNumber) return;
            if (!reminderStatusByDay[dayNumber]) {
                reminderStatusByDay[dayNumber] = {
                    pending: 0,
                    processing: 0,
                    sent: 0,
                    failed: 0,
                    lastScheduledFor: null,
                };
            }

            if (row.status === "pending") reminderStatusByDay[dayNumber].pending += 1;
            if (row.status === "processing") reminderStatusByDay[dayNumber].processing += 1;
            if (row.status === "sent") reminderStatusByDay[dayNumber].sent += 1;
            if (row.status === "failed") reminderStatusByDay[dayNumber].failed += 1;

            if (
                row.scheduled_for &&
                (!reminderStatusByDay[dayNumber].lastScheduledFor ||
                    row.scheduled_for > reminderStatusByDay[dayNumber].lastScheduledFor)
            ) {
                reminderStatusByDay[dayNumber].lastScheduledFor = row.scheduled_for;
            }
        });

        const { data: latestLocation } = await supabaseAdmin
            .from("driver_locations")
            .select("latitude,longitude,recorded_at,speed,heading,accuracy")
            .eq("trip_id", tripId)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        return NextResponse.json({
            trip: mappedTrip,
            drivers: driversData || [],
            assignments: assignmentsMap,
            accommodations: accommodationsMap,
            reminderStatusByDay,
            latestDriverLocation: latestLocation || null,
        });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
