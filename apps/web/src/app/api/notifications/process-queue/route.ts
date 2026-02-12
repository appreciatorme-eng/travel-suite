import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendNotificationToUser } from "@/lib/notifications";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp.server";
import {
    renderTemplate,
    renderWhatsAppTemplate,
    type NotificationTemplateKey,
    type TemplateVars,
} from "@/lib/notification-templates";
import { captureOperationalMetric } from "@/lib/observability/metrics";
import {
    getRequestContext,
    getRequestId,
    logError,
    logEvent,
} from "@/lib/observability/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const queueSecret = process.env.NOTIFICATION_CRON_SECRET || "";
const signingSecret = process.env.NOTIFICATION_SIGNING_SECRET || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type QueueStatus = "pending" | "processing" | "sent" | "failed" | "cancelled";

interface QueueItem {
    id: string;
    user_id: string | null;
    trip_id: string | null;
    recipient_phone: string | null;
    recipient_type: "client" | "driver" | "admin" | null;
    notification_type: string;
    payload: Record<string, unknown> | null;
    attempts: number;
    status: QueueStatus;
}

const DEFAULT_MAX_ATTEMPTS = Number(process.env.NOTIFICATION_QUEUE_MAX_ATTEMPTS || "5");
const BASE_BACKOFF_MINUTES = Number(process.env.NOTIFICATION_QUEUE_BACKOFF_BASE_MINUTES || "5");
const MAX_BACKOFF_MINUTES = Number(process.env.NOTIFICATION_QUEUE_BACKOFF_MAX_MINUTES || "60");

async function resolveOrganizationIdForQueueItem(item: QueueItem): Promise<string | null> {
    if (item.trip_id) {
        const { data: trip } = await supabaseAdmin
            .from("trips")
            .select("organization_id")
            .eq("id", item.trip_id)
            .maybeSingle();
        if (trip?.organization_id) return trip.organization_id;
    }

    if (item.user_id) {
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("organization_id")
            .eq("id", item.user_id)
            .maybeSingle();
        if (profile?.organization_id) return profile.organization_id;
    }

    return null;
}

async function trackDeliveryStatus(params: {
    organizationId: string | null;
    item: QueueItem;
    channel: "whatsapp" | "push" | "email";
    provider: string;
    status: "sent" | "failed" | "skipped" | "retrying";
    attemptNumber: number;
    errorMessage?: string | null;
    providerMessageId?: string | null;
    metadata?: Record<string, unknown>;
}) {
    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("notification_delivery_status").insert({
        organization_id: params.organizationId,
        queue_id: params.item.id,
        trip_id: params.item.trip_id,
        user_id: params.item.user_id,
        recipient_phone: params.item.recipient_phone,
        recipient_type: params.item.recipient_type,
        channel: params.channel,
        provider: params.provider,
        provider_message_id: params.providerMessageId || null,
        notification_type: params.item.notification_type,
        status: params.status,
        attempt_number: params.attemptNumber,
        error_message: params.errorMessage || null,
        metadata: params.metadata || {},
        sent_at: params.status === "sent" ? nowIso : null,
        failed_at: params.status === "failed" ? nowIso : null,
    });
}

function getStringPayloadValue(payload: Record<string, unknown> | null, key: string): string {
    const value = payload?.[key];
    return typeof value === "string" ? value : "";
}

function addMinutes(date: Date, minutes: number): string {
    return new Date(date.getTime() + minutes * 60_000).toISOString();
}

function calculateNextRetryDelayMinutes(attempts: number): number {
    const safeAttempts = Math.max(1, attempts);
    const calculated = BASE_BACKOFF_MINUTES * Math.pow(2, safeAttempts - 1);
    return Math.min(calculated, MAX_BACKOFF_MINUTES);
}

async function moveToDeadLetter(params: {
    item: QueueItem;
    organizationId: string | null;
    attempts: number;
    reason: string;
    failedChannels: string[];
}) {
    await supabaseAdmin.from("notification_dead_letters").insert({
        queue_id: params.item.id,
        organization_id: params.organizationId,
        trip_id: params.item.trip_id,
        user_id: params.item.user_id,
        recipient_phone: params.item.recipient_phone,
        recipient_type: params.item.recipient_type,
        notification_type: params.item.notification_type,
        payload: params.item.payload || {},
        attempts: params.attempts,
        error_message: params.reason,
        failed_channels: params.failedChannels,
    });
}

async function isAdminBearerToken(authHeader: string | null): Promise<boolean> {
    if (!authHeader?.startsWith("Bearer ")) return false;
    const token = authHeader.substring(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return false;

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

    return profile?.role === "admin";
}

async function getAdminUserId(authHeader: string | null): Promise<string | null> {
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

function isServiceRoleBearer(authHeader: string | null): boolean {
    if (!authHeader?.startsWith("Bearer ")) return false;
    const token = authHeader.substring(7);
    return token === supabaseServiceKey;
}

function isSignedCronRequest(request: NextRequest): boolean {
    if (!signingSecret) return false;

    const ts = request.headers.get("x-cron-ts") || "";
    const signature = request.headers.get("x-cron-signature") || "";
    const tsMs = Number(ts);
    if (!ts || !signature || !Number.isFinite(tsMs)) return false;

    const now = Date.now();
    if (Math.abs(now - tsMs) > 5 * 60_000) return false;

    const payload = `${ts}:${request.method}:${request.nextUrl.pathname}`;
    const expected = createHmac("sha256", signingSecret).update(payload).digest("hex");

    const sigBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
}

async function resolveLiveLinkForQueueItem(item: QueueItem, payload: Record<string, unknown>) {
    const tripId = item.trip_id;
    if (!tripId) return null;

    const dayNumber = Number(payload.day_number || 0) || null;
    const nowIso = new Date().toISOString();

    let existingQuery = supabaseAdmin
        .from("trip_location_shares")
        .select("share_token")
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
        return existing.share_token;
    }

    const shareToken = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: inserted } = await supabaseAdmin
        .from("trip_location_shares")
        .insert({
            trip_id: tripId,
            day_number: dayNumber,
            share_token: shareToken,
            is_active: true,
            expires_at: expiresAt,
        })
        .select("share_token")
        .single();

    return inserted?.share_token || null;
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const requestId = getRequestId(request);
    const requestContext = getRequestContext(request, requestId);

    try {
        const headerSecret = request.headers.get("x-notification-cron-secret") || "";
        const authHeader = request.headers.get("authorization");

        const secretAuthorized = !!queueSecret && headerSecret === queueSecret;
        const signedAuthorized = isSignedCronRequest(request);
        const serviceRoleAuthorized = isServiceRoleBearer(authHeader);
        const adminAuthorized = await isAdminBearerToken(authHeader);
        const adminUserId = adminAuthorized ? await getAdminUserId(authHeader) : null;

        if (!secretAuthorized && !signedAuthorized && !serviceRoleAuthorized && !adminAuthorized) {
            logEvent("warn", "Notification queue run unauthorized", requestContext);
            return NextResponse.json({ error: "Unauthorized", request_id: requestId }, { status: 401 });
        }

        const { data: dueRows, error: dueError } = await supabaseAdmin
            .from("notification_queue")
            .select("id,user_id,trip_id,recipient_phone,recipient_type,notification_type,payload,attempts,status")
            .eq("status", "pending")
            .lte("scheduled_for", new Date().toISOString())
            .order("scheduled_for", { ascending: true })
            .limit(25);

        if (dueError) {
            logError("Notification queue fetch failed", dueError, requestContext);
            return NextResponse.json({ error: dueError.message, request_id: requestId }, { status: 500 });
        }

        const rows = (dueRows || []) as QueueItem[];
        let sent = 0;
        let failed = 0;

        for (const row of rows) {
            const { data: claimedRows } = await supabaseAdmin
                .from("notification_queue")
                .update({ status: "processing", last_attempt_at: new Date().toISOString() })
                .eq("id", row.id)
                .eq("status", "pending")
                .select("id");

            if (!claimedRows || claimedRows.length === 0) {
                continue;
            }

            const attempts = Number(row.attempts || 0) + 1;
            const organizationId = await resolveOrganizationIdForQueueItem(row);
            const payload = row.payload || {};
            const templateKey = getStringPayloadValue(payload, "template_key");
            const templateVars = ((payload.template_vars as TemplateVars | undefined) || {}) as TemplateVars;
            let title = getStringPayloadValue(payload, "title") || "Trip Notification";
            let body = getStringPayloadValue(payload, "body") || "You have an update for your trip.";

            if (templateKey) {
                const rendered = renderTemplate(templateKey as NotificationTemplateKey, templateVars);
                title = rendered.title;
                body = rendered.body;
            }

            if (row.notification_type === "pickup_reminder") {
                const token = await resolveLiveLinkForQueueItem(row, payload);
                if (token) {
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
                    const liveUrl = `${appUrl.replace(/\/$/, "")}/live/${token}`;
                    body = `${body}\n\nTrack live location:\n${liveUrl}`;
                    templateVars.live_link = liveUrl;
                }
            }

            let whatsappSuccess = false;
            let pushSuccess = false;
            const channelErrors: string[] = [];

            if (row.recipient_phone) {
                let waResult;
                if (templateKey) {
                    const waTemplate = renderWhatsAppTemplate(templateKey as NotificationTemplateKey, templateVars);
                    if (waTemplate) {
                        waResult = await sendWhatsAppTemplate(
                            row.recipient_phone,
                            waTemplate.name,
                            waTemplate.bodyParams,
                            waTemplate.languageCode
                        );
                    } else {
                        const message = `${title}\n\n${body}`;
                        waResult = await sendWhatsAppText(row.recipient_phone, message);
                    }
                } else {
                    const message = `${title}\n\n${body}`;
                    waResult = await sendWhatsAppText(row.recipient_phone, message);
                }
                whatsappSuccess = waResult.success;
                if (!waResult.success && waResult.error) {
                    channelErrors.push(`whatsapp: ${waResult.error}`);
                }

                await trackDeliveryStatus({
                    organizationId,
                    item: row,
                    channel: "whatsapp",
                    provider: "meta_whatsapp_cloud",
                    status: waResult.success ? "sent" : "failed",
                    attemptNumber: attempts,
                    errorMessage: waResult.success ? null : waResult.error || null,
                    metadata: {
                        template_key: templateKey || null,
                    },
                });

                await supabaseAdmin.from("notification_logs").insert({
                    trip_id: row.trip_id,
                    recipient_id: row.user_id,
                    recipient_phone: row.recipient_phone,
                    recipient_type: row.recipient_type || "client",
                    notification_type: row.notification_type || "general",
                    title,
                    body,
                    status: waResult.success ? "sent" : "failed",
                    error_message: waResult.success ? null : waResult.error,
                    sent_at: new Date().toISOString(),
                });
            } else {
                await trackDeliveryStatus({
                    organizationId,
                    item: row,
                    channel: "whatsapp",
                    provider: "meta_whatsapp_cloud",
                    status: "skipped",
                    attemptNumber: attempts,
                    errorMessage: "Recipient phone is missing",
                });
            }

            if (row.user_id) {
                const pushResult = await sendNotificationToUser({
                    userId: row.user_id,
                    title,
                    body,
                    data: {
                        type: row.notification_type || "general",
                        tripId: row.trip_id || undefined,
                        dayNumber: Number(payload.day_number || 0) || undefined,
                    },
                });
                pushSuccess = pushResult.success;
                if (!pushResult.success && pushResult.error) {
                    channelErrors.push(`push: ${pushResult.error}`);
                }

                await trackDeliveryStatus({
                    organizationId,
                    item: row,
                    channel: "push",
                    provider: "firebase_fcm",
                    status: pushResult.success ? "sent" : "failed",
                    attemptNumber: attempts,
                    errorMessage: pushResult.success ? null : pushResult.error || null,
                });
            } else {
                await trackDeliveryStatus({
                    organizationId,
                    item: row,
                    channel: "push",
                    provider: "firebase_fcm",
                    status: "skipped",
                    attemptNumber: attempts,
                    errorMessage: "Recipient user_id is missing",
                });
            }

            const isSuccess = whatsappSuccess || pushSuccess;
            if (isSuccess) {
                sent += 1;
                await supabaseAdmin
                    .from("notification_queue")
                    .update({
                        status: "sent",
                        attempts,
                        processed_at: new Date().toISOString(),
                        error_message: null,
                    })
                    .eq("id", row.id);
            } else {
                failed += 1;
                const reason = channelErrors.join(" | ") || "All channels failed";
                logEvent("warn", "Queue item delivery failed on all channels", {
                    ...requestContext,
                    queue_id: row.id,
                    trip_id: row.trip_id,
                    attempts,
                    reason,
                });

                if (attempts >= DEFAULT_MAX_ATTEMPTS) {
                    await moveToDeadLetter({
                        item: row,
                        organizationId,
                        attempts,
                        reason,
                        failedChannels: channelErrors,
                    });

                    await supabaseAdmin
                        .from("notification_queue")
                        .update({
                            status: "failed",
                            attempts,
                            processed_at: new Date().toISOString(),
                            error_message: reason,
                        })
                        .eq("id", row.id);
                } else {
                    const retryInMinutes = calculateNextRetryDelayMinutes(attempts);
                    await supabaseAdmin
                        .from("notification_queue")
                        .update({
                            status: "pending",
                            attempts,
                            scheduled_for: addMinutes(new Date(), retryInMinutes),
                            error_message: reason,
                        })
                        .eq("id", row.id);

                    await trackDeliveryStatus({
                        organizationId,
                        item: row,
                        channel: "email",
                        provider: "queue_retry_policy",
                        status: "retrying",
                        attemptNumber: attempts,
                        errorMessage: `Retry scheduled in ${retryInMinutes} minute(s): ${reason}`,
                        metadata: {
                            retry_in_minutes: retryInMinutes,
                            max_attempts: DEFAULT_MAX_ATTEMPTS,
                        },
                    });
                }
            }
        }

        if (adminUserId) {
            await supabaseAdmin.from("notification_logs").insert({
                notification_type: "manual",
                recipient_type: "admin",
                recipient_id: adminUserId,
                title: "Queue Run (Manual)",
                body: `Processed ${rows.length} queued notification(s): sent ${sent}, failed ${failed}.`,
                status: "sent",
                sent_at: new Date().toISOString(),
            });
        }

        const durationMs = Date.now() - startedAt;
        void captureOperationalMetric("api.notifications.queue.processed", {
            request_id: requestId,
            processed: rows.length,
            sent,
            failed,
            duration_ms: durationMs,
        });

        logEvent("info", "Notification queue run completed", {
            ...requestContext,
            processed: rows.length,
            sent,
            failed,
            durationMs,
        });

        const response = NextResponse.json({
            ok: true,
            request_id: requestId,
            processed: rows.length,
            sent,
            failed,
        });
        response.headers.set("x-request-id", requestId);
        return response;
    } catch (error) {
        Sentry.captureException(error);
        logError("Notification queue run crashed", error, requestContext);
        void captureOperationalMetric("api.notifications.queue.error", {
            request_id: requestId,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        return NextResponse.json(
            {
                request_id: requestId,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
