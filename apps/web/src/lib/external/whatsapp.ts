
/**
 * WhatsApp Cloud API Wrapper (Mock)
 * 
 * In a production environment, this would use the Facebook Graph API.
 * https://developers.facebook.com/docs/whatsapp/cloud-api
 */

// Mock configuration check (placeholders for future real integration)
const _WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "mock_token";
const _WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "mock_phone_id";
void _WHATSAPP_TOKEN;
void _WHATSAPP_PHONE_ID;

export async function sendItineraryToWhatsApp(phoneNumber: string, itineraryTitle: string, pdfUrl: string): Promise<boolean> {
    console.log(`[WhatsApp Mock] Preparing to send itinerary "${itineraryTitle}" to ${phoneNumber}`);

    // Validate phone number format (basic check)
    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
        console.error("[WhatsApp Mock] Invalid phone number format");
        return false;
    }

    // In real implementation:
    // const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`;
    // const payload: WhatsAppMessagePayload = {
    //     messaging_product: "whatsapp",
    //     to: phoneNumber,
    //     type: "template",
    //     template: {
    //         name: "itinerary_share",
    //         language: { code: "en_US" },
    //         components: [
    //             {
    //                 type: "body",
    //                 parameters: [
    //                     { type: "text", text: itineraryTitle },
    //                     { type: "text", text: pdfUrl }
    //                 ]
    //             }
    //         ]
    //     }
    // };
    // await fetch(url, { ... });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`[WhatsApp Mock] 🚀 Successfully sent template 'itinerary_share' to ${phoneNumber}`);
    console.log(`[WhatsApp Mock] > Title: ${itineraryTitle}`);
    console.log(`[WhatsApp Mock] > Link: ${pdfUrl}`);

    return true;
}
