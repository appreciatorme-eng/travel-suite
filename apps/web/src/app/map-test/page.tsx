"use client";

import { MapDemo } from "@/components/map/MapDemo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MapTestPage() {
    return (
        <main className="min-h-screen bg-gray-50 p-10">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/" className="text-gray-500 hover:text-black flex items-center gap-2 mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold font-serif text-gray-900">mapcn Integration Test</h1>
                    <p className="text-gray-500 mt-2">Verifying MapLibre GL implementation with shadcn/ui styling.</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4">Interactive Map Demo</h2>
                    <MapDemo />

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                        <p className="font-medium mb-1">Status: Component Installed</p>
                        <ul className="list-disc list-inside space-y-1 opacity-80">
                            <li>Component Path: <code className="bg-blue-100 px-1 py-0.5 rounded">src/components/ui/map.tsx</code></li>
                            <li>Dependencies: <code className="bg-blue-100 px-1 py-0.5 rounded">maplibre-gl</code> (v5.17.0)</li>
                            <li>Style: Carto (Default)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
