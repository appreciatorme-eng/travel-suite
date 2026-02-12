"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, MapPin, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Activity, Day, ItineraryResult } from "@/types/itinerary";

interface Client {
    id: string;
    full_name: string;
    email: string;
}

const mockClients: Client[] = [
    { id: "mock-client-1", full_name: "Ava Chen", email: "ava.chen@example.com" },
    { id: "mock-client-2", full_name: "Liam Walker", email: "liam.walker@example.com" },
];

interface CreateTripModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function CreateTripModal({ open, onOpenChange, onSuccess }: CreateTripModalProps) {
    const supabase = createClient();
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    // Form State
    const [clientId, setClientId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // AI State
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedData, setGeneratedData] = useState<ItineraryResult | null>(null);

    // Clients Data
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchClients = useCallback(async () => {
        setLoadingClients(true);
        if (useMockAdmin) {
            setClients(mockClients);
            setLoadingClients(false);
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/admin/clients", {
            headers: {
                "Authorization": `Bearer ${session?.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Error fetching clients:", error);
            setLoadingClients(false);
            return;
        }

        const payload = await response.json();
        setClients(
            (payload.clients || []).map((client: Client) => ({
                id: client.id,
                full_name: client.full_name || "Unknown",
                email: client.email || "No Email",
            }))
        );
        setLoadingClients(false);
    }, [supabase, useMockAdmin]);

    useEffect(() => {
        if (open) {
            void fetchClients();
            // Reset state on open
            setClientId("");
            setStartDate("");
            setEndDate("");
            setPrompt("");
            setGeneratedData(null);
            setCreating(false);
        }
    }, [open, fetchClients]);

    const handleGenerateAI = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            // Estimate days from prompt or default to 3 if not specified
            // For now, we'll ask the AI to infer or just pass a default
            const daysMatch = prompt.match(/(\d+)\s*days?/i);
            const days = daysMatch ? parseInt(daysMatch[1]) : 3;

            const res = await fetch("/api/itinerary/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, days }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate");

            setGeneratedData(data as ItineraryResult);

            // Auto-fill dates if possible (mock for now, usually AI returns relative days)
            // But we can set duration at least in the summary

        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("Failed to generate itinerary. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateTrip = async () => {
        if (!clientId || !startDate || !endDate) {
            alert("Please fill in all required fields (Client and Dates)");
            return;
        }

        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/trips", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    clientId,
                    startDate,
                    endDate,
                    itinerary: {
                        trip_title: generatedData?.trip_title || "New Trip",
                        destination: generatedData?.destination || "TBD",
                        summary: generatedData?.summary || "",
                        duration_days: generatedData?.days?.length || 1,
                        raw_data: { days: generatedData?.days || [] },
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create trip");
            }

            onSuccess();
            onOpenChange(false);

        } catch (error) {
            console.error("Error creating trip:", error);
            alert(error instanceof Error ? error.message : "Failed to create trip. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-serif flex items-center gap-2">
                        {generatedData ? "Review & Confirm Trip" : "Create New Trip"}
                        {generatedData && <Sparkles className="w-5 h-5 text-purple-500" />}
                    </DialogTitle>
                    <DialogDescription>
                        Use AI to generate a complete itinerary or start from scratch.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <User className="w-4 h-4" /> Client
                            </label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                            >
                                <option value="" disabled>Select a client</option>
                                {loadingClients ? (
                                    <option disabled>Loading...</option>
                                ) : (
                                    clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.full_name} ({client.email})
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Start Date
                                </label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> End Date
                                </label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Generation Section */}
                    {!generatedData ? (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 space-y-4">
                            <div className="flex items-center gap-2 text-purple-700 font-semibold">
                                <Sparkles className="w-5 h-5" />
                                <span>Generate Itinerary with AI</span>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. 7 days in Kyoto for a foodie couple..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="bg-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
                                />
                                <Button
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating || !prompt}
                                    className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                                </Button>
                            </div>
                            <p className="text-xs text-purple-600/70">
                                This will create a logical day-by-day plan with activities, locations, and descriptions.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 border rounded-xl p-4 bg-gray-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{generatedData.trip_title}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <MapPin className="w-4 h-4" />
                                        {generatedData.destination}
                                        <Badge variant="secondary" className="ml-2">
                                            {generatedData.days?.length || 0} Days
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setGeneratedData(null)}
                                    className="text-gray-500 hover:text-red-500"
                                >
                                    Start Over
                                </Button>
                            </div>

                            <p className="text-sm text-gray-600 leading-relaxed">
                                {generatedData.summary}
                            </p>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {generatedData.days?.map((day: Day) => (
                                    <div key={day.day_number} className="text-sm border-l-2 border-purple-200 pl-3 py-1">
                                        <span className="font-semibold text-gray-700">Day {day.day_number}: {day.theme}</span>
                                        <ul className="mt-1 space-y-1">
                                            {day.activities?.slice(0, 2).map((act: Activity, i: number) => (
                                                <li key={i} className="text-gray-500 text-xs truncate">• {act.title}</li>
                                            ))}
                                            {day.activities?.length > 2 && <li className="text-gray-400 text-xs italic">+ {day.activities.length - 2} more</li>}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleCreateTrip}
                        disabled={creating || !!(generatedData && (!clientId || !startDate || !endDate))}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {creating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating Trip...
                            </>
                        ) : (
                            "Create Trip"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
