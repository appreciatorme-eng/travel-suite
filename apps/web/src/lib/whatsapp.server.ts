import "server-only";

export interface WhatsAppSendResult {
    success: boolean;
    provider: "meta_cloud_api";
    messageId?: string;
    error?: string;
}

export interface WhatsAppLocationMessage {
    waId: string;
    messageId: string;
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    timestamp: string;
}

function normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, "").replace(/^00/, "+");
}

function normalizeWaId(waId: string): string {
    return waId.replace(/\D/g, "");
}

async function callMetaWhatsAppApi(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneNumberId) {
        return {
            success: false,
            provider: "meta_cloud_api",
            error: "WhatsApp provider not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID missing)",
        };
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const body = await response.json();
        if (!response.ok) {
            return {
                success: false,
                provider: "meta_cloud_api",
                error: body?.error?.message || `HTTP ${response.status}`,
            };
        }

        return {
            success: true,
            provider: "meta_cloud_api",
            messageId: body?.messages?.[0]?.id,
        };
    } catch (error) {
        return {
            success: false,
            provider: "meta_cloud_api",
            error: error instanceof Error ? error.message : "Unknown WhatsApp error",
        };
    }
}

export async function sendWhatsAppText(phone: string, message: string): Promise<WhatsAppSendResult> {
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
        return {
            success: false,
            provider: "meta_cloud_api",
            error: "Invalid phone number",
        };
    }

    return callMetaWhatsAppApi({
        messaging_product: "whatsapp",
        to: normalizedPhone.replace("+", ""),
        type: "text",
        text: {
            preview_url: false,
            body: message,
        },
    });
}

export async function sendWhatsAppTemplate(
    phone: string,
    templateName: string,
    bodyParams: string[],
    languageCode = "en"
): Promise<WhatsAppSendResult> {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
        return {
            success: false,
            provider: "meta_cloud_api",
            error: "Invalid phone number",
        };
    }

    if (!templateName) {
        return {
            success: false,
            provider: "meta_cloud_api",
            error: "Missing template name",
        };
    }

    return callMetaWhatsAppApi({
        messaging_product: "whatsapp",
        to: normalizedPhone.replace("+", ""),
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
            components: [
                {
                    type: "body",
                    parameters: bodyParams.map((value) => ({
                        type: "text",
                        text: value,
                    })),
                },
            ],
        },
    });
}

export function parseWhatsAppLocationMessages(payload: unknown): WhatsAppLocationMessage[] {
    const body = payload as {
        entry?: Array<{ changes?: Array<{ value?: { messages?: Array<Record<string, unknown>> } }> }>;
    };

    const entries = body.entry || [];
    const output: WhatsAppLocationMessage[] = [];

    for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
            const messages = change.value?.messages || [];
            for (const message of messages) {
                if (message.type !== "location") continue;

                const location = message.location as Record<string, unknown> | undefined;
                const from = typeof message.from === "string" ? message.from : "";
                const messageId = typeof message.id === "string" ? message.id : "";
                const timestamp = typeof message.timestamp === "string" ? message.timestamp : "";

                const latitude = Number(location?.latitude);
                const longitude = Number(location?.longitude);
                if (!from || !messageId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
                    continue;
                }

                output.push({
                    waId: normalizeWaId(from),
                    messageId,
                    latitude,
                    longitude,
                    name: typeof location?.name === "string" ? location.name : undefined,
                    address: typeof location?.address === "string" ? location.address : undefined,
                    timestamp,
                });
            }
        }
    }

    return output;
}
