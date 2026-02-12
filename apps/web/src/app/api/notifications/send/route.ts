import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotificationToUser, sendNotificationToTripUsers } from "@/lib/notifications";
import { captureOperationalMetric } from "@/lib/observability/metrics";
import {
    getRequestContext,
    getRequestId,
    logError,
    logEvent,
} from "@/lib/observability/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const requestId = getRequestId(request);
    const requestContext = getRequestContext(request, requestId);

    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            logEvent("warn", "Notification send unauthorized: missing bearer token", requestContext);
            return NextResponse.json({ error: "Unauthorized", request_id: requestId }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            logEvent("warn", "Notification send unauthorized: invalid token", {
                ...requestContext,
                auth_error: authError?.message,
            });
            return NextResponse.json({ error: "Invalid token", request_id: requestId }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            logEvent("warn", "Notification send forbidden for non-admin", {
                ...requestContext,
                user_id: user.id,
            });
            return NextResponse.json({ error: "Admin access required", request_id: requestId }, { status: 403 });
        }

        const body = await request.json();
        const { type, tripId, userId, email, title, body: messageBody, data } = body;

        if (!title || !messageBody) {
            return NextResponse.json(
                { error: "Title and body are required", request_id: requestId },
                { status: 400 }
            );
        }

        let result;

        if (tripId && !userId && !email) {
            result = await sendNotificationToTripUsers(tripId, title, messageBody, type || "manual");
        } else {
            let resolvedUserId = userId;
            if (!resolvedUserId && email) {
                const { data: targetProfile } = await supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .eq("email", String(email).trim().toLowerCase())
                    .single();
                resolvedUserId = targetProfile?.id;
            }

            if (!resolvedUserId) {
                return NextResponse.json(
                    { error: "Unable to resolve user for notification", request_id: requestId },
                    { status: 400 }
                );
            }

            result = await sendNotificationToUser({
                userId: resolvedUserId,
                title,
                body: messageBody,
                data: {
                    type: type || "manual",
                    tripId,
                    ...data,
                },
            });
        }

        const durationMs = Date.now() - startedAt;
        void captureOperationalMetric("api.notifications.send", {
            request_id: requestId,
            success: result.success,
            type: type || "manual",
            trip_id: tripId || null,
            duration_ms: durationMs,
        });

        if (result.success) {
            logEvent("info", "Notification send completed", {
                ...requestContext,
                success: true,
                trip_id: tripId || null,
                durationMs,
            });
            const response = NextResponse.json({ ...result, request_id: requestId });
            response.headers.set("x-request-id", requestId);
            return response;
        }

        logEvent("warn", "Notification send failed", {
            ...requestContext,
            success: false,
            trip_id: tripId || null,
            error: result.error,
            durationMs,
        });
        return NextResponse.json({ error: result.error, request_id: requestId }, { status: 500 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logError("Send notification endpoint crashed", error, requestContext);
        void captureOperationalMetric("api.notifications.send.error", {
            request_id: requestId,
            error: message,
        });
        return NextResponse.json({ error: message, request_id: requestId }, { status: 500 });
    }
}
