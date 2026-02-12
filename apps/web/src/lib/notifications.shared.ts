export function getDriverWhatsAppLink(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function formatDriverAssignmentMessage(data: {
    clientName: string;
    clientPhone?: string;
    pickupTime: string;
    pickupLocation: string;
    activities: Array<{ title: string; duration_minutes?: number } | { title: string; duration?: string }>;
    hotelName: string;
}): string {
    const activitiesList = data.activities
        .map((activity, index) => {
            const durationMinutes =
                "duration_minutes" in activity ? activity.duration_minutes : undefined;
            const durationText =
                durationMinutes !== undefined
                    ? `${durationMinutes} mins`
                    : "duration" in activity && activity.duration
                    ? activity.duration
                    : "";
            return `${index + 1}. ${activity.title}${durationText ? ` (${durationText})` : ""}`;
        })
        .join("\n");

    return `📋 *New Trip Assignment*

👤 Client: ${data.clientName}
${data.clientPhone ? `📱 Phone: ${data.clientPhone}` : ""}
🕐 Pickup: ${data.pickupTime}
📍 Location: ${data.pickupLocation}

*Today's Route:*
${activitiesList || "No activities scheduled."}

🏨 Drop-off: ${data.hotelName}

Please confirm receipt of this assignment.`;
}

export function formatDailyBriefingMessage(data: {
    dayNumber: number;
    driverName: string;
    driverPhone: string;
    vehicleType?: string;
    vehiclePlate?: string;
    pickupTime: string;
    pickupLocation: string;
    activities: Array<{ title: string; start_time?: string; duration_minutes?: number }>;
    hotelName: string;
}): string {
    const activitiesList = data.activities
        .map((activity) => {
            const time = activity.start_time ? `${activity.start_time} - ` : "";
            const duration = activity.duration_minutes ? ` (${activity.duration_minutes} mins)` : "";
            return `• ${time}${activity.title}${duration}`;
        })
        .join("\n");

    return `🌅 *Day ${data.dayNumber} Briefing*

🚗 *Your Driver Today:*
${data.driverName}
📱 ${data.driverPhone}
${data.vehicleType ? `🚙 ${data.vehicleType}` : ""}
${data.vehiclePlate ? `🔢 ${data.vehiclePlate}` : ""}

⏰ Pickup: ${data.pickupTime} at ${data.pickupLocation}

*Today's Schedule:*
${activitiesList || "No activities scheduled."}

🏨 Tonight: ${data.hotelName}

Have a great day!`;
}

export function formatClientWhatsAppMessage(data: {
    clientName: string;
    tripTitle?: string | null;
    destination?: string | null;
    startDate?: string | null;
    body?: string | null;
}): string {
    const greeting = `Hi ${data.clientName || "there"},`;
    const tripLine = data.tripTitle || data.destination
        ? `Trip: ${data.tripTitle || data.destination}`
        : "Trip update";
    const dateLine = data.startDate ? `Start date: ${data.startDate}` : "";
    const bodyLine = data.body ? data.body : "We have an update on your itinerary.";

    return [
        greeting,
        "",
        tripLine,
        dateLine,
        "",
        bodyLine,
        "",
        "Reply here if you have any questions.",
    ]
        .filter(Boolean)
        .join("\n");
}
