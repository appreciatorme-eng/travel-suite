import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import TripDetailClient from "@/components/TripDetailClient";

export default async function TripDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth?next=/trips/${id}`);
    }

    const { data: itinerary, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (error || !itinerary) {
        notFound();
    }

    return <TripDetailClient itinerary={itinerary} />;
}
