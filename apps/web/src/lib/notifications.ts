import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface NotificationPayload {
    userId: string;
    title: string;
    body: string;
    data?: {
        type: string;
        tripId?: string;
        dayNumber?: number;
        [key: string]: string | number | boolean | undefined;
    };
}

type NotificationDataPayload = Record<string, string>;

function toStringRecord(data?: NotificationPayload["data"]): NotificationDataPayload {
    if (!data) return {};
    return Object.entries(data).reduce<NotificationDataPayload>((acc, [key, value]) => {
        if (value === undefined) return acc;
        acc[key] = String(value);
        return acc;
    }, {});
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unknown error";
}

/**
 * Send notification to a specific user via Supabase Edge Function (FCM)
 */
export async function sendNotificationToUser(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    try {
        const dataPayload = toStringRecord(payload.data);
        // We use the Supabase Edge Function which handles FCM V1
        const { error } = await supabaseAdmin.functions.invoke("send-notification", {
            body: {
                user_id: payload.userId,
                title: payload.title,
                body: payload.body,
                data: {
                    ...dataPayload,
                    // FCM data values must be strings
                    trip_id: payload.data?.tripId || "", // Changed to snake_case for mobile consistency
                    type: payload.data?.type || "general",
                },
            },
        });

        if (error) {
            console.error("Error invoking send-notification function:", error);
            return { success: false, error: error.message };
        }

        // Log notification
        await supabaseAdmin.from("notification_logs").insert({
            trip_id: payload.data?.tripId,
            recipient_id: payload.userId,
            recipient_type: "client",
            notification_type: payload.data?.type || "general",
            title: payload.title,
            body: payload.body,
            status: "sent",
            sent_at: new Date().toISOString(),
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Error sending notification:", message);
        return { success: false, error: message };
    }
}

/**
 * Send notification to all users of a trip
 */
export async function sendNotificationToTripUsers(
    tripId: string,
    title: string,
    body: string,
    notificationType: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
    try {
        // Get trip and its user
        const { data: trip, error: tripError } = await supabaseAdmin
            .from("trips")
            .select("client_id")
            .eq("id", tripId)
            .single();

        if (tripError || !trip) {
            return { success: false, sentCount: 0, error: "Trip not found" };
        }

        // Send to trip owner
        const result = await sendNotificationToUser({
            userId: trip.client_id,
            title,
            body,
            data: {
                type: notificationType,
                tripId,
            },
        });

        return { success: result.success, sentCount: result.success ? 1 : 0, error: result.error };
    } catch (error: unknown) {
        return { success: false, sentCount: 0, error: getErrorMessage(error) };
    }
}
