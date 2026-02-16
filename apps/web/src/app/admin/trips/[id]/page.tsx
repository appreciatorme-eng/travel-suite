"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    User,
    Car,
    Hotel,
    Clock,
    Phone,
    MessageCircle,
    Link2,
    Save,
    Bell,
    Plus,
    Trash,
} from "lucide-react";
import ItineraryMap from "@/components/map/ItineraryMap";
import { getDriverWhatsAppLink, formatDriverAssignmentMessage, formatClientWhatsAppMessage } from "@/lib/notifications.shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface Driver {
    id: string;
    full_name: string;
    phone: string | null;
    vehicle_type: string | null;
    vehicle_plate: string | null;
    photo_url?: string | null;
}

interface DriverAssignment {
    id?: string;
    day_number: number;
    external_driver_id: string | null;
    pickup_time: string;
    pickup_location: string;
    notes: string;
}

interface Accommodation {
    id?: string;
    day_number: number;
    hotel_name: string;
    address: string;
    check_in_time: string;
    contact_phone: string;
}

interface Activity {
    title: string;
    start_time?: string;
    end_time?: string;
    duration_minutes: number;
    location?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    description?: string;
}

interface Day {
    day_number: number;
    theme: string;
    activities: Activity[];
}

interface HotelSuggestion {
    name: string;
    address: string;
    phone?: string;
    lat: number;
    lng: number;
    distanceKm: number;
}

function isValidTime(value?: string) {
    return !!value && /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string) {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(totalMinutes: number) {
    const clamped = Math.max(0, Math.min(totalMinutes, (24 * 60) - 30));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function roundToNearestThirty(totalMinutes: number) {
    return Math.round(totalMinutes / 30) * 30;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return earthRadiusKm * c;
}

function estimateTravelMinutes(previous?: Activity, current?: Activity) {
    if (!previous || !current) return 0;
    if (previous.location && current.location && previous.location.trim() === current.location.trim()) {
        return 0;
    }

    if (previous.coordinates && current.coordinates) {
        const distanceKm = haversineKm(previous.coordinates, current.coordinates);
        const averageCitySpeedKmh = 28;
        const driveMinutes = (distanceKm / averageCitySpeedKmh) * 60;
        const buffered = Math.round(driveMinutes + 10); // buffer for parking/transfers
        return Math.max(10, Math.min(buffered, 180));
    }

    // Fallback when coordinates are not available yet
    return 20;
}

function inferExploreDurationMinutes(activity: Activity) {
    const text = `${activity.title || ""} ${activity.location || ""}`.toLowerCase();
    if (!text.trim()) return 90;

    if (/(flight|airport|transfer|pickup|drop)/.test(text)) return 45;
    if (/(walk|market|bazaar|street)/.test(text)) return 120;
    if (/(museum|fort|palace|temple|tomb|mosque|cathedral|monument|heritage)/.test(text)) return 90;
    if (/(meal|lunch|dinner|breakfast|food|restaurant|cafe|tea)/.test(text)) return 60;
    if (/(sunset|sunrise|golden hour|viewpoint|photo)/.test(text)) return 60;
    if (/(shopping)/.test(text)) return 90;

    return 75;
}

function enrichDayDurations(day: Day) {
    return {
        ...day,
        activities: day.activities.map((activity) => ({
            ...activity,
            // Keep explicitly customized values, but replace legacy/default 60-minute placeholders.
            duration_minutes: (() => {
                const duration = Number(activity.duration_minutes) || 0;
                if (duration > 0 && duration !== 60) return duration;
                return inferExploreDurationMinutes(activity);
            })(),
        })),
    };
}

function optimizeActivitiesForRoute(activities: Activity[]) {
    if (activities.length <= 2) return activities;

    const anchor = activities[0];
    const remaining = activities.slice(1);
    const withCoordinates = remaining.filter((activity) => !!activity.coordinates);
    const withoutCoordinates = remaining.filter((activity) => !activity.coordinates);

    if (withCoordinates.length <= 1) {
        return activities;
    }

    const orderedByRoute: Activity[] = [];
    const unvisited = [...withCoordinates];

    let currentPoint = anchor.coordinates ?? unvisited[0]?.coordinates;
    if (!currentPoint) return activities;

    while (unvisited.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < unvisited.length; i++) {
            const candidate = unvisited[i];
            if (!candidate.coordinates) continue;
            const distance = haversineKm(currentPoint, candidate.coordinates);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }

        const [next] = unvisited.splice(nearestIndex, 1);
        orderedByRoute.push(next);
        if (next.coordinates) {
            currentPoint = next.coordinates;
        }
    }

    const routeDistanceKm = (route: Activity[]) => {
        if (route.length <= 1) return 0;

        let total = 0;
        if (anchor.coordinates && route[0]?.coordinates) {
            total += haversineKm(anchor.coordinates, route[0].coordinates);
        }

        for (let i = 1; i < route.length; i++) {
            const prev = route[i - 1].coordinates;
            const current = route[i].coordinates;
            if (prev && current) {
                total += haversineKm(prev, current);
            }
        }

        return total;
    };

    // 2-opt improvement pass for a better shortest-path approximation.
    const improvedRoute = [...orderedByRoute];
    if (improvedRoute.length >= 4) {
        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < improvedRoute.length - 2; i++) {
                for (let k = i + 1; k < improvedRoute.length - 1; k++) {
                    const candidate = [
                        ...improvedRoute.slice(0, i),
                        ...improvedRoute.slice(i, k + 1).reverse(),
                        ...improvedRoute.slice(k + 1),
                    ];
                    if (routeDistanceKm(candidate) + 0.001 < routeDistanceKm(improvedRoute)) {
                        improvedRoute.splice(0, improvedRoute.length, ...candidate);
                        improved = true;
                    }
                }
            }
        }
    }

    return [anchor, ...improvedRoute, ...withoutCoordinates];
}

function buildDaySchedule(day: Day) {
    const optimizedActivities = optimizeActivitiesForRoute(day.activities);
    const firstStart = isValidTime(optimizedActivities[0]?.start_time) ? optimizedActivities[0]!.start_time! : "09:00";
    const dayEnd = (24 * 60) - 30;
    let cursor = Math.max(0, Math.min(roundToNearestThirty(timeToMinutes(firstStart)), dayEnd));

    const activities = optimizedActivities.map((activity, index) => {
        const travelMinutes = index > 0 ? estimateTravelMinutes(optimizedActivities[index - 1], activity) : 0;
        const proposedStart = index === 0
            ? (isValidTime(activity.start_time) ? timeToMinutes(activity.start_time!) : cursor)
            : cursor + travelMinutes;
        const roundedStart = roundToNearestThirty(proposedStart);
        const startMinutes = Math.max(cursor, Math.min(roundedStart, dayEnd));
        const suggestedDuration = inferExploreDurationMinutes(activity);
        const duration = Math.max(30, Number(activity.duration_minutes) || suggestedDuration);
        let endMinutes = roundToNearestThirty(startMinutes + duration);
        if (endMinutes <= startMinutes) {
            endMinutes = startMinutes + 30;
        }
        endMinutes = Math.min(endMinutes, dayEnd);
        cursor = endMinutes;

        return {
            ...activity,
            start_time: minutesToTime(startMinutes),
            end_time: minutesToTime(endMinutes),
            duration_minutes: duration,
        };
    });

    return {
        ...day,
        activities,
    };
}

interface Trip {
    id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    destination: string;
    profiles: {
        id: string;
        full_name: string;
        email: string;
        phone?: string | null;
    } | null;
    itineraries: {
        id: string;
        trip_title: string;
        duration_days: number;
        destination?: string | null;
        raw_data: {
            days: Day[];
        };
    } | null;
}

interface ReminderDayStatus {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    lastScheduledFor: string | null;
}

interface DriverLocationSnapshot {
    latitude: number;
    longitude: number;
    recorded_at: string;
    speed?: number | null;
    heading?: number | null;
    accuracy?: number | null;
}

interface TripDetailApiPayload {
    trip: Trip;
    drivers?: Driver[];
    assignments?: Record<number, DriverAssignment>;
    accommodations?: Record<number, Accommodation>;
    reminderStatusByDay?: Record<number, ReminderDayStatus>;
    busyDriversByDay?: Record<number, string[]>;
    latestDriverLocation?: DriverLocationSnapshot | null;
}

type ErrorPayload = {
    error?: string;
};

interface OverpassElement {
    tags?: Record<string, string | undefined>;
    lat?: number | string;
    lon?: number | string;
    center?: {
        lat?: number | string;
        lon?: number | string;
    };
}

interface OverpassResponse {
    elements?: OverpassElement[];
}

const mockTripsById: Record<string, Trip> = {
    "mock-trip-001": {
        id: "mock-trip-001",
        status: "confirmed",
        start_date: "2026-03-12",
        end_date: "2026-03-17",
        destination: "Kyoto, Japan",
        profiles: {
            id: "mock-user-1",
            full_name: "Ava Chen",
            email: "ava.chen@example.com",
        },
        itineraries: {
            id: "mock-itinerary-1",
            trip_title: "Kyoto Blossom Trail",
            duration_days: 5,
            destination: "Kyoto, Japan",
            raw_data: {
                days: [
                    { day_number: 1, theme: "Arrival & Gion", activities: [] },
                    { day_number: 2, theme: "Arashiyama & Bamboo", activities: [] },
                    { day_number: 3, theme: "Fushimi Inari", activities: [] },
                    { day_number: 4, theme: "Tea Ceremony", activities: [] },
                    { day_number: 5, theme: "Departure", activities: [] },
                ],
            },
        },
    },
    "mock-trip-002": {
        id: "mock-trip-002",
        status: "in_progress",
        start_date: "2026-02-20",
        end_date: "2026-02-27",
        destination: "Reykjavik, Iceland",
        profiles: {
            id: "mock-user-2",
            full_name: "Liam Walker",
            email: "liam.walker@example.com",
        },
        itineraries: {
            id: "mock-itinerary-2",
            trip_title: "Northern Lights Escape",
            duration_days: 7,
            destination: "Reykjavik, Iceland",
            raw_data: {
                days: [
                    { day_number: 1, theme: "Blue Lagoon", activities: [] },
                    { day_number: 2, theme: "Golden Circle", activities: [] },
                    { day_number: 3, theme: "Aurora Chase", activities: [] },
                    { day_number: 4, theme: "Ice Caves", activities: [] },
                    { day_number: 5, theme: "City Exploration", activities: [] },
                    { day_number: 6, theme: "Whale Watching", activities: [] },
                    { day_number: 7, theme: "Departure", activities: [] },
                ],
            },
        },
    },
};

const mockDriversList: Driver[] = [
    {
        id: "mock-driver-1",
        full_name: "Kenji Sato",
        phone: "+81 90 1234 5678",
        vehicle_type: "sedan",
        vehicle_plate: "KY-1204",
    },
    {
        id: "mock-driver-2",
        full_name: "Elena Petrova",
        phone: "+354 770 5566",
        vehicle_type: "suv",
        vehicle_plate: "ICE-447",
    },
];

const mockAssignments: Record<number, DriverAssignment> = {
    1: {
        day_number: 1,
        external_driver_id: "mock-driver-1",
        pickup_time: "08:30",
        pickup_location: "Kyoto Station",
        notes: "Meet at north exit.",
    },
};

const mockAccommodations: Record<number, Accommodation> = {
    1: {
        day_number: 1,
        hotel_name: "Hoshinoya Kyoto",
        address: "Arashiyama, Kyoto",
        check_in_time: "15:00",
        contact_phone: "+81 75 871 0001",
    },
};

const mockNotificationLog = [
    {
        id: "mock-log-1",
        title: "Driver assigned",
        body: "Kenji Sato confirmed for day 1 pickup.",
        status: "delivered",
        sent_at: "2026-02-10T09:45:00Z",
    },
    {
        id: "mock-log-2",
        title: "Itinerary update",
        body: "Added tea ceremony timing and local guide details.",
        status: "sent",
        sent_at: "2026-02-09T16:30:00Z",
    },
];

export default function TripDetailPage() {
    const params = useParams();
    const tripId = params.id as string;

    const [trip, setTrip] = useState<Trip | null>(null);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [assignments, setAssignments] = useState<Record<number, DriverAssignment>>({});
    const [accommodations, setAccommodations] = useState<Record<number, Accommodation>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeDay, setActiveDay] = useState(1);
    const [itineraryDays, setItineraryDays] = useState<Day[]>([]);
    const [hotelSuggestions, setHotelSuggestions] = useState<Record<number, HotelSuggestion[]>>({});
    const [hotelLoadingByDay, setHotelLoadingByDay] = useState<Record<number, boolean>>({});
    const [liveLocationUrl, setLiveLocationUrl] = useState<string>("");
    const [creatingLiveLink, setCreatingLiveLink] = useState(false);
    const [reminderStatusByDay, setReminderStatusByDay] = useState<Record<number, ReminderDayStatus>>({});
    const [busyDriversByDay, setBusyDriversByDay] = useState<Record<number, string[]>>({});
    const [latestDriverLocation, setLatestDriverLocation] = useState<DriverLocationSnapshot | null>(null);

    // Notification state
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState("Trip Update");
    const [notificationBody, setNotificationBody] = useState("");
    const [notificationEmail, setNotificationEmail] = useState("");
    const [useEmailTarget, setUseEmailTarget] = useState(false);
    const geocodeCacheRef = useRef(new Map<string, { lat: number; lng: number }>());
    const hotelSearchDebounceRef = useRef<Record<number, number | null>>({});
    const timeOptions = useMemo(
        () => Array.from({ length: 48 }, (_, i) => {
            const minutes = i * 30;
            return minutesToTime(minutes);
        }),
        []
    );

    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    const fetchData = useCallback(async () => {
        if (!tripId) return;
        if (useMockAdmin) {
            const mockTrip = mockTripsById[tripId] ?? mockTripsById["mock-trip-001"];
            setTrip(mockTrip);
            setItineraryDays((mockTrip.itineraries?.raw_data?.days ?? []).map(enrichDayDurations).map(buildDaySchedule));
            setDrivers(mockDriversList);
            setAssignments(mockAssignments);
            setAccommodations(mockAccommodations);
            setLoading(false);
            return;
        }

        const supabase = createClient();
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            await supabase.auth.refreshSession();
            ({ data: { session } } = await supabase.auth.getSession());
        }
        const headers: Record<string, string> = {};
        if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/admin/trips/${tripId}`, {
            headers,
        });

        if (!response.ok) {
            let error: ErrorPayload = {};
            try {
                error = (await response.json()) as ErrorPayload;
            } catch {
                error = { error: `HTTP ${response.status}` };
            }
            console.error("Error fetching trip:", error);
            setLoading(false);
            return;
        }

        const payload = (await response.json()) as TripDetailApiPayload;
        const mappedTrip = payload.trip as Trip;
        setTrip(mappedTrip);
        setItineraryDays((mappedTrip.itineraries?.raw_data?.days || []).map(enrichDayDurations).map(buildDaySchedule));
        setDrivers(payload.drivers || []);
        setAssignments(payload.assignments || {});
        setAccommodations(payload.accommodations || {});
        setReminderStatusByDay(payload.reminderStatusByDay || {});
        setBusyDriversByDay(payload.busyDriversByDay || {});
        setLatestDriverLocation(payload.latestDriverLocation || null);

        setLoading(false);
    }, [tripId, useMockAdmin]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useEffect(() => {
        const loadExistingShare = async () => {
            if (!tripId || useMockAdmin) return;
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch(`/api/location/share?tripId=${tripId}&dayNumber=${activeDay}`, {
                    headers: {
                        Authorization: `Bearer ${session?.access_token || ""}`,
                    },
                });

                if (!response.ok) return;
                const payload = await response.json();
                setLiveLocationUrl(payload?.share?.live_url || "");
            } catch {
                // non-blocking
            }
        };

        void loadExistingShare();
    }, [activeDay, tripId, useMockAdmin]);

    useEffect(() => {
        const timers = hotelSearchDebounceRef.current;
        return () => {
            Object.values(timers).forEach((timerId) => {
                if (timerId) window.clearTimeout(timerId);
            });
        };
    }, []);

    useEffect(() => {
        const activeDayData = itineraryDays.find((d) => d.day_number === activeDay);
        if (!activeDayData) return;

        activeDayData.activities.forEach((activity, index) => {
            if (activity.location && !activity.coordinates) {
                void (async () => {
                    const coords = await geocodeLocation(activity.location || "", trip?.destination);
                    if (coords) {
                        updateActivityCoordinates(activeDay, index, coords);
                    }
                })();
            }
        });
    }, [activeDay, itineraryDays, trip?.destination]);

    const updateAssignment = (dayNumber: number, field: keyof DriverAssignment, value: string) => {
        setAssignments((prev) => ({
            ...prev,
            [dayNumber]: {
                ...prev[dayNumber],
                day_number: dayNumber,
                [field]: value,
            },
        }));
    };

    const updateAccommodation = (dayNumber: number, field: keyof Accommodation, value: string) => {
        setAccommodations((prev) => ({
            ...prev,
            [dayNumber]: {
                ...prev[dayNumber],
                day_number: dayNumber,
                [field]: value,
            },
        }));
    };

    const updateDayTheme = (dayNumber: number, newTheme: string) => {
        setItineraryDays((prev) =>
            prev.map((day) =>
                day.day_number === dayNumber ? { ...day, theme: newTheme } : day
            )
        );
    };

    const updateActivity = (
        dayNumber: number,
        activityIndex: number,
        field: keyof Activity,
        value: string | number
    ) => {
        setItineraryDays((prev) =>
            prev.map((day) => {
                if (day.day_number === dayNumber) {
                    const newActivities = [...day.activities];
                    newActivities[activityIndex] = {
                        ...newActivities[activityIndex],
                        [field]: value,
                    };
                    return buildDaySchedule({ ...day, activities: newActivities });
                }
                return day;
            })
        );
    };

    const updateActivityCoordinates = (
        dayNumber: number,
        activityIndex: number,
        coordinates: { lat: number; lng: number } | undefined
    ) => {
        setItineraryDays((prev) =>
            prev.map((day) => {
                if (day.day_number === dayNumber) {
                    const newActivities = [...day.activities];
                    newActivities[activityIndex] = {
                        ...newActivities[activityIndex],
                        coordinates,
                    };
                    return buildDaySchedule({ ...day, activities: newActivities });
                }
                return day;
            })
        );
    };

    const geocodeLocation = async (location: string, destinationHint?: string) => {
        const query = [location, destinationHint].filter(Boolean).join(", ");
        if (!query.trim()) return undefined;

        const cached = geocodeCacheRef.current.get(query);
        if (cached) return cached;

        try {
            const url = new URL("https://nominatim.openstreetmap.org/search");
            url.searchParams.set("format", "json");
            url.searchParams.set("limit", "1");
            url.searchParams.set("q", query);

            const response = await fetch(url.toString(), {
                headers: {
                    "Accept": "application/json",
                },
            });
            if (!response.ok) return undefined;
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) return undefined;

            const lat = Number(data[0].lat);
            const lng = Number(data[0].lon);
            if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined;

            const coords = { lat, lng };
            geocodeCacheRef.current.set(query, coords);
            return coords;
        } catch (error) {
            console.error("Geocode error:", error);
            return undefined;
        }
    };

    const handleLocationBlur = async (dayNumber: number, activityIndex: number, location?: string) => {
        const cleanLocation = (location || "").trim();
        if (!cleanLocation) {
            updateActivityCoordinates(dayNumber, activityIndex, undefined);
            return;
        }
        const coords = await geocodeLocation(cleanLocation, trip?.destination);
        if (coords) {
            updateActivityCoordinates(dayNumber, activityIndex, coords);
        }
    };

    const fillAccommodationFromSuggestion = (dayNumber: number, suggestion: HotelSuggestion) => {
        updateAccommodation(dayNumber, "hotel_name", suggestion.name);
        updateAccommodation(dayNumber, "address", suggestion.address);
        if (suggestion.phone) {
            updateAccommodation(dayNumber, "contact_phone", suggestion.phone);
        }
    };

    const fetchNearbyHotels = async (dayNumber: number, searchTerm?: string) => {
        const day = itineraryDays.find((d) => d.day_number === dayNumber);
        if (!day) return;

        const cleanSearchTerm = (searchTerm || "").trim().toLowerCase();

        let center: { lat: number; lng: number } | undefined =
            day.activities.find((a) => a.coordinates)?.coordinates;

        if (!center) {
            const firstLocation = day.activities.find((a) => a.location?.trim())?.location;
            if (firstLocation) {
                center = await geocodeLocation(firstLocation, trip?.destination);
            }
        }

        if (!center && trip?.destination) {
            center = await geocodeLocation(trip.destination);
        }

        if (!center) return;

        setHotelLoadingByDay((prev) => ({ ...prev, [dayNumber]: true }));
        try {
            const overpassQuery = `
[out:json][timeout:25];
(
  node["tourism"="hotel"](around:9000,${center.lat},${center.lng});
  way["tourism"="hotel"](around:9000,${center.lat},${center.lng});
  node["tourism"="guest_house"](around:9000,${center.lat},${center.lng});
  way["tourism"="guest_house"](around:9000,${center.lat},${center.lng});
);
out center tags 80;
                `.trim();

            const response = await fetch("https://overpass-api.de/api/interpreter", {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=UTF-8" },
                body: overpassQuery,
            });

            if (!response.ok) return;
            const payload = (await response.json()) as OverpassResponse;
            const elements = Array.isArray(payload?.elements) ? payload.elements : [];

            const suggestions: HotelSuggestion[] = elements
                .map((element) => {
                    const tags = element.tags || {};
                    const name = String(tags.name || "").trim();
                    if (!name) return null;

                    const lat = Number(element.lat ?? element.center?.lat);
                    const lng = Number(element.lon ?? element.center?.lon);
                    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

                    const addressParts = [
                        tags["addr:housenumber"],
                        tags["addr:street"],
                        tags["addr:suburb"],
                        tags["addr:city"],
                    ].filter(Boolean);
                    const address =
                        String(tags["addr:full"] || "").trim() ||
                        (addressParts.length ? addressParts.join(", ") : "Address not available");

                    return {
                        name,
                        address,
                        phone: String(tags.phone || tags["contact:phone"] || "").trim() || undefined,
                        lat,
                        lng,
                        distanceKm: haversineKm(center!, { lat, lng }),
                    } as HotelSuggestion;
                })
                .filter((item: HotelSuggestion | null): item is HotelSuggestion => !!item)
                .filter((item) =>
                    cleanSearchTerm ? item.name.toLowerCase().includes(cleanSearchTerm) : true
                )
                .sort((a, b) => a.distanceKm - b.distanceKm)
                .slice(0, 8);

            setHotelSuggestions((prev) => ({ ...prev, [dayNumber]: suggestions }));

            if (!searchTerm && suggestions[0]) {
                fillAccommodationFromSuggestion(dayNumber, suggestions[0]);
            }
        } catch (error) {
            console.error("Hotel lookup error:", error);
        } finally {
            setHotelLoadingByDay((prev) => ({ ...prev, [dayNumber]: false }));
        }
    };

    const addActivity = (dayNumber: number) => {
        setItineraryDays((prev) =>
            prev.map((day) => {
                if (day.day_number === dayNumber) {
                    return buildDaySchedule({
                        ...day,
                        activities: [
                            ...day.activities,
                            { title: "New Activity", start_time: "", duration_minutes: 90, location: "" },
                        ],
                    });
                }
                return day;
            })
        );
    };

    const removeActivity = (dayNumber: number, activityIndex: number) => {
        setItineraryDays((prev) =>
            prev.map((day) => {
                if (day.day_number === dayNumber) {
                    const newActivities = day.activities.filter(
                        (_, index) => index !== activityIndex
                    );
                    return buildDaySchedule({ ...day, activities: newActivities });
                }
                return day;
            })
        );
    };

    const saveChanges = async () => {
        setSaving(true);

        try {
            // Save driver assignments
            for (const [dayNumber, assignment] of Object.entries(assignments)) {
                if (assignment.external_driver_id) {
                    const data = {
                        trip_id: tripId,
                        day_number: parseInt(dayNumber),
                        external_driver_id: assignment.external_driver_id,
                        pickup_time: assignment.pickup_time || null,
                        pickup_location: assignment.pickup_location || null,
                        notes: assignment.notes || null,
                    };

                    if (assignment.id) {
                        await supabase
                            .from("trip_driver_assignments")
                            .update(data)
                            .eq("id", assignment.id);
                    } else {
                        await supabase.from("trip_driver_assignments").insert(data);
                    }
                }
            }

            // Save accommodations
            for (const [dayNumber, accommodation] of Object.entries(accommodations)) {
                if (accommodation.hotel_name) {
                    const data = {
                        trip_id: tripId,
                        day_number: parseInt(dayNumber),
                        hotel_name: accommodation.hotel_name,
                        address: accommodation.address || null,
                        check_in_time: accommodation.check_in_time || "15:00",
                        contact_phone: accommodation.contact_phone || null,
                    };

                    if (accommodation.id) {
                        await supabase
                            .from("trip_accommodations")
                            .update(data)
                            .eq("id", accommodation.id);
                    } else {
                        await supabase.from("trip_accommodations").insert(data);
                    }
                }
            }

            // Save itinerary updates
            if (trip?.itineraries?.id) {
                await supabase
                    .from("itineraries")
                    .update({
                        raw_data: { days: itineraryDays } as any,
                    })
                    .eq("id", trip.itineraries.id);
            }

            // Refresh data
            await fetchData();
            alert("Changes saved successfully!");
        } catch (error) {
            console.error("Error saving:", error);
            alert("Error saving changes");
        }

        setSaving(false);
    };

    const sendNotificationToClient = async () => {
        if (!trip?.profiles?.id && !notificationEmail.trim()) return;

        try {
            if (useMockAdmin) {
                alert("Mock notification sent to client!");
                setNotificationOpen(false);
                setNotificationBody("");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const payload: Record<string, unknown> = {
                tripId,
                type: "itinerary_update",
                title: notificationTitle,
                body: notificationBody || `Your trip to ${trip?.destination || "Unknown Destination"} has been updated with new details.`,
            };

            if (useEmailTarget) {
                payload.email = notificationEmail.trim();
            } else {
                payload.userId = trip?.profiles?.id;
            }

            const response = await fetch("/api/notifications/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert("Notification sent to client!");
                setNotificationOpen(false);
                setNotificationBody("");
                setNotificationEmail("");
                setUseEmailTarget(false);
            } else {
                const error = await response.json();
                alert(`Failed to send notification: ${error.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error sending notification:", error);
            alert("Error sending notification");
        }
    };

    const createLiveLocationShare = async () => {
        if (!tripId) return;
        if (useMockAdmin) {
            const mockUrl = `http://localhost:3000/live/mock-${tripId}-d${activeDay}`;
            setLiveLocationUrl(mockUrl);
            alert(`Mock live location link created:\n${mockUrl}`);
            return;
        }

        setCreatingLiveLink(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/location/share", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify({
                    tripId,
                    dayNumber: activeDay,
                    expiresHours: 48,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                alert(payload?.error || "Failed to create live location link");
                return;
            }

            const url = payload?.share?.live_url || "";
            setLiveLocationUrl(url);
            if (url) {
                await navigator.clipboard.writeText(url);
                alert("Live location link created and copied to clipboard.");
            }
        } catch (error) {
            console.error("Live location share error:", error);
            alert("Failed to create live location share");
        } finally {
            setCreatingLiveLink(false);
        }
    };

    const revokeLiveLocationShare = async () => {
        if (!tripId || !liveLocationUrl) return;
        if (useMockAdmin) {
            setLiveLocationUrl("");
            alert("Mock live link revoked");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(
                `/api/location/share?tripId=${tripId}&dayNumber=${activeDay}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${session?.access_token || ""}`,
                    },
                }
            );

            const payload = await response.json();
            if (!response.ok) {
                alert(payload?.error || "Failed to revoke live link");
                return;
            }
            setLiveLocationUrl("");
            alert(`Revoked ${payload.revoked || 0} active live link(s)`);
        } catch (error) {
            console.error("Revoke live link error:", error);
            alert("Failed to revoke live link");
        }
    };

    const getWhatsAppLinkForDay = (dayNumber: number) => {
        const assignment = assignments[dayNumber];
        if (!assignment?.external_driver_id) return null;

        const driver = drivers.find((d) => d.id === assignment.external_driver_id);
        if (!driver || !driver.phone) return null;

        const day = trip?.itineraries?.raw_data?.days?.find((d) => d.day_number === dayNumber);
        const accommodation = accommodations[dayNumber];

        const baseMessage = formatDriverAssignmentMessage({
            clientName: trip?.profiles?.full_name || "Client",
            pickupTime: assignment.pickup_time || "TBD",
            pickupLocation: assignment.pickup_location || trip?.destination || "TBD",
            activities: day?.activities || [],
            hotelName: accommodation?.hotel_name || "TBD",
        });

        const liveLinkSuffix =
            liveLocationUrl && dayNumber === activeDay
                ? `\n\nLive location link:\n${liveLocationUrl}`
                : "";

        const message = `${baseMessage}${liveLinkSuffix}`;

        return getDriverWhatsAppLink(driver.phone, message);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const clientWhatsAppLink = trip?.profiles?.phone
        ? getDriverWhatsAppLink(
            trip.profiles.phone,
            formatClientWhatsAppMessage({
                clientName: trip.profiles?.full_name || "there",
                tripTitle: trip.itineraries?.trip_title,
                destination: trip.destination,
                startDate: trip.start_date ? formatDate(trip.start_date) : "",
                body: notificationBody || "",
            })
        )
        : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Trip not found</p>
            </div>
        );
    }

    const days = trip.itineraries?.raw_data?.days || [];
    const durationDays = trip.itineraries?.duration_days || days.length || 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/trips"
                        className="p-2 hover:bg-[#f6efe4] rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-[#6f5b3e]" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-[var(--font-display)] text-[#1b140a]">
                            {trip.itineraries?.trip_title || trip.destination}
                        </h1>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[#6f5b3e]">
                            <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {trip.profiles?.full_name}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(trip.start_date || "")}
                            </span>
                            <span>{durationDays} days</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={createLiveLocationShare}
                        disabled={creatingLiveLink}
                        className="flex items-center gap-2 px-4 py-2 border border-[#eadfcd] rounded-lg hover:bg-[#f6efe4] transition-colors text-[#6f5b3e] disabled:opacity-60"
                    >
                        <Link2 className="h-4 w-4" />
                        {creatingLiveLink ? "Creating..." : "Live Link"}
                    </button>
                    <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="flex items-center gap-2 px-4 py-2 border border-[#eadfcd] rounded-lg hover:bg-[#f6efe4] transition-colors text-[#6f5b3e]"
                            >
                                <Bell className="h-4 w-4" />
                                Notify Client
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Send Notification</DialogTitle>
                                <DialogDescription>
                                    Send a push notification to the client regarding this trip. You can target by email to ensure it matches the mobile login.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={useEmailTarget}
                                        onChange={(e) => {
                                            setUseEmailTarget(e.target.checked);
                                            if (e.target.checked && !notificationEmail) {
                                                setNotificationEmail(trip.profiles?.email || "");
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Send by email instead of user ID
                                </label>
                                {useEmailTarget && (
                                    <div className="grid gap-2">
                                        <label htmlFor="email" className="text-sm font-medium leading-none">Client Email</label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={notificationEmail}
                                            onChange={(e) => setNotificationEmail(e.target.value)}
                                            placeholder={trip.profiles?.email || "client@example.com"}
                                        />
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Title</label>
                                    <Input
                                        id="title"
                                        value={notificationTitle}
                                        onChange={(e) => setNotificationTitle(e.target.value)}
                                        placeholder="Notification Title"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label htmlFor="body" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message</label>
                                    <textarea
                                        id="body"
                                        value={notificationBody}
                                        onChange={(e) => setNotificationBody(e.target.value)}
                                        placeholder={`Your trip to ${trip.destination} has been updated...`}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={sendNotificationToClient}>Send Notification</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    {clientWhatsAppLink ? (
                        <a
                            href={clientWhatsAppLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 border border-[#eadfcd] text-[#1b140a] rounded-lg hover:bg-[#f6efe4] transition-colors"
                        >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp Client
                        </a>
                    ) : (
                        <button
                            disabled
                            className="flex items-center gap-2 px-4 py-2 border border-[#eadfcd] text-[#cbb68e] rounded-lg cursor-not-allowed"
                            title="Client phone not available"
                        >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp Client
                        </button>
                    )}
                    {liveLocationUrl ? (
                        <>
                            <a
                                href={liveLocationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 border border-[#eadfcd] text-[#1b140a] rounded-lg hover:bg-[#f6efe4] transition-colors"
                                title="Open live location page"
                            >
                                <MapPin className="h-4 w-4" />
                                Open Live
                            </a>
                            <button
                                onClick={revokeLiveLocationShare}
                                className="flex items-center gap-2 px-4 py-2 border border-[#eadfcd] text-[#6f5b3e] rounded-lg hover:bg-[#f6efe4] transition-colors"
                                title="Disable active live links"
                            >
                                Revoke Live
                            </button>
                        </>
                    ) : null}
                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1b140a] text-[#f5e7c6] rounded-lg hover:bg-[#2a2217] transition-colors disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            {useMockAdmin && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-900">Mock Notification Log</h2>
                        <span className="text-xs text-gray-500">Demo only</span>
                    </div>
                    <div className="space-y-3">
                        {mockNotificationLog.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                            >
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{log.title}</div>
                                    <div className="text-xs text-gray-500">{log.body}</div>
                                </div>
                                <div className="text-xs text-gray-500 text-right">
                                    <div className="capitalize">{log.status}</div>
                                    <div>{new Date(log.sent_at).toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    {/* Day Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {Array.from({ length: durationDays }, (_, i) => i + 1).map((day) => (
                            <button
                                key={day}
                                onClick={() => setActiveDay(day)}
                                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeDay === day
                                    ? "bg-primary text-white"
                                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                Day {day}
                                {assignments[day]?.external_driver_id && (
                                    <span className="ml-2 w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Day Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Assignment and Accommodation blocks here... I'll just keep them as is but wrapped */}
                        {/* Driver Assignment */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Car className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Driver Assignment</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Driver
                                    </label>
                                    <select
                                        value={assignments[activeDay]?.external_driver_id || ""}
                                        onChange={(e) =>
                                            updateAssignment(activeDay, "external_driver_id", e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="">No driver assigned</option>
                                        {drivers.map((driver) => {
                                            const isBusy = (busyDriversByDay[activeDay] || []).includes(driver.id);
                                            return (
                                                <option
                                                    key={driver.id}
                                                    value={driver.id}
                                                    disabled={isBusy}
                                                    className={isBusy ? "text-red-500" : ""}
                                                >
                                                    {driver.full_name}
                                                    {driver.vehicle_type ? ` - ${driver.vehicle_type}` : ""}
                                                    {driver.vehicle_plate ? ` (${driver.vehicle_plate})` : ""}
                                                    {isBusy ? " (Unavailable - Assigned to another trip)" : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <Clock className="h-3 w-3 inline mr-1" />
                                            Pickup Time
                                        </label>
                                        <input
                                            type="time"
                                            value={assignments[activeDay]?.pickup_time || ""}
                                            onChange={(e) =>
                                                updateAssignment(activeDay, "pickup_time", e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <MapPin className="h-3 w-3 inline mr-1" />
                                            Pickup Location
                                        </label>
                                        <input
                                            type="text"
                                            value={assignments[activeDay]?.pickup_location || ""}
                                            onChange={(e) =>
                                                updateAssignment(activeDay, "pickup_location", e.target.value)
                                            }
                                            placeholder="Hotel lobby, airport..."
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes for Driver
                                    </label>
                                    <textarea
                                        value={assignments[activeDay]?.notes || ""}
                                        onChange={(e) => updateAssignment(activeDay, "notes", e.target.value)}
                                        placeholder="Special instructions..."
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>

                                {assignments[activeDay]?.external_driver_id && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <a
                                            href={getWhatsAppLinkForDay(activeDay) || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Send to Driver via WhatsApp
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Accommodation */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Hotel className="h-5 w-5 text-secondary" />
                                <h2 className="text-lg font-semibold">Accommodation</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hotel Name
                                    </label>
                                    <input
                                        type="text"
                                        value={accommodations[activeDay]?.hotel_name || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            updateAccommodation(activeDay, "hotel_name", value);

                                            const existingTimer = hotelSearchDebounceRef.current[activeDay];
                                            if (existingTimer) {
                                                window.clearTimeout(existingTimer);
                                            }

                                            if (value.trim().length >= 3) {
                                                hotelSearchDebounceRef.current[activeDay] = window.setTimeout(() => {
                                                    void fetchNearbyHotels(activeDay, value.trim());
                                                }, 350);
                                            }
                                        }}
                                        onFocus={() => {
                                            if (!hotelSuggestions[activeDay]?.length) {
                                                void fetchNearbyHotels(activeDay);
                                            }
                                        }}
                                        placeholder="Enter hotel name"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void fetchNearbyHotels(activeDay)}
                                            className="text-xs font-medium text-primary hover:underline"
                                        >
                                            {hotelLoadingByDay[activeDay] ? "Finding nearby hotels..." : "Auto-pick nearest hotel"}
                                        </button>
                                        {hotelSuggestions[activeDay]?.length ? (
                                            <span className="text-xs text-gray-500">
                                                {hotelSuggestions[activeDay].length} nearby options
                                            </span>
                                        ) : null}
                                    </div>
                                    {hotelSuggestions[activeDay]?.length ? (
                                        <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-gray-200 bg-white">
                                            {hotelSuggestions[activeDay].map((hotel, i) => (
                                                <button
                                                    key={`${hotel.name}-${hotel.lat}-${hotel.lng}-${i}`}
                                                    type="button"
                                                    onClick={() => fillAccommodationFromSuggestion(activeDay, hotel)}
                                                    className="w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"
                                                >
                                                    <div className="text-sm font-medium text-gray-900">{hotel.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {hotel.address} • {hotel.distanceKm.toFixed(1)} km
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <input
                                        type="text"
                                        value={accommodations[activeDay]?.address || ""}
                                        onChange={(e) =>
                                            updateAccommodation(activeDay, "address", e.target.value)
                                        }
                                        placeholder="Hotel address"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Check-in Time
                                        </label>
                                        <input
                                            type="time"
                                            value={accommodations[activeDay]?.check_in_time || "15:00"}
                                            onChange={(e) =>
                                                updateAccommodation(activeDay, "check_in_time", e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <Phone className="h-3 w-3 inline mr-1" />
                                            Contact Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={accommodations[activeDay]?.contact_phone || ""}
                                            onChange={(e) =>
                                                updateAccommodation(activeDay, "contact_phone", e.target.value)
                                            }
                                            placeholder="+1 234 567 8900"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Day Activities (Editable) */}
                    {itineraryDays.find((d) => d.day_number === activeDay) && (
                        <div className="bg-white rounded-xl border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1 mr-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Day Theme
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            itineraryDays.find((d) => d.day_number === activeDay)?.theme ||
                                            ""
                                        }
                                        onChange={(e) => updateDayTheme(activeDay, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
                                    />
                                </div>
                                <button
                                    onClick={() => addActivity(activeDay)}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Activity
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-lg border border-[#eadfcd] bg-[#faf6ee] p-3">
                                    <p className="text-[10px] uppercase tracking-wide text-[#9c7c46]">Reminder Queue</p>
                                    {reminderStatusByDay[activeDay] ? (
                                        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                                            <span className="rounded bg-white border border-[#eadfcd] px-2 py-1 text-center">P {reminderStatusByDay[activeDay].pending}</span>
                                            <span className="rounded bg-white border border-[#eadfcd] px-2 py-1 text-center">W {reminderStatusByDay[activeDay].processing}</span>
                                            <span className="rounded bg-white border border-[#eadfcd] px-2 py-1 text-center">S {reminderStatusByDay[activeDay].sent}</span>
                                            <span className="rounded bg-white border border-[#eadfcd] px-2 py-1 text-center">F {reminderStatusByDay[activeDay].failed}</span>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-[#6f5b3e]">No reminders queued for this day yet.</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-[#eadfcd] bg-[#faf6ee] p-3">
                                    <p className="text-[10px] uppercase tracking-wide text-[#9c7c46]">Driver Ping</p>
                                    {latestDriverLocation?.recorded_at ? (
                                        <>
                                            <p className="mt-2 text-xs text-[#1b140a]">
                                                Last ping: {new Date(latestDriverLocation.recorded_at).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-[#6f5b3e]">
                                                {latestDriverLocation.latitude.toFixed(5)}, {latestDriverLocation.longitude.toFixed(5)}
                                            </p>
                                            {Date.now() - new Date(latestDriverLocation.recorded_at).getTime() > 10 * 60 * 1000 ? (
                                                <p className="mt-1 text-xs font-semibold text-rose-600">Stale: no recent location in last 10 min</p>
                                            ) : (
                                                <p className="mt-1 text-xs font-semibold text-emerald-600">Live: recent location available</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="mt-2 text-xs text-[#6f5b3e]">No driver location ping received yet.</p>
                                    )}
                                </div>
                                {itineraryDays
                                    .find((d) => d.day_number === activeDay)
                                    ?.activities.map((activity, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group"
                                        >
                                            <div className="mt-3 w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div className="md:col-span-2">
                                                    <input
                                                        type="text"
                                                        value={activity.title}
                                                        onChange={(e) =>
                                                            updateActivity(
                                                                activeDay,
                                                                index,
                                                                "title",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                                                        placeholder="Activity title"
                                                    />
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-[#bda87f]" />
                                                        <input
                                                            type="text"
                                                            value={activity.location || ""}
                                                            onChange={(e) =>
                                                                updateActivity(
                                                                    activeDay,
                                                                    index,
                                                                    "location",
                                                                    e.target.value
                                                                )
                                                            }
                                                            onBlur={(e) =>
                                                                handleLocationBlur(activeDay, index, e.target.value)
                                                            }
                                                            className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5 text-sm text-[#6f5b3e]"
                                                            placeholder="Location (auto-mapped)"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-[210px] rounded-lg border border-[#eadfcd] bg-[#faf6ee] p-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-[#9c7c46] mb-1">Start</p>
                                                            {index === 0 ? (
                                                                <select
                                                                    value={activity.start_time || "09:00"}
                                                                    onChange={(e) =>
                                                                        updateActivity(
                                                                            activeDay,
                                                                            index,
                                                                            "start_time",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full rounded-md border border-[#eadfcd] bg-white px-2 py-1.5 text-sm font-mono tabular-nums text-[#1b140a] focus:outline-none focus:ring-2 focus:ring-[#c4a870]/25"
                                                                >
                                                                    {timeOptions.map((time) => (
                                                                        <option key={time} value={time}>
                                                                            {time}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <div className="rounded-md border border-[#eadfcd] bg-white px-2 py-1.5 text-sm font-mono tabular-nums text-[#1b140a] text-center">
                                                                    {activity.start_time || "--:--"}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-[#9c7c46] mb-1">End</p>
                                                            <div className="rounded-md border border-[#eadfcd] bg-white px-2 py-1.5 text-sm font-mono tabular-nums text-[#1b140a] text-center">
                                                                {activity.end_time || "--:--"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-[132px] rounded-lg border border-[#eadfcd] bg-[#faf6ee] p-2">
                                                    <p className="text-[10px] uppercase tracking-wide text-[#9c7c46] mb-1">Duration</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <select
                                                            value={activity.duration_minutes}
                                                            onChange={(e) =>
                                                                updateActivity(
                                                                    activeDay,
                                                                    index,
                                                                    "duration_minutes",
                                                                    parseInt(e.target.value, 10) || 60
                                                                )
                                                            }
                                                            className="w-full rounded-md border border-[#eadfcd] bg-white px-2 py-1.5 text-sm font-mono tabular-nums text-[#1b140a] focus:outline-none focus:ring-2 focus:ring-[#c4a870]/25"
                                                        >
                                                            {[30, 45, 60, 75, 90, 120, 150, 180].map((mins) => (
                                                                <option key={mins} value={mins}>
                                                                    {mins}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="text-xs text-[#8a7351]">mins</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeActivity(activeDay, index)}
                                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}

                                {itineraryDays.find((d) => d.day_number === activeDay)?.activities.length === 0 && (
                                    <div className="text-center py-6 text-gray-400 text-sm">
                                        No activities planned for this day.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="hidden xl:block h-[calc(100vh-100px)] sticky top-6">
                    <ItineraryMap
                        activities={
                            itineraryDays
                                .find(d => d.day_number === activeDay)
                                ?.activities || []
                        }
                    />
                </div>
            </div>
        </div>
    )
}
