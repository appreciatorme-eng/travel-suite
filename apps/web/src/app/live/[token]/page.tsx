"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Clock3, MapPin, Navigation, RefreshCw } from "lucide-react";
import { Map, MapControls, MapMarker, MarkerContent } from "@/components/ui/map";
import { createClient } from "@/lib/supabase/client";

interface LivePayload {
    share: {
        trip_id: string;
        day_number: number | null;
        expires_at: string | null;
    };
    trip: {
        destination: string;
        start_date: string | null;
        end_date: string | null;
        client_name: string | null;
    };
    assignment: {
        day_number: number;
        pickup_time: string | null;
        pickup_location: string | null;
        external_drivers: {
            full_name: string | null;
            phone: string | null;
            vehicle_type: string | null;
            vehicle_plate: string | null;
        } | null;
    } | null;
    location: {
        latitude: number;
        longitude: number;
        heading: number | null;
        speed: number | null;
        accuracy: number | null;
        recorded_at: string;
    } | null;
}

export default function LiveLocationPage() {
    const params = useParams();
    const token = String(params.token || "");
    const supabase = useMemo(() => createClient(), []);

    const [data, setData] = useState<LivePayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLive = useCallback(async () => {
        if (!token) return;
        try {
            setRefreshing(true);
            const response = await fetch(`/api/location/live/${token}`, { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) {
                setError(payload?.error || "Failed to load live location");
                setData(null);
                return;
            }
            setData(payload);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        void fetchLive();
    }, [fetchLive]);

    useEffect(() => {
        if (!token) return undefined;
        const timer = window.setInterval(() => {
            void fetchLive();
        }, 15000);
        return () => window.clearInterval(timer);
    }, [token, fetchLive]);

    useEffect(() => {
        const tripId = data?.share.trip_id;
        if (!tripId) return undefined;

        const channel = supabase
            .channel(`live-trip-${tripId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "driver_locations",
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    const row = payload.new as Record<string, unknown>;
                    const latitude = Number(row.latitude);
                    const longitude = Number(row.longitude);
                    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

                    setData((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            location: {
                                latitude,
                                longitude,
                                heading: row.heading == null ? null : Number(row.heading),
                                speed: row.speed == null ? null : Number(row.speed),
                                accuracy: row.accuracy == null ? null : Number(row.accuracy),
                                recorded_at: String(row.recorded_at || new Date().toISOString()),
                            },
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [data?.share.trip_id, supabase]);

    const mapCenter = useMemo<[number, number]>(() => {
        if (data?.location) return [data.location.longitude, data.location.latitude];
        return [77.209, 28.6139];
    }, [data?.location]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[#f7f3eb] flex items-center justify-center">
                <div className="text-sm text-[#6f5b3e]">Loading live location...</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-[#f7f3eb] flex items-center justify-center p-6">
                <div className="rounded-xl border border-[#eadfcd] bg-white p-6 max-w-md text-center">
                    <h1 className="text-xl font-semibold text-[#1b140a] mb-2">Live Location Unavailable</h1>
                    <p className="text-sm text-[#6f5b3e]">{error}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f7f3eb] p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="rounded-2xl border border-[#eadfcd] bg-white p-4 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-[var(--font-display)] text-[#1b140a]">
                                Live Trip Location
                            </h1>
                            <p className="text-sm text-[#6f5b3e] mt-1">
                                {data?.trip.destination || "Trip"}
                                {data?.share.day_number ? ` • Day ${data.share.day_number}` : ""}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void fetchLive()}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#eadfcd] px-3 py-2 text-sm text-[#6f5b3e] hover:bg-[#f6efe4]"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg bg-[#faf6ee] border border-[#eadfcd] p-3">
                            <p className="text-[#9c7c46]">Driver</p>
                            <p className="font-medium text-[#1b140a]">
                                {data?.assignment?.external_drivers?.full_name || "Assigned driver"}
                            </p>
                        </div>
                        <div className="rounded-lg bg-[#faf6ee] border border-[#eadfcd] p-3">
                            <p className="text-[#9c7c46]">Pickup</p>
                            <p className="font-medium text-[#1b140a]">
                                {data?.assignment?.pickup_time || "--:--"} at {data?.assignment?.pickup_location || "TBD"}
                            </p>
                        </div>
                        <div className="rounded-lg bg-[#faf6ee] border border-[#eadfcd] p-3">
                            <p className="text-[#9c7c46]">Last Update</p>
                            <p className="font-medium text-[#1b140a] inline-flex items-center gap-1">
                                <Clock3 className="h-4 w-4" />
                                {data?.location?.recorded_at
                                    ? new Date(data.location.recorded_at).toLocaleTimeString()
                                    : "Waiting for location..."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="h-[66vh] rounded-2xl overflow-hidden border border-[#eadfcd] bg-white">
                    <Map center={mapCenter} zoom={13} className="h-full w-full" theme="light">
                        <MapControls position="bottom-right" showCompass />
                        {data?.location ? (
                            <MapMarker longitude={data.location.longitude} latitude={data.location.latitude} offset={[0, -16]}>
                                <MarkerContent>
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-[#1b140a] border-2 border-[#c4a870] text-[#f5e7c6] flex items-center justify-center shadow-lg">
                                            <Navigation className="h-5 w-5" />
                                        </div>
                                        <div className="absolute -inset-2 rounded-full border border-[#c4a870] animate-ping" />
                                    </div>
                                </MarkerContent>
                            </MapMarker>
                        ) : (
                            <div className="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-2 text-sm text-[#6f5b3e] border border-[#eadfcd]">
                                <MapPin className="inline h-4 w-4 mr-1" />
                                Driver location not yet shared.
                            </div>
                        )}
                    </Map>
                </div>
            </div>
        </main>
    );
}
