import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Wallet, Clock, Plane } from "lucide-react";
import ClientItineraryMap from "@/components/map/ClientItineraryMap";
import type { Day, Activity, ItineraryResult } from "@/types/itinerary";

export default async function SharedTripPage({
    params,
}: {
    params: { token: string };
}) {
    const supabase = await createClient();
    const { token } = await params;

    // Get the shared itinerary by token
    const { data: share, error: shareError } = await supabase
        .from("shared_itineraries")
        .select("*, itineraries(*)")
        .eq("share_code", token)
        .single();

    if (shareError || !share) {
        notFound();
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
                    <p className="text-gray-600 mb-6">This share link is no longer valid.</p>
                    <Link
                        href="/planner"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Create Your Own Trip
                    </Link>
                </div>
            </main>
        );
    }

    // Update last viewed time
    await supabase
        .from("shared_itineraries")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", share.id);

    const itinerary = share.itineraries;

    if (!itinerary) {
        notFound();
    }

    const tripData = itinerary.raw_data as ItineraryResult;

    return (
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50">
            {/* Shared Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                            <Plane className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-serif text-secondary">GoBuddy Adventures</span>
                    </Link>
                    <Link
                        href="/planner"
                        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Plan Your Trip
                    </Link>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Shared by badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full mb-6">
                    <span>✨ Shared Trip</span>
                </div>

                {/* Trip Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-serif text-secondary mb-3">
                        {itinerary.trip_title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-gray-600">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-primary" />
                            {itinerary.destination}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {itinerary.duration_days} days
                        </span>
                        {itinerary.budget && (
                            <span className="flex items-center gap-1">
                                <Wallet className="w-4 h-4" />
                                {itinerary.budget}
                            </span>
                        )}
                    </div>
                    {itinerary.interests && itinerary.interests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {itinerary.interests.map((interest: string) => (
                                <span
                                    key={interest}
                                    className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full"
                                >
                                    {interest}
                                </span>
                            ))}
                        </div>
                    )}
                    <p className="mt-4 text-gray-700">{itinerary.summary}</p>
                </div>

                {/* Map */}
                {tripData?.days && (
                    <div className="h-72 rounded-xl overflow-hidden shadow-md border border-gray-200 mb-8">
                        <ClientItineraryMap
                            activities={tripData.days.flatMap((day: Day) => day.activities)}
                        />
                    </div>
                )}

                {/* Day by Day */}
                {tripData?.days && (
                    <div className="space-y-6">
                        {tripData.days.map((day: Day) => (
                            <div
                                key={day.day_number}
                                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
                            >
                                <h2 className="text-xl font-bold text-secondary mb-4">
                                    Day {day.day_number}: {day.theme}
                                </h2>
                                <div className="space-y-4">
                                    {day.activities.map((activity: Activity, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex gap-4 p-4 bg-gray-50 rounded-lg"
                                        >
                                            <div className="shrink-0 w-16 text-sm text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {activity.time}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-800">
                                                    {activity.title}
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {activity.description}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                                                    <span>{activity.location}</span>
                                                    {activity.duration && (
                                                        <span>• {activity.duration}</span>
                                                    )}
                                                    {activity.cost && (
                                                        <span>• {activity.cost}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tips Section */}
                {tripData?.tips && tripData.tips.length > 0 && (
                    <div className="mt-8 bg-amber-50 p-6 rounded-xl border border-amber-100">
                        <h3 className="font-bold text-amber-800 mb-3">Travel Tips</h3>
                        <ul className="space-y-2">
                            {tripData.tips.map((tip: string, idx: number) => (
                                <li key={idx} className="flex gap-2 text-amber-700 text-sm">
                                    <span>•</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* CTA Footer */}
                <div className="mt-12 text-center bg-gradient-to-r from-primary/10 to-sky-100 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-secondary mb-2">
                        Want to plan your own adventure?
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Create your personalized AI-powered itinerary in minutes
                    </p>
                    <Link
                        href="/planner"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        <Plane className="w-5 h-5" />
                        Start Planning
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-auto py-6 text-center text-sm text-gray-500 border-t border-gray-100">
                <p>Created with ❤️ by GoBuddy Adventures</p>
            </footer>
        </main>
    );
}
