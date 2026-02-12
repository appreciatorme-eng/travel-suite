"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Wallet, Clock, ArrowLeft, Share2, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import ShareModal from "@/components/ShareModal";
import WeatherWidget from "@/components/WeatherWidget";
import CurrencyConverter from "@/components/CurrencyConverter";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ItineraryResult, Day, Activity } from "@/types/itinerary";

const ItineraryMap = dynamic(() => import("@/components/map/ItineraryMap"), {
    ssr: false,
    loading: () => <div className="h-72 bg-gray-100 animate-pulse rounded-xl" />,
});

const PDFDownloadButton = dynamic(
    () => import("@/components/pdf/PDFDownloadButton"),
    { ssr: false, loading: () => <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> }
);

interface TripDetailClientProps {
    itinerary: {
        id: string;
        trip_title: string;
        destination: string;
        duration_days: number | null;
        budget?: string | null;
        interests?: string[] | null;
        summary?: string | null;
        raw_data: ItineraryResult;
    };
}

export default function TripDetailClient({ itinerary }: TripDetailClientProps) {
    const [showShareModal, setShowShareModal] = useState(false);

    const tripData = itinerary.raw_data;

    return (
        <>
            <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-emerald-50 via-white to-sky-50 pb-20">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    {/* Top Navigation Bar */}
                    <div className="flex justify-between items-center mb-8">
                        <Link href="/trips">
                            <Button variant="ghost" className="gap-2 text-gray-600 hover:text-secondary pl-0 hover:bg-transparent">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Trips
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowShareModal(true)}
                                title="Share"
                                className="bg-white/80 backdrop-blur-sm shadow-sm"
                            >
                                <Share2 className="w-4 h-4 text-gray-700" />
                            </Button>
                            <PDFDownloadButton itinerary={tripData} />
                        </div>
                    </div>

                    {/* Trip Header */}
                    <div className="mb-10 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-serif text-secondary mb-4 tracking-tight leading-tight">
                            {itinerary.trip_title}
                        </h1>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-gray-600 mb-6">
                            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="font-medium">{itinerary.destination}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="font-medium">{itinerary.duration_days || 0} days</span>
                            </div>
                            {itinerary.budget && (
                                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                    <Wallet className="w-4 h-4 text-primary" />
                                    <span className="font-medium">{itinerary.budget}</span>
                                </div>
                            )}
                        </div>

                        {itinerary.interests && itinerary.interests.length > 0 && (
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                                {itinerary.interests.map((interest: string) => (
                                    <Badge
                                        key={interest}
                                        variant="secondary"
                                        className="bg-emerald-100/50 text-emerald-800 hover:bg-emerald-100 border-emerald-200"
                                    >
                                        {interest}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {itinerary.summary && (
                            <Card className="bg-white/50 backdrop-blur-sm border-gray-200/50 shadow-sm">
                                <CardContent className="pt-6">
                                    <p className="text-lg text-gray-700 leading-relaxed font-light">
                                        {itinerary.summary}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column: Itinerary */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Map - Mobile/Tablet only (visible on small screens) */}
                            <div className="block lg:hidden h-80 rounded-xl overflow-hidden shadow-lg border border-gray-200">
                                {tripData?.days && (
                                    <ItineraryMap
                                        activities={tripData.days.flatMap((day: Day) => day.activities)}
                                    />
                                )}
                            </div>

                            {/* Day by Day */}
                            {tripData?.days && (
                                <div className="space-y-6">
                                    {tripData.days.map((day: Day) => (
                                        <Card key={day.day_number} className="overflow-hidden border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                                            <div className="bg-gradient-to-r from-secondary/5 to-transparent px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                                <h2 className="text-xl font-bold text-secondary flex items-center gap-3">
                                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-white text-sm font-bold shadow-sm">
                                                        {day.day_number}
                                                    </span>
                                                    {day.theme}
                                                </h2>
                                            </div>

                                            <CardContent className="p-0">
                                                <div className="divide-y divide-gray-100">
                                                {day.activities.map((activity: Activity, idx: number) => (
                                                        <div key={idx} className="p-6 hover:bg-gray-50/50 transition-colors">
                                                            <div className="flex flex-col md:flex-row gap-5">
                                                                {activity.image && (
                                                                    <div className="md:w-32 md:h-24 w-full h-48 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                                                        <Image
                                                                            src={activity.image}
                                                                            alt={activity.title}
                                                                            width={128}
                                                                            height={96}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-start justify-between">
                                                                        <h4 className="text-lg font-semibold text-gray-900 leading-tight">
                                                                            {activity.title}
                                                                        </h4>
                                                                        <Badge variant="outline" className="flex items-center gap-1.5 font-normal text-gray-500 shrink-0">
                                                                            <Clock className="w-3 h-3" />
                                                                            {activity.time}
                                                                        </Badge>
                                                                    </div>

                                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                                        {activity.description}
                                                                    </p>

                                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 pt-1">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                                                            <span className="font-medium">{activity.location}</span>
                                                                        </div>
                                                                        {activity.duration && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                                <span>{activity.duration}</span>
                                                                            </div>
                                                                        )}
                                                                        {activity.cost && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Wallet className="w-3.5 h-3.5 text-gray-400" />
                                                                                <span>{activity.cost}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Widgets (Desktop) */}
                        <div className="hidden lg:block space-y-8">
                            {/* Map Widget */}
                            <div className="sticky top-6 space-y-8">
                                <Card className="overflow-hidden shadow-lg border-gray-200">
                                    <div className="h-80 w-full relative">
                                        {tripData?.days && (
                                            <ItineraryMap
                                                activities={tripData.days.flatMap((day: Day) => day.activities)}
                                            />
                                        )}
                                    </div>
                                    <div className="p-3 bg-white text-xs text-center text-gray-500 border-t border-gray-100">
                                        Interactive Map
                                    </div>
                                </Card>

                                <Card className="border-gray-200 shadow-md">
                                    <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Destination Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <WeatherWidget
                                            destination={itinerary.destination}
                                            days={itinerary.duration_days || 1}
                                        />

                                        <Separator />

                                        <CurrencyConverter compact />
                                    </CardContent>
                                </Card>

                                {/* Tips Widget */}
                                {tripData?.tips && tripData.tips.length > 0 && (
                                    <Card className="border-amber-100 bg-amber-50/30 shadow-md">
                                        <CardHeader className="pb-3 border-b border-amber-100/50 bg-amber-50/50">
                                            <CardTitle className="text-secondary flex items-center gap-2">
                                                <span className="text-xl">💡</span> Travel Tips
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <ul className="space-y-3">
                                                {tripData.tips.map((tip: string, idx: number) => (
                                                    <li key={idx} className="flex gap-3 text-amber-900/80 text-sm leading-snug">
                                                        <span className="text-amber-500 mt-1">•</span>
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Share Modal */}
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                itineraryId={itinerary.id}
                tripTitle={itinerary.trip_title}
            />
        </>
    );
}
