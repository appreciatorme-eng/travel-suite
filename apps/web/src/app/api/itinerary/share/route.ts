
import { NextRequest, NextResponse } from "next/server";
import { sendItineraryToWhatsApp } from "@/lib/external/whatsapp";
import { z } from "zod";

const ShareSchema = z.object({
    phoneNumber: z.string().min(10, "Phone number must be valid"),
    tripTitle: z.string(),
    itineraryData: z.any(), // In a real app we'd upload PDF and pass URL. Here we mock it.
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phoneNumber, tripTitle } = ShareSchema.parse(body);

        // In a real app:
        // 1. Generate PDF buffer on server
        // 2. Upload to S3/Supabase Storage -> get Public URL
        // 3. Send URL via WhatsApp

        // For Mock: We just pass a fake URL
        const mockPdfUrl = `https://travelsuite.app/itineraries/${Date.now()}.pdf`;

        const success = await sendItineraryToWhatsApp(phoneNumber, tripTitle, mockPdfUrl);

        if (!success) {
            return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Sent successfully" });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
