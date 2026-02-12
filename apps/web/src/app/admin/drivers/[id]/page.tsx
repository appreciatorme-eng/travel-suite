
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Car, Phone, Mail, FileText, Languages, User, Link2, CalendarDays, MapPin, ShieldCheck, BadgeCheck } from "lucide-react";

export default async function DriverDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch External Driver Details
    const { data: driver } = await supabase
        .from("external_drivers")
        .select("*")
        .eq("id", id)
        .single();

    if (!driver) return notFound();

    // 2. Fetch Linked App Profile
    const { data: link } = await supabase
        .from("driver_accounts")
        .select(`
            is_active,
            profiles (
                id,
                email,
                full_name,
                phone,
                bio,
                driver_info,
                avatar_url
            )
        `)
        .eq("external_driver_id", id)
        .maybeSingle();

    // 3. Fetch Assigned Trips (via trip_driver_assignments)
    const { data: assignments } = await supabase
        .from("trip_driver_assignments")
        .select(`
            id,
            day_number,
            pickup_time,
            pickup_location,
            trip:trips (
                id,
                start_date,
                end_date,
                status,
                itineraries (
                    destination
                )
            )
        `)
        .eq("external_driver_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

    // Prepare helper data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = link?.profiles as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appDriverInfo = (profile?.driver_info as any) || {};

    const profileLanguages = appDriverInfo.languages || [];
    const externalLanguages = driver.languages || [];
    // Merge unique languages
    const allLanguages = Array.from(new Set([...externalLanguages, ...profileLanguages]));

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="space-y-8">
            {/* Header / Main Card */}
            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-[#f6efe4] rounded-full flex items-center justify-center border border-[#eadfcd] text-2xl font-medium text-[#9c7c46]">
                            {/* Use profile avatar if available, else initials */}
                            {profile?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.avatar_url} alt={driver.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                driver.full_name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-[var(--font-display)] text-[#1b140a]">{driver.full_name}</h1>
                            <div className="mt-2 text-sm text-[#6f5b3e] space-y-1">
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {driver.phone}
                                </div>
                                {link && profile && (
                                    <div className="flex items-center gap-2 text-emerald-700">
                                        <Link2 className="w-4 h-4" />
                                        Linked App User: {profile.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${driver.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                            {driver.is_active ? "Active Status" : "Inactive"}
                        </span>

                        {appDriverInfo?.license_number && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Lic: {appDriverInfo.license_number}
                            </span>
                        )}
                    </div>
                </div>

                {/* Bio Section (from App Profile) */}
                {profile?.bio && (
                    <div className="mt-6 pt-6 border-t border-[#f6efe4]">
                        <h3 className="text-sm font-semibold text-[#1b140a] mb-2">Driver Bio</h3>
                        <p className="text-sm text-[#6f5b3e] italic">{profile.bio}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Vehicle & Detailed Info */}
                <div className="space-y-8">
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                        <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-4 flex items-center gap-2">
                            <Car className="w-5 h-5 text-[#bda87f]" />
                            Vehicle Information
                        </h2>

                        <div className="space-y-4">
                            {/* Primary Vehicle (External Driver Data) */}
                            <div className="bg-[#fdfbf6] p-4 rounded-lg border border-[#f6efe4]">
                                <div className="text-sm font-medium text-[#9c7c46] mb-2 uppercase tracking-wider">Primary Vehicle</div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="block text-gray-500 text-xs">Type</span>
                                        <span className="font-medium capitalize">{driver.vehicle_type || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs">Plate</span>
                                        <span className="font-medium uppercase">{driver.vehicle_plate || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs">Capacity</span>
                                        <span className="font-medium">{driver.vehicle_capacity} Passengers</span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info from App Profile */}
                            {appDriverInfo?.vehicle_details && (
                                <div className="bg-[#f0f9ff] p-4 rounded-lg border border-blue-100">
                                    <div className="text-sm font-medium text-blue-700 mb-2 uppercase tracking-wider">App Profile Details</div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="block text-blue-400 text-xs">Make/Model</span>
                                            <span className="font-medium text-blue-900">
                                                {appDriverInfo.vehicle_details.make} {appDriverInfo.vehicle_details.model}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-blue-400 text-xs">Year</span>
                                            <span className="font-medium text-blue-900">
                                                {appDriverInfo.vehicle_details.year}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Languages */}
                            <div>
                                <h3 className="text-sm font-medium text-[#1b140a] mb-2 flex items-center gap-2">
                                    <Languages className="w-4 h-4 text-[#bda87f]" />
                                    Languages Spoken
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {allLanguages.map((lang: string) => (
                                        <span key={lang} className="px-2 py-1 text-xs font-semibold rounded-full bg-[#f6efe4] text-[#9c7c46]">
                                            {lang}
                                        </span>
                                    ))}
                                    {allLanguages.length === 0 && <span className="text-sm text-gray-400">No languages listed</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Assignments */}
                <div className="space-y-8">
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                        <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-4 flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-[#bda87f]" />
                            Recent Assignments
                        </h2>

                        <div className="space-y-3">
                            {assignments && assignments.length > 0 ? assignments.map((assignment) => (
                                <div key={assignment.id} className="p-3 bg-[#fdfbf6] rounded-lg border border-[#f6efe4]">
                                    <div className="text-sm font-semibold text-[#1b140a]">{assignment.trip?.itineraries?.destination || "Unknown Trip"}</div>
                                    <div className="text-xs text-[#6f5b3e] mt-1 flex justify-between">
                                        <span>
                                            {formatDate(assignment.trip?.start_date)}
                                        </span>
                                        <span className="capitalize px-2 py-0.5 rounded bg-[#efe2cf] text-[#6f5b3e]">
                                            Day {assignment.day_number}
                                        </span>
                                    </div>
                                    {(assignment.pickup_location || assignment.pickup_time) && (
                                        <div className="mt-2 pt-2 border-t border-[#f6efe4] text-xs text-gray-500 flex items-center gap-2">
                                            <MapPin className="w-3 h-3" />
                                            {assignment.pickup_time ? `${assignment.pickup_time} - ` : ""}
                                            {assignment.pickup_location || "No location specified"}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-8 text-[#6f5b3e] text-sm italic">
                                    No trip assignments found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
