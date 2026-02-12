"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Car, Users, MapPin, Bell, TrendingUp, Calendar, Activity } from "lucide-react";

interface DashboardStats {
    totalDrivers: number;
    totalClients: number;
    activeTrips: number;
    pendingNotifications: number;
}

interface ActivityItem {
    id: string;
    type: "trip" | "notification";
    title: string;
    description: string;
    timestamp: string;
    status: string;
}

interface RecentTrip {
    id: string;
    status: string | null;
    created_at: string;
    itineraries: {
        trip_title: string | null;
        destination: string | null;
    } | null;
}

interface RecentNotification {
    id: string;
    title: string | null;
    body: string | null;
    sent_at: string | null;
    status: string | null;
}

type HealthStatus = "healthy" | "degraded" | "down" | "unconfigured";

interface HealthResponse {
    status: HealthStatus;
    checked_at: string;
    duration_ms: number;
    checks: {
        database: { status: HealthStatus };
        supabase_edge_functions: { status: HealthStatus };
        firebase_fcm: { status: HealthStatus };
        whatsapp_api: { status: HealthStatus };
        external_apis: { status: HealthStatus };
        notification_pipeline: { status: HealthStatus };
    };
}

const mockStats: DashboardStats = {
    totalDrivers: 12,
    totalClients: 48,
    activeTrips: 7,
    pendingNotifications: 3,
};

const mockActivities: ActivityItem[] = [
    {
        id: "mock-activity-1",
        type: "trip",
        title: "New Trip Created",
        description: "Kyoto Blossom Trail to Kyoto, Japan",
        timestamp: "2026-02-10T10:20:00Z",
        status: "confirmed",
    },
    {
        id: "mock-activity-2",
        type: "notification",
        title: "Driver Assigned",
        description: "Kenji Sato confirmed for day 1 pickup.",
        timestamp: "2026-02-10T09:45:00Z",
        status: "sent",
    },
    {
        id: "mock-activity-3",
        type: "trip",
        title: "Trip Status Updated",
        description: "Northern Lights Escape now in progress.",
        timestamp: "2026-02-09T18:12:00Z",
        status: "in_progress",
    },
];

export default function AdminDashboard() {
    const supabase = createClient();
    const [stats, setStats] = useState<DashboardStats>({
        totalDrivers: 0,
        totalClients: 0,
        activeTrips: 0,
        pendingNotifications: 0,
    });
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (useMockAdmin) {
                    setStats(mockStats);
                    setActivities(mockActivities);
                    return;
                }

                // Get driver count
                const { count: driverCount } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true })
                    .eq("role", "driver");

                // Get client count
                const { count: clientCount } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true })
                    .eq("role", "client");

                // Get active trips count
                const { count: tripCount } = await supabase
                    .from("trips")
                    .select("*", { count: "exact", head: true })
                    .in("status", ["confirmed", "in_progress"]);

                // Get notifications
                const { count: notificationCount } = await supabase
                    .from("notification_logs")
                    .select("*", { count: "exact", head: true });

                setStats({
                    totalDrivers: driverCount || 0,
                    totalClients: clientCount || 0,
                    activeTrips: tripCount || 0,
                    pendingNotifications: notificationCount || 0,
                });

                // Fetch recent activity
                const { data: recentTrips } = await supabase
                    .from("trips")
                    .select("id, status, created_at, itineraries(trip_title, destination)")
                    .order("created_at", { ascending: false })
                    .limit(5);

                const { data: recentNotifications } = await supabase
                    .from("notification_logs")
                    .select("id, title, body, sent_at, status")
                    .order("sent_at", { ascending: false })
                    .limit(5);

                const formattedActivities: ActivityItem[] = [
                    ...(recentTrips as RecentTrip[] | null || []).map((trip) => ({
                        id: trip.id,
                        type: "trip" as const,
                        title: "New Trip Created",
                        description: `${trip.itineraries?.trip_title || "Untitled Trip"} to ${trip.itineraries?.destination || "Unknown"}`,
                        timestamp: trip.created_at,
                        status: trip.status || "pending",
                    })),
                    ...(recentNotifications as RecentNotification[] | null || []).map((notif) => ({
                        id: notif.id,
                        type: "notification" as const,
                        title: notif.title || "Notification",
                        description: notif.body || "",
                        timestamp: notif.sent_at || new Date().toISOString(),
                        status: notif.status || "sent",
                    })),
                ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 8);

                setActivities(formattedActivities);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [supabase, useMockAdmin]);

    useEffect(() => {
        let mounted = true;

        const fetchHealth = async () => {
            try {
                if (!mounted) return;
                setHealthLoading(true);
                const res = await fetch("/api/health", { cache: "no-store" });
                const data = (await res.json()) as HealthResponse;
                if (mounted) setHealth(data);
            } catch {
                if (mounted) {
                    setHealth({
                        status: "down",
                        checked_at: new Date().toISOString(),
                        duration_ms: 0,
                        checks: {
                            database: { status: "down" },
                            supabase_edge_functions: { status: "down" },
                            firebase_fcm: { status: "down" },
                            whatsapp_api: { status: "down" },
                            external_apis: { status: "down" },
                            notification_pipeline: { status: "down" },
                        },
                    });
                }
            } finally {
                if (mounted) setHealthLoading(false);
            }
        };

        fetchHealth();
        const intervalId = setInterval(fetchHealth, 60_000);
        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const statusClass: Record<HealthStatus, string> = {
        healthy: "bg-emerald-100 text-emerald-700",
        degraded: "bg-amber-100 text-amber-700",
        down: "bg-rose-100 text-rose-700",
        unconfigured: "bg-slate-100 text-slate-600",
    };

    const statCards = [
        {
            label: "Active Drivers",
            value: stats.totalDrivers,
            icon: Car,
            accent: "text-[#c4a870]",
        },
        {
            label: "Total Clients",
            value: stats.totalClients,
            icon: Users,
            accent: "text-[#b8904d]",
        },
        {
            label: "Active Trips",
            value: stats.activeTrips,
            icon: MapPin,
            accent: "text-[#d1b27a]",
        },
        {
            label: "Pending Notifications",
            value: stats.pendingNotifications,
            icon: Bell,
            accent: "text-[#9c7c46]",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Overview</span>
                    <h1 className="text-3xl font-[var(--font-display)] text-[#1b140a] mt-2">Dashboard</h1>
                    <p className="text-[#6f5b3e] mt-1">
                        Curated operational signals for your travel concierge team.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm text-[#8c7754]">
                    <Calendar className="w-4 h-4" />
                    {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6 shadow-[0_10px_30px_rgba(20,16,12,0.08)]"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-[#bda87f] mb-2">{stat.label}</p>
                                <p className="text-3xl font-[var(--font-display)] text-[#1b140a]">
                                    {loading ? "-" : stat.value}
                                </p>
                            </div>
                            <div
                                className="w-12 h-12 rounded-2xl bg-[#f6efe4] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(196,168,112,0.2)]"
                            >
                                <stat.icon className={`w-6 h-6 ${stat.accent}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6 shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-4">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/admin/drivers"
                        className="group flex items-center gap-3 p-4 rounded-xl bg-[#f8f1e6] hover:bg-[#f1e4d2] transition-colors"
                    >
                        <div className="w-10 h-10 bg-[#1b140a] rounded-xl flex items-center justify-center">
                            <Car className="w-5 h-5 text-[#f5e7c6]" />
                        </div>
                        <div>
                            <p className="font-semibold text-[#1b140a]">Add New Driver</p>
                            <p className="text-sm text-[#6f5b3e]">Register a partner driver</p>
                        </div>
                    </Link>
                    <Link
                        href="/admin/trips"
                        className="group flex items-center gap-3 p-4 rounded-xl bg-[#f8f1e6] hover:bg-[#f1e4d2] transition-colors"
                    >
                        <div className="w-10 h-10 bg-[#1b140a] rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#f5e7c6]" />
                        </div>
                        <div>
                            <p className="font-semibold text-[#1b140a]">Manage Trips</p>
                            <p className="text-sm text-[#6f5b3e]">Assign drivers to trips</p>
                        </div>
                    </Link>
                    <Link
                        href="/admin/notifications"
                        className="group flex items-center gap-3 p-4 rounded-xl bg-[#f8f1e6] hover:bg-[#f1e4d2] transition-colors"
                    >
                        <div className="w-10 h-10 bg-[#1b140a] rounded-xl flex items-center justify-center">
                            <Bell className="w-5 h-5 text-[#f5e7c6]" />
                        </div>
                        <div>
                            <p className="font-semibold text-[#1b140a]">Send Notifications</p>
                            <p className="text-sm text-[#6f5b3e]">Notify clients & drivers</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* System Health */}
            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6 shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-[var(--font-display)] text-[#1b140a]">System Health</h2>
                    <Activity className="w-5 h-5 text-[#bda87f]" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${health ? statusClass[health.status] : "bg-slate-100 text-slate-600"}`}>
                        {healthLoading ? "checking" : (health?.status ?? "unknown")}
                    </span>
                    <span className="text-xs text-[#8c7754]">
                        {health?.checked_at ? `Last check ${new Date(health.checked_at).toLocaleTimeString()}` : ""}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    {[
                        { label: "Database", value: health?.checks.database.status },
                        { label: "Edge Functions", value: health?.checks.supabase_edge_functions.status },
                        { label: "Firebase FCM", value: health?.checks.firebase_fcm.status },
                        { label: "WhatsApp API", value: health?.checks.whatsapp_api.status },
                        { label: "Weather/Currency", value: health?.checks.external_apis.status },
                        { label: "Notify Pipeline", value: health?.checks.notification_pipeline.status },
                    ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-[#eadfcd] bg-[#fffdf8] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[#9d8862] mb-2">{item.label}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${item.value ? statusClass[item.value] : "bg-slate-100 text-slate-600"}`}>
                                {healthLoading ? "checking" : (item.value ?? "unknown")}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6 shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-[var(--font-display)] text-[#1b140a]">
                        Recent Activity
                    </h2>
                    <TrendingUp className="w-5 h-5 text-[#bda87f]" />
                </div>

                {loading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : activities.length > 0 ? (
                    <div className="space-y-6">
                        {activities.map((activity, idx) => (
                            <div key={activity.id} className="relative flex items-start gap-4">
                                {idx !== activities.length - 1 && (
                                    <div className="absolute left-[1.125rem] top-8 bottom-[-1.5rem] w-px bg-gray-100" />
                                )}
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${activity.type === "trip" ? "bg-[#f8f1e6]" : "bg-[#f1e4d2]"
                                    }`}>
                                    {activity.type === "trip" ? (
                                        <MapPin className="w-4 h-4 text-[#9c7c46]" />
                                    ) : (
                                        <Bell className="w-4 h-4 text-[#9c7c46]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#1b140a] truncate">
                                            {activity.title}
                                        </p>
                                        <time className="text-xs text-[#bda87f] shrink-0">
                                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </time>
                                    </div>
                                    <p className="text-sm text-[#6f5b3e] mt-0.5 truncate">
                                        {activity.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${activity.status === "sent" || activity.status === "confirmed" || activity.status === "in_progress"
                                                ? "bg-[#f1e4d2] text-[#9c7c46]"
                                                : "bg-[#f6efe4] text-[#6f5b3e]"
                                            }`}>
                                            {activity.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-[#6f5b3e]">
                        <div className="w-16 h-16 bg-[#f6efe4] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-[#bda87f]" />
                        </div>
                        <p>No recent activity found.</p>
                        <p className="text-sm">Activity feed will appear here as the system is used.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
