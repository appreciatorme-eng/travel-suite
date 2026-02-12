import { NextRequest, NextResponse } from "next/server";
import { getWeatherForLocation, getWeatherForLocations } from "@/lib/external/weather";

/**
 * GET /api/weather?location=Paris
 * GET /api/weather?locations=Paris,Rome,Barcelona
 * 
 * Returns weather forecast for location(s)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get("location");
    const locations = searchParams.get("locations");
    const days = parseInt(searchParams.get("days") || "7", 10);

    // Validate days parameter
    const forecastDays = Math.min(Math.max(days, 1), 16); // Open-Meteo supports up to 16 days

    try {
        // Single location
        if (location) {
            const weather = await getWeatherForLocation(location, forecastDays);

            if (!weather) {
                return NextResponse.json(
                    { error: `Could not find weather data for: ${location}` },
                    { status: 404 }
                );
            }

            return NextResponse.json(weather);
        }

        // Multiple locations
        if (locations) {
            const locationList = locations.split(",").map(l => l.trim()).filter(Boolean);

            if (locationList.length === 0) {
                return NextResponse.json(
                    { error: "No valid locations provided" },
                    { status: 400 }
                );
            }

            if (locationList.length > 10) {
                return NextResponse.json(
                    { error: "Maximum 10 locations per request" },
                    { status: 400 }
                );
            }

            const weatherData = await getWeatherForLocations(locationList, forecastDays);

            return NextResponse.json({
                locations: weatherData,
                requested: locationList,
                found: Object.keys(weatherData),
            });
        }

        return NextResponse.json(
            { error: "Provide 'location' or 'locations' query parameter" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Weather API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch weather data" },
            { status: 500 }
        );
    }
}
