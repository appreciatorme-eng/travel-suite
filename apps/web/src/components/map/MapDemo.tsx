"use client";

import { Map, MapControls } from "@/components/ui/map";

export function MapDemo() {
    return (
        <div className="h-[500px] w-full rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <Map
                center={[-74.006, 40.7128]}
                zoom={11}
                className="w-full h-full"
            >
                <MapControls />
            </Map>
        </div>
    );
}
