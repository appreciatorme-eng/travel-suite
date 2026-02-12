import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotificationToUser } from "@/lib/notifications";
import { getDriverWhatsAppLink, formatDriverAssignmentMessage } from "@/lib/notifications.shared";
import type { Activity, Day, ItineraryResult } from "@/types/itinerary";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        // Verify user authorization
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const body = await request.json();
        const { tripId } = body;

        if (!tripId) {
            return NextResponse.json({ error: "tripId is required" }, { status: 400 });
        }

        // Get trip details (scoped to the authenticated client)
        const { data: trip, error: tripError } = await supabaseAdmin
            .from("trips")
            .select(`
                id,
                client_id,
                start_date,
                end_date,
                itineraries (
                    id,
                    trip_title,
                    destination,
                    duration_days,
                    raw_data
                ),
                profiles!trips_client_id_fkey(full_name, email)
            `)
            .eq("id", tripId)
            .eq("client_id", user.id)
            .single();

        if (tripError || !trip) {
            return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        }

        const itinerary = Array.isArray(trip.itineraries) ? trip.itineraries[0] : trip.itineraries;
        const destination = itinerary?.destination || "your destination";

        // Calculate current day of trip
        const startDate = trip.start_date ? new Date(trip.start_date) : null;
        const today = new Date();
        const dayNumber = startDate
            ? Math.max(Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1)
            : 1;

        // Get today's driver assignment
        const { data: assignmentRaw } = await supabaseAdmin
            .from("trip_driver_assignments")
            .select(`
                *,
                external_drivers(*)
            `)
            .eq("trip_id", tripId)
            .eq("day_number", dayNumber)
            .single();

        const assignment = assignmentRaw ? {
            ...assignmentRaw,
            external_drivers: Array.isArray(assignmentRaw.external_drivers)
                ? assignmentRaw.external_drivers[0]
                : assignmentRaw.external_drivers
        } : null;

        // Get today's activities from the itinerary raw_data
        const tripData = itinerary?.raw_data as ItineraryResult | undefined;
        const dayData =
            tripData?.days?.find((day: Day) => day.day_number === dayNumber) ??
            tripData?.days?.[dayNumber - 1];
        const activities: Activity[] = Array.isArray(dayData?.activities) ? dayData.activities : [];

        // Get today's accommodation
        const { data: accommodation } = await supabaseAdmin
            .from("trip_accommodations")
            .select("*")
            .eq("trip_id", tripId)
            .eq("day_number", dayNumber)
            .single();

        // Send confirmation to client
        let driverInfo = "";
        if (assignment?.external_drivers) {
            const driver = assignment.external_drivers;
            driverInfo = `\n\nYour driver ${driver.full_name} has been notified. Call: ${driver.phone}`;
        }

        await sendNotificationToUser({
            userId: user.id,
            title: "Welcome! You've landed",
            body: `Your trip to ${destination} begins now!${driverInfo}`,
            data: {
                type: "client_landed",
                tripId,
                dayNumber,
            },
        });

        // Generate WhatsApp link for driver (admin can use this)
        let driverWhatsAppLink = null;
        if (assignment?.external_drivers && activities) {
            const driver = assignment.external_drivers;
            const clientName = (Array.isArray(trip.profiles) ? trip.profiles[0] : trip.profiles)?.full_name || "Client";

            const message = formatDriverAssignmentMessage({
                clientName,
                pickupTime: assignment.pickup_time || "TBD",
                pickupLocation: assignment.pickup_location || destination,
                activities: activities.map((activity) => ({
                    title: activity.title,
                    duration: activity.duration,
                })),
                hotelName: accommodation?.hotel_name || "TBD",
            });

            driverWhatsAppLink = getDriverWhatsAppLink(driver.phone, message);
        }

        // Log the landing event
        await supabaseAdmin.from("notification_logs").insert({
            trip_id: tripId,
            recipient_id: user.id,
            notification_type: "client_landed",
            title: "Client Landed",
            body: `${(Array.isArray(trip.profiles) ? trip.profiles[0] : trip.profiles)?.full_name || "Client"} has landed for trip to ${destination}`,
            status: "sent",
            recipient_type: "client",
        });

        return NextResponse.json({
            success: true,
            message: "Landing notification sent",
            driverWhatsAppLink,
            dayNumber,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Client landed error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
