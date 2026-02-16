"use client";

import { useEffect, useState } from "react";
import { Cloud, Sun, CloudRain, Snowflake, Thermometer, Droplets } from "lucide-react";

interface WeatherForecast {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    weatherCode: number;
    weatherDescription: string;
}

interface WeatherData {
    location: string;
    forecast: WeatherForecast[];
}

interface WeatherWidgetProps {
    destination: string;
    days?: number;
    compact?: boolean;
}

function getWeatherIcon(code: number, className: string = "w-6 h-6") {
    if (code === 0) return <Sun className={`${className} text-yellow-500`} />;
    if (code <= 3) return <Cloud className={`${className} text-gray-400`} />;
    if (code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
    if (code <= 86) return <Snowflake className={`${className} text-blue-200`} />;
    return <CloudRain className={`${className} text-purple-400`} />;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}

export default function WeatherWidget({ destination, days = 7, compact = false }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchWeather() {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`/api/weather?location=${encodeURIComponent(destination)}&days=${days}`);

                if (!res.ok) {
                    throw new Error("Failed to fetch weather");
                }

                const data = await res.json();
                setWeather(data);
            } catch (err) {
                setError("Could not load weather data");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        if (destination) {
            fetchWeather();
        }
    }, [destination, days]);

    if (loading) {
        return (
            <div className={`bg-white/50 rounded-xl border border-gray-100 p-4 ${compact ? 'h-16' : 'h-32'} animate-pulse`}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full" />
                    <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
            </div>
        );
    }

    if (error || !weather) {
        return null; // Gracefully hide if weather not available
    }

    if (compact) {
        // Compact view - current day only
        const today = weather.forecast[0];
        if (!today) return null;

        return (
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-4 h-4 text-sky-600" />
                    <span className="font-semibold text-sm text-gray-700">Weather Forecast</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{weather.location}</span>
                    <div className="flex items-center gap-2">
                        {getWeatherIcon(today.weatherCode, "w-5 h-5")}
                        <span className="font-medium text-gray-900">{today.tempMax}° / {today.tempMin}°C</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-100 p-5">
            <div className="flex items-center gap-2 mb-4">
                <Thermometer className="w-5 h-5 text-sky-600" />
                <h3 className="font-semibold text-gray-800">Weather Forecast</h3>
                <span className="text-sm text-gray-500">• {weather.location}</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {weather.forecast.slice(0, 7).map((day, idx) => (
                    <div
                        key={day.date}
                        className={`text-center p-2 rounded-lg ${idx === 0 ? 'bg-white shadow-sm' : ''}`}
                    >
                        <div className="text-xs text-gray-500 mb-1">
                            {idx === 0 ? "Today" : formatDate(day.date).split(",")[0]}
                        </div>
                        <div className="flex justify-center mb-1">
                            {getWeatherIcon(day.weatherCode, "w-6 h-6")}
                        </div>
                        <div className="text-sm font-semibold text-gray-800">
                            {day.tempMax}°
                        </div>
                        <div className="text-xs text-gray-400">
                            {day.tempMin}°
                        </div>
                        {day.precipitation > 0 && (
                            <div className="flex items-center justify-center gap-0.5 mt-1 text-xs text-blue-500">
                                <Droplets className="w-3 h-3" />
                                {Math.round(day.precipitation)}mm
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
