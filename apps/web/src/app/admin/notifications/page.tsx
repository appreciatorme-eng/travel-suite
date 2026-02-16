"use client";


import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Bell,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    RefreshCcw,
    MessageCircle,
    Activity,
    Phone,
} from "lucide-react";

interface NotificationLog {
    id: string;
    trip_id: string | null;
    recipient_id: string | null;
    recipient_phone: string | null;
    recipient_type: string | null;
    notification_type: string;
    title: string | null;
    body: string | null;
    status: string | null;
    error_message: string | null;
    sent_at: string | null;
    created_at: string | null;
    profiles: {
        full_name: string | null;
        email: string | null;
    } | null;
}

interface QueueHealth {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    upcomingHour: number;
}

interface DeliveryRow {
    id: string;
    queue_id: string | null;
    trip_id: string | null;
    channel: "whatsapp" | "push" | "email";
    status: "queued" | "processing" | "sent" | "failed" | "skipped" | "retrying";
    attempt_number: number;
    error_message: string | null;
    created_at: string;
}

interface DeliveryResponse {
    rows: DeliveryRow[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
    summary: {
        counts_by_status: Record<string, number>;
    };
}

interface WhatsAppHealthSummary {
    total_driver_profiles: number;
    drivers_with_phone: number;
    drivers_missing_phone: number;
    active_trips_with_driver: number;
    stale_active_driver_trips: number;
    location_pings_last_1h: number;
    location_pings_last_24h: number;
    unmapped_external_drivers: number;
}

interface WhatsAppHealthPing {
    driver_id: string;
    driver_name: string;
    trip_id: string | null;
    recorded_at: string | null;
    age_minutes: number | null;
    status: "fresh" | "stale";
}

interface WhatsAppHealthPayload {
    summary: WhatsAppHealthSummary;
    latest_pings: WhatsAppHealthPing[];
    drivers_missing_phone_list: Array<{
        id: string;
        full_name: string | null;
        email: string | null;
        phone?: string | null;
    }>;
}

const mockLogs: NotificationLog[] = [
    {
        id: "mock-log-1",
        trip_id: "mock-trip-001",
        recipient_id: "mock-user-1",
        recipient_phone: null,
        recipient_type: "client",
        notification_type: "itinerary_update",
        title: "Kyoto updates ready",
        body: "Your itinerary has been refreshed with cherry blossom timings.",
        status: "delivered",
        error_message: null,
        sent_at: "2026-02-10T09:22:00Z",
        created_at: "2026-02-10T09:20:00Z",
        profiles: {
            full_name: "Ava Chen",
            email: "ava.chen@example.com",
        },
    },
    {
        id: "mock-log-2",
        trip_id: "mock-trip-002",
        recipient_id: "mock-user-2",
        recipient_phone: null,
        recipient_type: "client",
        notification_type: "driver_assignment",
        title: "Driver assigned",
        body: "Your driver for day 2 has been confirmed. Pickup at 8:30 AM.",
        status: "sent",
        error_message: null,
        sent_at: "2026-02-08T18:05:00Z",
        created_at: "2026-02-08T18:05:00Z",
        profiles: {
            full_name: "Liam Walker",
            email: "liam.walker@example.com",
        },
    },
    {
        id: "mock-log-3",
        trip_id: "mock-trip-002",
        recipient_id: "mock-user-2",
        recipient_phone: null,
        recipient_type: "client",
        notification_type: "flight_update",
        title: "Flight update pending",
        body: "We are waiting on the airline confirmation for your return leg.",
        status: "pending",
        error_message: null,
        sent_at: null,
        created_at: "2026-02-08T17:40:00Z",
        profiles: {
            full_name: "Liam Walker",
            email: "liam.walker@example.com",
        },
    },
    {
        id: "mock-log-4",
        trip_id: "mock-trip-001",
        recipient_id: "mock-user-1",
        recipient_phone: null,
        recipient_type: "client",
        notification_type: "payment_reminder",
        title: "Deposit reminder",
        body: "Your deposit is due in 3 days. Tap to review the invoice.",
        status: "failed",
        error_message: "Device token expired",
        sent_at: "2026-02-06T12:11:00Z",
        created_at: "2026-02-06T12:11:00Z",
        profiles: {
            full_name: "Ava Chen",
            email: "ava.chen@example.com",
        },
    },
];

const mockWhatsAppHealth: WhatsAppHealthPayload = {
    summary: {
        total_driver_profiles: 6,
        drivers_with_phone: 5,
        drivers_missing_phone: 1,
        active_trips_with_driver: 4,
        stale_active_driver_trips: 1,
        location_pings_last_1h: 18,
        location_pings_last_24h: 163,
        unmapped_external_drivers: 2,
    },
    latest_pings: [
        {
            driver_id: "mock-driver-1",
            driver_name: "Kenji Sato",
            trip_id: "mock-trip-001",
            recorded_at: new Date().toISOString(),
            age_minutes: 1,
            status: "fresh",
        },
        {
            driver_id: "mock-driver-2",
            driver_name: "Elena Petrova",
            trip_id: "mock-trip-002",
            recorded_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
            age_minutes: 22,
            status: "stale",
        },
    ],
    drivers_missing_phone_list: [
        {
            id: "mock-driver-missing-1",
            full_name: "Driver Missing Phone",
            email: "driver.missing@example.com",
            phone: "+1 415 555 0100",
        },
    ],
};

export default function NotificationLogsPage() {
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [whatsAppMessage, setWhatsAppMessage] = useState("");
    const [queueHealth, setQueueHealth] = useState<QueueHealth>({
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        upcomingHour: 0,
    });
    const [runningQueue, setRunningQueue] = useState(false);
    const [retryingFailed, setRetryingFailed] = useState(false);
    const [cleaningShares, setCleaningShares] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [whatsAppHealth, setWhatsAppHealth] = useState<WhatsAppHealthPayload | null>(null);
    const [normalizingDriverId, setNormalizingDriverId] = useState<string | null>(null);
    const [normalizingAllDrivers, setNormalizingAllDrivers] = useState(false);
    const [deliveryRows, setDeliveryRows] = useState<DeliveryRow[]>([]);
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const [deliveryChannel, setDeliveryChannel] = useState<"all" | "whatsapp" | "push" | "email">("all");
    const [deliveryFailedOnly, setDeliveryFailedOnly] = useState(true);
    const [deliverySummary, setDeliverySummary] = useState<Record<string, number>>({});
    const [retryingQueueId, setRetryingQueueId] = useState<string | null>(null);
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            if (useMockAdmin) {
                setLogs(mockLogs);
                setQueueHealth({
                    pending: 3,
                    processing: 1,
                    sent: 24,
                    failed: 2,
                    upcomingHour: 2,
                });
                return;
            }

            const supabase = createClient();
            let query = supabase
                .from("notification_logs")
                .select(`
                    *,
                    profiles:recipient_id (
                        full_name,
                        email
                    )
                `)
                .order("created_at", { ascending: false });

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);

            const now = new Date();
            const inOneHourIso = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
            const nowIso = now.toISOString();

            const [
                { count: pendingCount = 0 },
                { count: processingCount = 0 },
                { count: sentCount = 0 },
                { count: failedCount = 0 },
                { count: upcomingHourCount = 0 },
            ] = await Promise.all([
                supabase.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
                supabase.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "processing"),
                supabase.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "sent"),
                supabase.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),
                supabase
                    .from("notification_queue")
                    .select("*", { count: "exact", head: true })
                    .eq("status", "pending")
                    .gte("scheduled_for", nowIso)
                    .lte("scheduled_for", inOneHourIso),
            ]);

            setQueueHealth({
                pending: Number(pendingCount || 0),
                processing: Number(processingCount || 0),
                sent: Number(sentCount || 0),
                failed: Number(failedCount || 0),
                upcomingHour: Number(upcomingHourCount || 0),
            });
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, useMockAdmin]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const fetchWhatsAppHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            if (useMockAdmin) {
                setWhatsAppHealth(mockWhatsAppHealth);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/whatsapp/health", {
                headers: {
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || "Failed to fetch WhatsApp health");
            }
            setWhatsAppHealth(payload);
        } catch (error) {
            console.error("Error fetching WhatsApp health:", error);
        } finally {
            setHealthLoading(false);
        }
    }, [supabase, useMockAdmin]);

    useEffect(() => {
        void fetchWhatsAppHealth();
    }, [fetchWhatsAppHealth]);

    const fetchDeliveryTracking = useCallback(async () => {
        setDeliveryLoading(true);
        try {
            if (useMockAdmin) {
                setDeliveryRows([
                    {
                        id: "mock-delivery-1",
                        queue_id: "mock-queue-1",
                        trip_id: "mock-trip-001",
                        channel: "whatsapp",
                        status: "failed",
                        attempt_number: 2,
                        error_message: "Template not approved",
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: "mock-delivery-2",
                        queue_id: "mock-queue-2",
                        trip_id: "mock-trip-002",
                        channel: "push",
                        status: "sent",
                        attempt_number: 1,
                        error_message: null,
                        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    },
                ]);
                setDeliverySummary({ sent: 12, failed: 3, skipped: 1 });
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const params = new URLSearchParams();
            params.set("limit", "40");
            if (deliveryChannel !== "all") params.set("channel", deliveryChannel);
            if (deliveryFailedOnly) params.set("failed_only", "true");

            const response = await fetch(`/api/admin/notifications/delivery?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });
            const payload = (await response.json()) as DeliveryResponse & { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Failed to fetch delivery tracking");
            }

            setDeliveryRows(payload.rows || []);
            setDeliverySummary(payload.summary?.counts_by_status || {});
        } catch (error) {
            console.error("Error fetching delivery tracking:", error);
        } finally {
            setDeliveryLoading(false);
        }
    }, [supabase, useMockAdmin, deliveryChannel, deliveryFailedOnly]);

    useEffect(() => {
        void fetchDeliveryTracking();
    }, [fetchDeliveryTracking]);

    useEffect(() => {
        if (!actionMessage && !actionError) return;
        const timer = window.setTimeout(() => {
            setActionMessage(null);
            setActionError(null);
        }, 4000);
        return () => window.clearTimeout(timer);
    }, [actionMessage, actionError]);

    const getStatusIcon = (status: string | null) => {
        switch (status) {
            case "sent":
            case "delivered":
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "failed":
                return <XCircle className="w-4 h-4 text-rose-500" />;
            case "pending":
                return <Clock className="w-4 h-4 text-amber-500" />;
            default:
                return null;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString();
    };

    const filteredLogs = logs.filter(log =>
        log.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const normalizePhone = (phone?: string | null) => (phone ? phone.replace(/\D/g, "") : "");

    const getWhatsAppLink = (phone?: string | null, message?: string | null) => {
        const cleanPhone = normalizePhone(phone);
        if (!cleanPhone) return null;
        const text = encodeURIComponent(
            message || whatsAppMessage || "Hi! We have an update for you from Travel Suite."
        );
        return `https://wa.me/${cleanPhone}?text=${text}`;
    };

    const runQueueNow = async () => {
        try {
            setRunningQueue(true);
            if (useMockAdmin) {
                setActionMessage("Mock queue run complete.");
                await fetchLogs();
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/notifications/process-queue", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });

            const payload = await response.json();
            if (!response.ok) {
                setActionError(payload?.error || "Failed to run queue");
                return;
            }

            setActionMessage(
                `Queue processed: ${payload.processed}, sent: ${payload.sent}, failed: ${payload.failed}`
            );
            await fetchLogs();
        } catch (error) {
            console.error("Run queue error:", error);
            setActionError("Failed to run queue");
        } finally {
            setRunningQueue(false);
        }
    };

    const retryFailedQueue = async () => {
        try {
            setRetryingFailed(true);
            if (useMockAdmin) {
                setActionMessage("Mock retry complete.");
                await fetchLogs();
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/notifications/retry-failed", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });
            const payload = await response.json();
            if (!response.ok) {
                setActionError(payload?.error || "Failed to retry failed queue items");
                return;
            }

            setActionMessage(`Moved ${payload.retried || 0} failed item(s) back to pending.`);
            await fetchLogs();
        } catch (error) {
            console.error("Retry failed queue error:", error);
            setActionError("Failed to retry failed queue items");
        } finally {
            setRetryingFailed(false);
        }
    };

    const cleanupExpiredShares = async () => {
        try {
            setCleaningShares(true);
            if (useMockAdmin) {
                setActionMessage("Mock cleanup complete.");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/location/cleanup-expired", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });
            const payload = await response.json();
            if (!response.ok) {
                setActionError(payload?.error || "Failed to clean expired shares");
                return;
            }
            setActionMessage(`Deactivated ${payload.cleaned || 0} expired live share link(s).`);
        } catch (error) {
            console.error("Cleanup expired shares error:", error);
            setActionError("Failed to clean expired shares");
        } finally {
            setCleaningShares(false);
        }
    };

    const normalizeDriverPhoneMappings = async (driverId?: string) => {
        try {
            setActionError(null);
            if (driverId) {
                setNormalizingDriverId(driverId);
            } else {
                setNormalizingAllDrivers(true);
            }

            if (useMockAdmin) {
                setActionMessage("Mock normalization complete.");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/whatsapp/normalize-driver-phones", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify(driverId ? { driver_id: driverId } : {}),
            });

            const payload = await response.json();
            if (!response.ok) {
                setActionError(payload?.error || "Failed to normalize driver phone mapping");
                return;
            }

            setActionMessage(
                `Phone mapping updated: ${payload.updated || 0} updated, ${payload.skipped || 0} skipped.`
            );
            await fetchWhatsAppHealth();
        } catch (error) {
            console.error("Normalize driver mapping error:", error);
            setActionError("Failed to normalize driver phone mapping");
        } finally {
            if (driverId) {
                setNormalizingDriverId(null);
            } else {
                setNormalizingAllDrivers(false);
            }
        }
    };

    const retrySingleQueueItem = async (queueId: string) => {
        try {
            setRetryingQueueId(queueId);
            if (useMockAdmin) {
                setActionMessage("Mock retry queued.");
                await fetchDeliveryTracking();
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/notifications/delivery/retry", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify({ queue_id: queueId }),
            });

            const payload = await response.json();
            if (!response.ok) {
                setActionError(payload?.error || "Failed to retry delivery");
                return;
            }

            setActionMessage("Delivery item moved back to pending queue.");
            await fetchLogs();
            await fetchDeliveryTracking();
        } catch (error) {
            console.error("Retry delivery error:", error);
            setActionError("Failed to retry delivery");
        } finally {
            setRetryingQueueId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Notifications</span>
                    <h1 className="text-3xl font-[var(--font-display)] text-[#1b140a] mt-2 flex items-center gap-3">
                        <Bell className="w-8 h-8 text-[#c4a870]" />
                        Notification History
                    </h1>
                    <p className="text-[#6f5b3e] mt-1">Monitor all sent and pending push notifications.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eadfcd] rounded-lg text-[#6f5b3e] hover:bg-[#f8f1e6] transition-colors shadow-sm"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
                <button
                    onClick={fetchWhatsAppHealth}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eadfcd] rounded-lg text-[#6f5b3e] hover:bg-[#f8f1e6] transition-colors shadow-sm"
                >
                    <Activity className={`w-4 h-4 ${healthLoading ? "animate-spin" : ""}`} />
                    Webhook Health
                </button>
                <button
                    onClick={() => void normalizeDriverPhoneMappings()}
                    disabled={normalizingAllDrivers}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eadfcd] rounded-lg text-[#6f5b3e] hover:bg-[#f8f1e6] transition-colors shadow-sm disabled:opacity-60"
                >
                    <Phone className={`w-4 h-4 ${normalizingAllDrivers ? "animate-spin" : ""}`} />
                    {normalizingAllDrivers ? "Fixing..." : "Fix All Phone Mapping"}
                </button>
                <button
                    onClick={runQueueNow}
                    disabled={runningQueue}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1b140a] text-[#f5e7c6] rounded-lg hover:bg-[#2a2217] transition-colors shadow-sm disabled:opacity-60"
                >
                    <Bell className="w-4 h-4" />
                    {runningQueue ? "Running Queue..." : "Run Queue Now"}
                </button>
                <button
                    onClick={retryFailedQueue}
                    disabled={retryingFailed}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eadfcd] rounded-lg text-[#6f5b3e] hover:bg-[#f8f1e6] transition-colors shadow-sm disabled:opacity-60"
                >
                    <RefreshCcw className={`w-4 h-4 ${retryingFailed ? 'animate-spin' : ''}`} />
                    {retryingFailed ? "Retrying Failed..." : "Retry Failed"}
                </button>
                <button
                    onClick={cleanupExpiredShares}
                    disabled={cleaningShares}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eadfcd] rounded-lg text-[#6f5b3e] hover:bg-[#f8f1e6] transition-colors shadow-sm disabled:opacity-60"
                >
                    <Clock className={`w-4 h-4 ${cleaningShares ? 'animate-spin' : ''}`} />
                    {cleaningShares ? "Cleaning..." : "Cleanup Expired Live Links"}
                </button>
            </div>

            {actionMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {actionMessage}
                </div>
            ) : null}
            {actionError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {actionError}
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs by title, message or recipient..."
                        className="w-full pl-10 pr-4 py-2 border border-[#eadfcd] rounded-lg focus:ring-2 focus:ring-[#c4a870] focus:border-transparent outline-none transition-all bg-white/90"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div>
                    <select
                        className="w-full px-4 py-2 border border-[#eadfcd] rounded-lg focus:ring-2 focus:ring-[#c4a870] outline-none appearance-none bg-white text-[#1b140a]"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="sent">Sent</option>
                        <option value="delivered">Delivered</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <input
                        type="text"
                        placeholder="Global WhatsApp message (optional)"
                        className="w-full px-4 py-2 border border-[#eadfcd] rounded-lg focus:ring-2 focus:ring-[#c4a870] focus:border-transparent outline-none transition-all bg-white/90"
                        value={whatsAppMessage}
                        onChange={(e) => setWhatsAppMessage(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-xl border border-[#eadfcd] bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9c7c46]">Pending</p>
                    <p className="text-2xl font-semibold text-[#1b140a] mt-1">{queueHealth.pending}</p>
                </div>
                <div className="rounded-xl border border-[#eadfcd] bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9c7c46]">Processing</p>
                    <p className="text-2xl font-semibold text-[#1b140a] mt-1">{queueHealth.processing}</p>
                </div>
                <div className="rounded-xl border border-[#eadfcd] bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9c7c46]">Sent</p>
                    <p className="text-2xl font-semibold text-emerald-600 mt-1">{queueHealth.sent}</p>
                </div>
                <div className="rounded-xl border border-[#eadfcd] bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9c7c46]">Failed</p>
                    <p className="text-2xl font-semibold text-rose-600 mt-1">{queueHealth.failed}</p>
                </div>
                <div className="rounded-xl border border-[#eadfcd] bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9c7c46]">Due in 1h</p>
                    <p className="text-2xl font-semibold text-[#1b140a] mt-1">{queueHealth.upcomingHour}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-5 shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <h2 className="text-lg font-[var(--font-display)] text-[#1b140a]">
                        Delivery Tracking
                    </h2>
                    <div className="flex items-center gap-2">
                        <select
                            className="px-3 py-2 border border-[#eadfcd] rounded-lg text-sm bg-white"
                            value={deliveryChannel}
                            onChange={(e) => setDeliveryChannel(e.target.value as "all" | "whatsapp" | "push" | "email")}
                        >
                            <option value="all">All channels</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="push">Push</option>
                            <option value="email">Email</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-[#6f5b3e] px-3 py-2 border border-[#eadfcd] rounded-lg bg-white">
                            <input
                                type="checkbox"
                                checked={deliveryFailedOnly}
                                onChange={(e) => setDeliveryFailedOnly(e.target.checked)}
                            />
                            Failed only
                        </label>
                        <button
                            onClick={() => void fetchDeliveryTracking()}
                            className="px-3 py-2 border border-[#eadfcd] rounded-lg bg-white text-sm text-[#6f5b3e]"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(deliverySummary).map(([key, value]) => (
                        <span key={key} className="text-xs px-2 py-1 rounded-full bg-[#f8f1e6] text-[#7a613a]">
                            {key}: {value}
                        </span>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#eadfcd] text-[#8d7650]">
                                <th className="py-2 pr-3">Channel</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2 pr-3">Attempt</th>
                                <th className="py-2 pr-3">Trip</th>
                                <th className="py-2 pr-3">Error</th>
                                <th className="py-2 pr-3">Time</th>
                                <th className="py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deliveryLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-500">Loading delivery rows...</td>
                                </tr>
                            ) : deliveryRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-500">No delivery records found.</td>
                                </tr>
                            ) : (
                                deliveryRows.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-100">
                                        <td className="py-2 pr-3 uppercase">{row.channel}</td>
                                        <td className="py-2 pr-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${row.status === "sent"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : row.status === "failed"
                                                        ? "bg-rose-50 text-rose-700"
                                                        : "bg-amber-50 text-amber-700"
                                                }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3">{row.attempt_number}</td>
                                        <td className="py-2 pr-3">{row.trip_id ? row.trip_id.slice(0, 8) : "-"}</td>
                                        <td className="py-2 pr-3 text-xs text-[#8d7650] max-w-[320px] truncate">
                                            {row.error_message || "-"}
                                        </td>
                                        <td className="py-2 pr-3">{formatDate(row.created_at)}</td>
                                        <td className="py-2">
                                            {(row.status === "failed" || row.status === "retrying") && row.queue_id ? (
                                                <button
                                                    onClick={() => void retrySingleQueueItem(row.queue_id!)}
                                                    disabled={retryingQueueId === row.queue_id}
                                                    className="text-xs px-2 py-1 rounded-md border border-[#eadfcd] bg-white text-[#6f5b3e] disabled:opacity-50"
                                                >
                                                    {retryingQueueId === row.queue_id ? "Retrying..." : "Retry"}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-5 shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#9c7c46]" />
                        WhatsApp Webhook Health
                    </h2>
                    <span className="text-xs text-[#8d7650]">
                        {healthLoading ? "Refreshing..." : "Live diagnostics"}
                    </span>
                </div>

                {!whatsAppHealth ? (
                    <p className="text-sm text-[#8d7650]">No webhook data available yet.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="rounded-lg border border-[#eadfcd] p-3">
                                <p className="text-[11px] uppercase tracking-wide text-[#9c7c46]">Pings 1h</p>
                                <p className="text-xl font-semibold text-[#1b140a]">{whatsAppHealth.summary.location_pings_last_1h}</p>
                            </div>
                            <div className="rounded-lg border border-[#eadfcd] p-3">
                                <p className="text-[11px] uppercase tracking-wide text-[#9c7c46]">Pings 24h</p>
                                <p className="text-xl font-semibold text-[#1b140a]">{whatsAppHealth.summary.location_pings_last_24h}</p>
                            </div>
                            <div className="rounded-lg border border-[#eadfcd] p-3">
                                <p className="text-[11px] uppercase tracking-wide text-[#9c7c46]">Stale Driver Trips</p>
                                <p className="text-xl font-semibold text-rose-600">{whatsAppHealth.summary.stale_active_driver_trips}</p>
                            </div>
                            <div className="rounded-lg border border-[#eadfcd] p-3">
                                <p className="text-[11px] uppercase tracking-wide text-[#9c7c46]">Unmapped Ext Drivers</p>
                                <p className="text-xl font-semibold text-amber-600">{whatsAppHealth.summary.unmapped_external_drivers}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-[#eadfcd] p-4">
                                <p className="text-sm font-semibold text-[#1b140a] mb-2">Latest Driver Pings</p>
                                {whatsAppHealth.latest_pings.length === 0 ? (
                                    <p className="text-sm text-slate-500">No active driver pings yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {whatsAppHealth.latest_pings.map((item) => (
                                            <div key={item.driver_id} className="flex items-center justify-between text-sm">
                                                <div>
                                                    <p className="font-medium text-[#1b140a]">{item.driver_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Trip {item.trip_id ? item.trip_id.slice(0, 8) : "unassigned"} • {item.recorded_at ? new Date(item.recorded_at).toLocaleTimeString() : "never"}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.status === "fresh" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                    {item.age_minutes == null ? "No ping" : `${item.age_minutes}m`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="rounded-xl border border-[#eadfcd] p-4">
                                <p className="text-sm font-semibold text-[#1b140a] mb-2">Drivers Missing Phone Mapping</p>
                                <p className="text-xs text-[#8d7650] mb-3">
                                    WhatsApp inbound location can map only if `phone_normalized` exists.
                                </p>
                                {whatsAppHealth.drivers_missing_phone_list.length === 0 ? (
                                    <p className="text-sm text-emerald-700">All driver profiles have normalized phone numbers.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {whatsAppHealth.drivers_missing_phone_list.map((driver) => (
                                            <div key={driver.id} className="text-sm rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-amber-900">{driver.full_name || "Unnamed driver"}</p>
                                                    <p className="text-xs text-amber-700">{driver.email || "No email"}</p>
                                                    <p className="text-xs text-amber-700">{driver.phone || "No phone in profile"}</p>
                                                </div>
                                                <button
                                                    onClick={() => void normalizeDriverPhoneMappings(driver.id)}
                                                    disabled={normalizingDriverId === driver.id}
                                                    className="text-xs font-semibold px-2 py-1 rounded-md bg-white border border-amber-200 text-amber-800 disabled:opacity-50"
                                                >
                                                    {normalizingDriverId === driver.id ? "Fixing..." : "Fix"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-white/90 border border-[#eadfcd] rounded-2xl shadow-[0_12px_30px_rgba(20,16,12,0.06)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f8f1e6] border-bottom border-[#eadfcd] font-medium text-[#6f5b3e] text-sm">
                                <th className="px-6 py-4">Recipient</th>
                                <th className="px-6 py-4">WhatsApp</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Content</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Sent At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-12"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-48"></div><div className="h-3 bg-slate-100 rounded w-32 mt-2"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No notification logs found.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const whatsappLink = getWhatsAppLink(log.recipient_phone, log.body || log.title);
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{log.profiles?.full_name || 'System User'}</div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{log.recipient_type}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {whatsappLink ? (
                                                    <a
                                                        href={whatsappLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                        WhatsApp
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                                    {log.notification_type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-900 font-medium truncate max-w-xs">{log.title}</div>
                                                <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{log.body}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(log.status)}
                                                    <span className={`text-sm font-medium ${log.status === 'sent' ? 'text-emerald-600' :
                                                        log.status === 'failed' ? 'text-rose-600' :
                                                            log.status === 'pending' ? 'text-amber-600' :
                                                                'text-slate-600'
                                                        }`}>
                                                        {(log.status || 'unknown').charAt(0).toUpperCase() + (log.status || 'unknown').slice(1)}
                                                    </span>
                                                </div>
                                                {log.error_message && (
                                                    <div className="text-[10px] text-rose-400 mt-1 max-w-[150px] truncate" title={log.error_message}>
                                                        {log.error_message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {formatDate(log.sent_at || log.created_at)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
