"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    Calendar,
    MapPin,
    User,
    ChevronRight,
    Search,
    Filter,
    Plus
} from "lucide-react";
import CreateTripModal from "@/components/CreateTripModal";

interface Trip {
    id: string;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
    destination: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    } | null;
    itineraries: {
        trip_title: string;
        duration_days: number;
        destination?: string | null;
    } | null;
}

const mockTrips: Trip[] = [
    {
        id: "mock-trip-001",
        status: "confirmed",
        start_date: "2026-03-12",
        end_date: "2026-03-17",
        destination: "Kyoto, Japan",
        created_at: "2026-02-01T10:00:00Z",
        profiles: {
            full_name: "Ava Chen",
            email: "ava.chen@example.com",
        },
        itineraries: {
            trip_title: "Kyoto Blossom Trail",
            duration_days: 5,
            destination: "Kyoto, Japan",
        },
    },
    {
        id: "mock-trip-002",
        status: "in_progress",
        start_date: "2026-02-20",
        end_date: "2026-02-27",
        destination: "Reykjavik, Iceland",
        created_at: "2026-01-15T14:30:00Z",
        profiles: {
            full_name: "Liam Walker",
            email: "liam.walker@example.com",
        },
        itineraries: {
            trip_title: "Northern Lights Escape",
            duration_days: 7,
            destination: "Reykjavik, Iceland",
        },
    },
];

export default function AdminTripsPage() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const supabase = createClient();
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    const fetchTrips = useCallback(async () => {
        setLoading(true); // Set loading to true when fetching starts
        if (useMockAdmin) {
            setTrips(mockTrips);
            setLoading(false);
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/admin/trips?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`, {
            headers: {
                "Authorization": `Bearer ${session?.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Error fetching trips:", error);
            setLoading(false);
            return;
        }

        const payload = await response.json();
        setTrips(payload.trips || []);
        setLoading(false);
    }, [supabase, statusFilter, searchQuery, useMockAdmin]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchTrips();
    }, [fetchTrips]);

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
                return "bg-[#f1e4d2] text-[#9c7c46]";
            case "pending":
                return "bg-[#f6efe4] text-[#6f5b3e]";
            case "draft":
                return "bg-[#f6efe4] text-[#6f5b3e]";
            case "completed":
                return "bg-[#efe2cf] text-[#7b5f31]";
            case "cancelled":
                return "bg-rose-100 text-rose-700";
            default:
                return "bg-[#f6efe4] text-[#6f5b3e]";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Trips</span>
                    <h1 className="text-3xl font-[var(--font-display)] text-[#1b140a] mt-2">Trips</h1>
                    <p className="text-[#6f5b3e] mt-1">
                        Manage client trips and assign drivers.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md shadow-sm text-[#f5e7c6] bg-[#1b140a] hover:bg-[#2a2217] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c4a870]"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Trip
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by destination, client, or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-[#eadfcd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c4a870]/20 focus:border-[#c4a870] bg-white/90"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#bda87f]" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-[#eadfcd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c4a870]/20 focus:border-[#c4a870] bg-white/90 text-[#1b140a]"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/90 p-4 rounded-xl border border-[#eadfcd]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#bda87f]">Total Trips</p>
                    <p className="text-2xl font-[var(--font-display)] text-[#1b140a]">{trips.length}</p>
                </div>
                <div className="bg-white/90 p-4 rounded-xl border border-[#eadfcd]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#bda87f]">Confirmed</p>
                    <p className="text-2xl font-[var(--font-display)] text-[#9c7c46]">
                        {trips.filter((t) => t.status === "confirmed").length}
                    </p>
                </div>
                <div className="bg-white/90 p-4 rounded-xl border border-[#eadfcd]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#bda87f]">Pending</p>
                    <p className="text-2xl font-[var(--font-display)] text-[#6f5b3e]">
                        {trips.filter((t) => t.status === "pending").length}
                    </p>
                </div>
                <div className="bg-white/90 p-4 rounded-xl border border-[#eadfcd]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#bda87f]">This Month</p>
                    <p className="text-2xl font-[var(--font-display)] text-[#1b140a]">
                        {
                            trips.filter((t) => {
                                const tripDate = new Date(t.start_date);
                                const now = new Date();
                                return (
                                    tripDate.getMonth() === now.getMonth() &&
                                    tripDate.getFullYear() === now.getFullYear()
                                );
                            }).length
                        }
                    </p>
                </div>
            </div>

            {/* Trips List */}
            <div className="bg-white/90 rounded-2xl border border-[#eadfcd] overflow-hidden shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                {trips.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-[#f6efe4] rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin className="w-8 h-8 text-[#bda87f]" />
                        </div>
                        <h3 className="text-lg font-medium text-[#1b140a]">No trips found</h3>
                        <p className="text-[#6f5b3e] mt-1 mb-6">Get started by creating a new trip for your clients.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md shadow-sm text-[#f5e7c6] bg-[#1b140a] hover:bg-[#2a2217] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c4a870]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Trip
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-[#efe2cf]">
                        {trips.map((trip) => (
                            <Link
                                key={trip.id}
                                href={`/admin/trips/${trip.id}`}
                                className="flex items-center justify-between p-4 hover:bg-[#f8f1e6] transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#f6efe4] rounded-xl flex items-center justify-center border border-[#eadfcd]">
                                        <MapPin className="h-6 w-6 text-[#9c7c46]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#1b140a]">
                                            {trip.itineraries?.trip_title || trip.destination || "Untitled Trip"}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-[#6f5b3e]">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {trip.profiles?.full_name || "Unknown"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(trip.start_date)}
                                            </span>
                                            {trip.itineraries?.duration_days && (
                                                <span>
                                                    {trip.itineraries.duration_days} days
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                            trip.status
                                        )}`}
                                    >
                                        {trip.status}
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-[#bda87f]" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <CreateTripModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={() => {
                    fetchTrips();
                }}
            />
        </div>
    );
}
