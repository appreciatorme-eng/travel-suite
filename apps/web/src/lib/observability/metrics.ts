export async function captureOperationalMetric(
    event: string,
    properties: Record<string, unknown>
): Promise<void> {
    const apiKey = process.env.POSTHOG_PROJECT_API_KEY || process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || "https://app.posthog.com";

    if (!apiKey) return;

    try {
        await fetch(`${host.replace(/\/$/, "")}/capture/`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                event,
                distinct_id: "travel-suite-server",
                properties: {
                    ...properties,
                    source: "api",
                    timestamp: new Date().toISOString(),
                },
            }),
        });
    } catch {
        // Metrics are best-effort and must never fail the request path.
    }
}
