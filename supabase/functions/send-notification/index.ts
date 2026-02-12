import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


function logEvent(level: "info" | "warn" | "error", message: string, context: Record<string, unknown> = {}) {
    console.log(
        JSON.stringify({
            level,
            message,
            timestamp: new Date().toISOString(),
            ...context,
        })
    );
}

interface NotificationPayload {
    user_id: string;
    title: string;
    body: string;
    trip_id?: string;
    notification_type?: string;
    data?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            }
        });
    }

    try {
        // --- JWT Verification ---
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
                headers: { "Content-Type": "application/json" },
                status: 401,
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            logEvent("warn", "Unauthorized notification request", { error: authError?.message });
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                headers: { "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Verify caller is admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "admin") {
            logEvent("warn", "Non-admin attempted to send notification", { user_id: user.id });
            return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
                headers: { "Content-Type": "application/json" },
                status: 403,
            });
        }

        logEvent("info", "Authenticated notification request", { admin_id: user.id });
        // --- End JWT Verification ---

        const { user_id, title, body, trip_id, notification_type, data } = await req.json() as NotificationPayload;

        if (!user_id || !title || !body) {
            return new Response(JSON.stringify({ error: "user_id, title, and body are required" }), {
                headers: { "Content-Type": "application/json" },
                status: 400,
            });
        }

        // 1. Get user's push tokens
        const { data: tokens, error: tokenError } = await supabase
            .from("push_tokens")
            .select("fcm_token")
            .eq("user_id", user_id)
            .eq("is_active", true);

        if (tokenError) throw tokenError;
        if (!tokens || tokens.length === 0) {
            logEvent("warn", "No active tokens for user", { user_id });
            // Log that we couldn't deliver
            if (trip_id) {
                await supabase.from("notification_logs").insert({
                    trip_id,
                    recipient_id: user_id,
                    recipient_type: "client",
                    notification_type: notification_type || "trip_confirmed",
                    title,
                    body,
                    status: "failed",
                    error_message: "No active push tokens",
                    sent_at: new Date().toISOString(),
                });
            }
            return new Response(JSON.stringify({ message: "No active tokens for user" }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 2. Get Google access token for FCM v1 API
        const accessToken = await getGoogleAccessToken();
        const results = [];

        for (const token of tokens) {
            const fcmResponse = await fetch(
                `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        message: {
                            token: token.fcm_token,
                            notification: { title, body },
                            data: data || {},
                            android: {
                                priority: "high",
                            },
                            apns: {
                                payload: {
                                    aps: {
                                        sound: "default",
                                        badge: 1,
                                    },
                                },
                            },
                        }
                    }),
                }
            );

            const result = await fcmResponse.json();
            results.push(result);

            // Deactivate invalid tokens
            if (result.error?.code === 404 || result.error?.code === 400) {
                logEvent("warn", "Deactivating invalid FCM token", { user_id });
                await supabase
                    .from("push_tokens")
                    .update({ is_active: false })
                    .eq("fcm_token", token.fcm_token);
            }
        }

        // 3. Log the notification
        const success = results.some((r: Record<string, unknown>) => !r.error);
        if (trip_id) {
            await supabase.from("notification_logs").insert({
                trip_id,
                recipient_id: user_id,
                recipient_type: "client",
                notification_type: notification_type || "trip_confirmed",
                title,
                body,
                status: success ? "sent" : "failed",
                error_message: success ? null : JSON.stringify(results),
                sent_at: new Date().toISOString(),
            });
        }

        logEvent("info", "Notification send completed", {
            user_id,
            trip_id: trip_id || null,
            success,
            delivery_count: tokens.length,
        });

        return new Response(JSON.stringify({ success, results }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: unknown) {
        logEvent("error", "Notification send failed", {
            error_message: error instanceof Error ? error.message : String(error),
        });
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});

async function getGoogleAccessToken(): Promise<string> {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    const now = Math.floor(Date.now() / 1000);

    // Build JWT header and payload
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/cloud-platform",
    };

    // Import the private key
    const key = await importPrivateKey(serviceAccount.private_key);

    // Base64url encode helper
    const b64url = (data: Uint8Array): string => {
        let binary = "";
        for (const byte of data) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };

    const encoder = new TextEncoder();
    const headerB64 = b64url(encoder.encode(JSON.stringify(header)));
    const payloadB64 = b64url(encoder.encode(JSON.stringify(payload)));
    const signingInput = `${headerB64}.${payloadB64}`;

    // Sign with RSA-SHA256
    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        encoder.encode(signingInput)
    );
    const signatureB64 = b64url(new Uint8Array(signature));
    const jwt = `${signingInput}.${signatureB64}`;

    // Exchange JWT for access token
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });

    const tokenBody = await response.json();
    if (tokenBody.error) {
        throw new Error(`Failed to get access token: ${tokenBody.error_description || tokenBody.error}`);
    }
    return tokenBody.access_token;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const normalizedPem = pem.replace(/\\n/g, "\n").trim();

    let base64Der = "";
    if (normalizedPem.includes(pemHeader) && normalizedPem.includes(pemFooter)) {
        base64Der = normalizedPem.substring(
            normalizedPem.indexOf(pemHeader) + pemHeader.length,
            normalizedPem.indexOf(pemFooter)
        );
    } else {
        // Allow raw base64 DER fallback for secret formats that strip PEM headers.
        base64Der = normalizedPem;
    }

    const sanitized = base64Der.replace(/[\s\r\n]/g, "");
    if (!sanitized) {
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT private_key format");
    }

    const binaryDerString = atob(sanitized);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    return crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );
}
