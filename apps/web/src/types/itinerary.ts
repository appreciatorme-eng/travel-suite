export interface Coordinate {
    lat: number;
    lng: number;
}

export interface Activity {
    time: string;
    title: string;
    description: string;
    location: string;
    coordinates?: Coordinate;
    duration?: string;
    cost?: string;
    image?: string;
}

export interface Day {
    day_number: number;
    theme: string;
    activities: Activity[];
}

export interface ItineraryResult {
    trip_title: string;
    description?: string;
    destination: string;
    duration_days: number;
    summary: string;
    days: Day[];
    budget?: string;
    interests?: string[];
    tips?: string[];
}
