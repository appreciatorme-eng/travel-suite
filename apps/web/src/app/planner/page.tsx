"use client";

import { useState } from "react";
import { Loader2, MapPin, Calendar, Wallet, Sparkles, Plane } from "lucide-react";
import dynamic from "next/dynamic";
import DownloadPDFButton from "@/components/pdf/DownloadPDFButton";
import ShareItinerary from "./ShareItinerary";
import SaveItineraryButton from "./SaveItineraryButton";
import WeatherWidget from "@/components/WeatherWidget";
import CurrencyConverter from "@/components/CurrencyConverter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Day, ItineraryResult } from "@/types/itinerary";
import Image from "next/image";

// Dynamic import for Leaflet (SSR incompatible)
const ItineraryMap = dynamic(() => import("@/components/map/ItineraryMap"), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
});

const BUDGET_OPTIONS = [
    { value: "Budget-Friendly", label: "💰 Budget-Friendly" },
    { value: "Moderate", label: "⚖️ Moderate" },
    { value: "Luxury", label: "💎 Luxury" },
    { value: "Ultra-High End", label: "👑 Ultra-High End" },
];

const INTEREST_OPTIONS = [
    '🎨 Art & Culture', '🍽️ Food & Dining', '🏞️ Nature',
    '🛍️ Shopping', '🏰 History', '👨‍👩‍👧‍👦 Family'
];


export default function PlannerPage() {
    const [prompt, setPrompt] = useState("");
    const [days, setDays] = useState(3);
    const [budget, setBudget] = useState("Moderate");
    const [interests, setInterests] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ItineraryResult | null>(null);
    const [error, setError] = useState("");

    const [images, setImages] = useState<Record<string, string | null>>({});

    const fetchImagesForItinerary = async (itineraryData: ItineraryResult) => {
        const locations: string[] = [];
        itineraryData.days.forEach((day) => {
            day.activities.forEach((act) => {
                if (act.location) locations.push(act.location);
            });
        });

        const imageMap: Record<string, string | null> = {};

        // Fetch in parallel but limited to avoid rate limits if necessary
        // For now, simple parallel fetch is fine for small itineraries
        await Promise.all(locations.map(async (loc) => {
            // Simple cache check if needed, but here we just fetch
            try {
                const url = await fetch(`/api/images?query=${encodeURIComponent(loc)}`).then(r => r.json()).then(d => d.url);
                imageMap[loc] = url;
            } catch (error) {
                console.error("Failed to load image for", loc, error);
                imageMap[loc] = null;
            }
        }));

        setImages(imageMap);
    };

    const toggleInterest = (interest: string) => {
        setInterests(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        setError("");
        setResult(null);
        setImages({});

        // Construct a rich prompt from the form data
        const interestString = interests.length > 0
            ? ` focusing on ${interests.join(", ")}`
            : "";
        const finalPrompt = `Create a ${budget} ${days}-day itinerary for ${prompt}${interestString}. Include specific practical details.`;

        try {
            const res = await fetch("/api/itinerary/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: finalPrompt, days }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate");

            setResult(data);

            // Trigger image fetch non-blocking
            fetchImagesForItinerary(data);

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to generate itinerary. Try again.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 pb-20">
            <div className="max-w-4xl mx-auto px-6 py-10">
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-serif text-secondary mb-3 tracking-tight">GoBuddy Planner</h1>
                    <p className="text-gray-500 text-lg font-light">Design your perfect trip with the power of AI</p>
                </div>

                {!result ? (
                    <Card className="border-gray-100 shadow-xl bg-white/80 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-sky-50/50 border-b border-gray-100 pb-6">
                            <CardTitle className="text-xl flex items-center gap-2 text-secondary">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Start your adventure
                            </CardTitle>
                            <CardDescription>
                                Tell us where you want to go, and we&apos;ll handle the rest.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 space-y-8">
                            {/* Destination Input */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" /> Where to?
                                </label>
                                <Input
                                    type="text"
                                    className="h-14 text-lg bg-gray-50/50 border-gray-200 focus-visible:ring-primary pl-4"
                                    placeholder="e.g. Paris, Tokyo, New York"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Duration Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" /> Duration (Days)
                                    </label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={14}
                                        value={days}
                                        onChange={(e) => setDays(Number(e.target.value))}
                                        className="h-12 bg-gray-50/50 border-gray-200 focus-visible:ring-primary"
                                    />
                                </div>

                                {/* Budget Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-primary" /> Budget
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {BUDGET_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setBudget(option.value)}
                                                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 border ${budget === option.value
                                                    ? 'bg-primary text-white border-primary shadow-md transform scale-[1.02]'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Interests Input */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-2">
                                    <Plane className="w-4 h-4 text-primary" /> Interests
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {INTEREST_OPTIONS.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleInterest(tag)}
                                            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${interests.includes(tag)
                                                ? 'bg-secondary text-white border-secondary shadow-sm transform scale-105'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-secondary hover:text-secondary hover:bg-gray-50'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <Button
                                onClick={handleGenerate}
                                disabled={loading || !prompt}
                                className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin w-5 h-5 mr-2" />
                                        Crafting your Journey...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Generate Dream Itinerary
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Actions Bar */}
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-4 z-20 backdrop-blur-md bg-white/80">
                            <Button
                                variant="ghost"
                                onClick={() => setResult(null)}
                                className="text-gray-500 hover:text-secondary"
                            >
                                ← Start Over
                            </Button>
                            <div className="flex gap-2">
                                <SaveItineraryButton
                                    itineraryData={result}
                                    destination={prompt}
                                    days={days}
                                    budget={budget}
                                    interests={interests}
                                />
                                <ShareItinerary tripTitle={result.trip_title} />
                                <DownloadPDFButton
                                    data={result}
                                    fileName={`${result.trip_title.replace(/\s+/g, '_')}_Itinerary.pdf`}
                                />
                            </div>
                        </div>

                        {/* Itinerary Header */}
                        <div className="text-center space-y-4">
                            <Badge variant="outline" className="px-4 py-1 text-base border-primary/20 bg-primary/5 text-primary">
                                {result.duration_days} Days in {result.destination}
                            </Badge>
                            <h2 className="text-4xl font-serif text-secondary leading-tight">{result.trip_title}</h2>
                            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">{result.summary}</p>
                        </div>

                        {/* Map & Widgets */}
                        <div className="grid lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 h-80 rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative">
                                <ItineraryMap
                                    activities={result.days.flatMap((day: Day) => day.activities)}
                                />
                            </div>
                            <div className="space-y-6">
                                <Card className="border-gray-200 shadow-md h-full">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Destination Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-4">
                                        <WeatherWidget destination={result.destination} days={days} />
                                        <Separator />
                                        <CurrencyConverter compact />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Day by Day */}
                        <div className="space-y-8">
                            {result.days.map((day: Day) => (
                                <Card key={day.day_number} className="overflow-hidden border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                                    <div className="bg-gradient-to-r from-secondary/5 to-transparent px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-secondary flex items-center gap-3">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-white text-sm font-bold shadow-sm">
                                                {day.day_number}
                                            </span>
                                            {day.theme}
                                        </h3>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-gray-100">
                                            {day.activities.map((act: Activity, idx: number) => (
                                                <div key={idx} className="p-6 hover:bg-gray-50/50 transition-colors">
                                                    <div className="flex flex-col md:flex-row gap-5">
                                                        <div className="flex items-start gap-3 w-24 shrink-0 pt-1">
                                                            <Badge variant="outline" className="font-mono text-xs bg-gray-50">
                                                                {act.time}
                                                            </Badge>
                                                        </div>

                                                        <div className="md:w-32 md:h-24 w-full h-48 rounded-lg overflow-hidden shrink-0 shadow-sm ring-1 ring-gray-100 bg-gradient-to-br from-gray-100 to-gray-200">
                                                            {images[act.location] ? (
                                                                <Image
                                                                    src={images[act.location]!}
                                                                    alt={act.location}
                                                                    width={128}
                                                                    height={96}
                                                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <MapPin className="w-8 h-8 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-start justify-between">
                                                                <h4 className="text-lg font-semibold text-gray-900 leading-tight">
                                                                    {act.title}
                                                                </h4>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                                                {act.location}
                                                            </div>

                                                            <p className="text-gray-600 text-sm leading-relaxed">
                                                                {act.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="fixed bottom-6 right-6 p-4 bg-red-white border border-red-200 text-red-600 rounded-xl shadow-2xl animate-in slide-in-from-right duration-500 flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        {error}
                        <button onClick={() => setError("")} className="ml-2 hover:bg-red-50 p-1 rounded-full"><span className="sr-only">Dismiss</span>×</button>
                    </div>
                )}
            </div>
        </main>
    );
}
