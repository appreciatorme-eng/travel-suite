"use client";

import dynamic from "next/dynamic";

const ItineraryMap = dynamic(() => import("@/components/map/ItineraryMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />,
});

interface ClientItineraryMapProps {
    activities: Array<{
        title: string;
        location: string;
        coordinates?: { lat: number; lng: number };
    }>;
}

export default function ClientItineraryMap({ activities }: ClientItineraryMapProps) {
    return <ItineraryMap activities={activities} />;
}
