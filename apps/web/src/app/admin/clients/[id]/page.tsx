
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Mail, Phone, MapPin, CalendarDays, BadgeCheck, Utensils, Accessibility, User, HeartPulse } from "lucide-react";
import type { Database } from "@/lib/database.types";

export default async function ClientProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient(); // Await createClient just in case (though typically sync, but good practice if it changes)
    // Wait, check standard pattern. Usually createClient is sync in recent supabase-ssr? No, usually awaitable cookies().
    // Looking at lib/supabase/server.ts would confirm. Assuming awaitable.

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !profile) {
        notFound();
    }

    // Fetch trips
    const { data: trips } = await supabase
        .from("trips")
        .select("*, itineraries(destination)")
        .eq("client_id", id)
        .order("start_date", { ascending: false });

    // Helper to format currency
    const formatCurrency = (amount: number | null) => {
        if (amount == null) return "N/A";
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
    };

    // Helper for date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    // Extract client info safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientInfo = (profile.client_info as any) || {};

    return (
        <div className="space-y-8">
            {/* Header Card */}
            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-[var(--font-display)] text-[#1b140a]">{profile.full_name || "Unnamed Client"}</h1>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#6f5b3e]">
                            {profile.email && (
                                <span className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {profile.email}
                                </span>
                            )}
                            {profile.phone && (
                                <span className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {profile.phone}
                                </span>
                            )}
                            {profile.phone_whatsapp && (
                                <span className="flex items-center gap-2 text-green-700">
                                    <Phone className="w-4 h-4" />
                                    WhatsApp: {profile.phone_whatsapp}
                                </span>
                            )}
                        </div>
                        {profile.bio && (
                            <p className="mt-4 text-sm text-[#6f5b3e] italic border-l-2 border-[#bda87f] pl-3">
                                {profile.bio}
                            </p>
                        )}
                    </div>
                    {/* Tags / Badges */}
                    <div className="flex flex-col items-end gap-2">
                        {profile.lifecycle_stage && (
                            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[#f6efe4] text-[#9c7c46] capitalize">
                                <BadgeCheck className="w-4 h-4" />
                                {profile.lifecycle_stage.replace('_', ' ')}
                            </span>
                        )}
                        {clientInfo.loyalty_tier && (
                            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 capitalize">
                                {clientInfo.loyalty_tier} Tier
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column: Preferences & Needs */}
                <div className="space-y-8">
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                        <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-[#bda87f]" />
                            Travel Preferences
                        </h2>
                        <div className="grid gap-3 text-sm text-[#6f5b3e]">
                            <div className="flex items-center justify-between border-b border-[#f6efe4] pb-2">
                                <span>Preferred Destination</span>
                                <span className="font-medium text-[#1b140a]">{profile.preferred_destination || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[#f6efe4] pb-2">
                                <span>Travelers Count</span>
                                <span className="font-medium text-[#1b140a]">{profile.travelers_count || 1}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[#f6efe4] pb-2">
                                <span>Budget Range</span>
                                <span className="font-medium text-[#1b140a]">{formatCurrency(profile.budget_min)} - {formatCurrency(profile.budget_max)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[#f6efe4] pb-2">
                                <span>Travel Style</span>
                                <span className="font-medium text-[#1b140a]">{profile.travel_style || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[#f6efe4] pb-2">
                                <span>Home Airport</span>
                                <span className="font-medium text-[#1b140a]">{profile.home_airport || "—"}</span>
                            </div>

                            <div className="mt-2">
                                <span className="block mb-2 text-xs uppercase tracking-wider text-[#9c7c46]">Interests</span>
                                <div className="flex flex-wrap gap-2">
                                    {(profile.interests || []).map((interest: string) => (
                                        <span
                                            key={interest}
                                            className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700"
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                    {(!profile.interests || profile.interests.length === 0) && (
                                        <span className="text-xs text-gray-400">No interests selected</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Health & Dietary Requirements */}
                    {(profile.dietary_requirements?.length || profile.mobility_needs) ? (
                        <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                            <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-4 flex items-center gap-2">
                                <HeartPulse className="w-5 h-5 text-rose-400" />
                                Health & Accessibility
                            </h2>
                            <div className="space-y-4">
                                {profile.dietary_requirements && profile.dietary_requirements.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-[#1b140a] mb-2">
                                            <Utensils className="w-4 h-4 text-[#9c7c46]" />
                                            Dietary Requirements
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.dietary_requirements.map((req: string) => (
                                                <span key={req} className="px-2 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                                                    {req}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {profile.mobility_needs && (
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-[#1b140a] mb-2">
                                            <Accessibility className="w-4 h-4 text-[#9c7c46]" />
                                            Mobility Needs
                                        </div>
                                        <p className="text-sm text-[#6f5b3e] bg-[#fdfbf6] p-3 rounded-lg border border-[#f6efe4]">
                                            {profile.mobility_needs}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Right Column: Trips & History */}
                <div className="space-y-8">
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                        <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#bda87f]" />
                            Trip History
                        </h2>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {trips && trips.length > 0 ? trips.map((trip) => (
                                <div key={trip.id} className="flex items-center justify-between rounded-lg border border-[#efe2cf] bg-[#f8f1e6] px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[#1b140a]">{trip.itineraries?.destination || "Custom Trip"}</p>
                                        <p className="text-xs text-[#6f5b3e] flex items-center gap-2 mt-1">
                                            <CalendarDays className="w-3 h-3" />
                                            {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                        <span className={`px-2 py-1 rounded-full capitalize ${trip.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                                            trip.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {trip.status || 'Planned'}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-[#6f5b3e] text-sm italic">
                                    No trips recorded for this client.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
