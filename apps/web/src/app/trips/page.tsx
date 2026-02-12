import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Wallet, ArrowRight, Plus, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TripsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth?next=/trips");
    }

    const { data: itineraries, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 pb-20">
            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-serif text-secondary mb-3 tracking-tight">My Journeys</h1>
                        <p className="text-gray-500 text-lg font-light max-w-2xl">
                            Revisit your generated itineraries and start planning your next adventure.
                        </p>
                    </div>
                    <Link href="/planner">
                        <Button size="lg" className="h-12 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl bg-primary text-primary-foreground font-bold">
                            <Plus className="w-5 h-5 mr-2" /> Plan New Trip
                        </Button>
                    </Link>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 mb-8 flex items-center gap-3 shadow-sm">
                        <span className="text-xl">⚠️</span>
                        <span>Error loading trips: {error.message}</span>
                    </div>
                )}

                {itineraries && itineraries.length === 0 && (
                    <Card className="text-center py-24 shadow-xl border-dashed border-2 border-primary/20 bg-white/50 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-sky-100 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
                                <Rocket className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-3xl font-serif text-secondary mb-3">No trips yet</h2>
                            <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg font-light">
                                The world is waiting for you. Create your first AI-powered itinerary and start your next adventure today.
                            </p>
                            <Link href="/planner">
                                <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 rounded-xl">
                                    Start Planning <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {itineraries && itineraries.length > 0 && (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                        {itineraries.map((trip) => (
                            <Link key={trip.id} href={`/trips/${trip.id}`} className="group h-full block">
                                <Card className="h-full overflow-hidden hover:shadow-2xl transition-all duration-500 border-gray-100 group-hover:border-primary/20 bg-white group-hover:-translate-y-2">
                                    <div className="h-56 bg-gray-100 relative overflow-hidden">
                                        {/* Placeholder gradient - creates a unique pattern based on ID/Title logic if we wanted, but static gradient is fine */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-500 opacity-90 transition-transform duration-700 group-hover:scale-110" />

                                        {/* Decorative circles */}
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                                        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                                        <div className="absolute top-4 right-4 z-10">
                                            <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-secondary shadow-sm font-bold px-3 py-1">
                                                {trip.duration_days} Days
                                            </Badge>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 transform transition-transform duration-500 group-hover:translate-y-0 translate-y-2">
                                            <h3 className="text-2xl font-serif font-bold text-white drop-shadow-md line-clamp-2 leading-tight mb-1">
                                                {trip.trip_title}
                                            </h3>
                                            <div className="flex items-center text-white/90 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                                <MapPin className="w-3.5 h-3.5 mr-1" /> {trip.destination}
                                            </div>
                                        </div>
                                    </div>

                                    <CardContent className="p-6 space-y-5">
                                        {trip.summary && (
                                            <p className="text-gray-600 line-clamp-3 leading-relaxed text-sm font-light">
                                                {trip.summary}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            {trip.budget && (
                                                <Badge variant="outline" className="font-normal text-xs text-gray-500 border-gray-100 bg-gray-50/50">
                                                    <Wallet className="w-3 h-3 mr-1 text-primary" />
                                                    {trip.budget}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>

                                    <CardFooter className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <Calendar className="w-3.5 h-3.5 text-gray-300" />
                                            {trip.created_at ? new Date(trip.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            }) : 'Date unknown'}
                                        </span>
                                        <span className="text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                                            View Itinerary <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
