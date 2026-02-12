import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { z } from 'zod';

// Schema for input validation
const RequestSchema = z.object({
    prompt: z.string().min(2, "Prompt must be at least 2 characters"),
    days: z.number().min(1).max(14).default(3),
});

// JSON Schema for Gemini Structure Output
const itinerarySchema: Schema = {
    description: "Travel itinerary",
    type: SchemaType.OBJECT,
    properties: {
        trip_title: { type: SchemaType.STRING, description: "A catchy title for the trip" },
        destination: { type: SchemaType.STRING, description: "Primary destination city/country" },
        summary: { type: SchemaType.STRING, description: "Brief overview of the vibe" },
        days: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    day_number: { type: SchemaType.NUMBER },
                    theme: { type: SchemaType.STRING, description: "Theme for the day (e.g., 'Historical Sightseeing')" },
                    activities: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                time: { type: SchemaType.STRING, description: "Morning/Afternoon/Evening or specific time" },
                                title: { type: SchemaType.STRING },
                                description: { type: SchemaType.STRING },
                                location: { type: SchemaType.STRING, description: "Name of the place" },
                                coordinates: {
                                    type: SchemaType.OBJECT,
                                    description: "Lat/Lng mostly for map placement (estimate)",
                                    properties: {
                                        lat: { type: SchemaType.NUMBER },
                                        lng: { type: SchemaType.NUMBER }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    required: ["trip_title", "destination", "days"]
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, days } = RequestSchema.parse(body);

        const apiKey =
            process.env.GOOGLE_API_KEY ||
            process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing Google API Key (GOOGLE_API_KEY)" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: itinerarySchema,
            },
        });

        const finalPrompt = `
      Act as an expert luxury travel planner. 
      Create a ${days}-day itinerary for the following request: "${prompt}".
      Ensure the itinerary is logical, geographically efficient, and includes specific real-world locations.
      For coordinates, provide a rough estimate for the city/location.
    `;

        const result = await model.generateContent(finalPrompt);
        const responseText = result.response.text();
        const itinerary = JSON.parse(responseText);

        return NextResponse.json(itinerary);

    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate itinerary", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
