export type WelcomeEmailResult = {
    success: boolean;
    skipped?: boolean;
    reason?: string;
    messageId?: string;
};

type WelcomeEmailPayload = {
    toEmail: string;
    fullName?: string | null;
    loginUrl?: string | null;
};

export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<WelcomeEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.WELCOME_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
        return { success: false, skipped: true, reason: "missing_email_provider_config" };
    }

    const subject = "Welcome to Travel Suite";
    const greetingName = payload.fullName?.trim() || "there";
    const loginUrl = payload.loginUrl || "https://your-app.vercel.app";
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
        <h2>Welcome, ${greetingName}!</h2>
        <p>Your Travel Suite account is ready. You can start planning your next trip and receive updates directly in the app.</p>
        <p><a href="${loginUrl}" style="display:inline-block;padding:10px 16px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:6px;">Open Travel Suite</a></p>
        <p style="color:#64748b">If you have any questions, just reply to this email.</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: fromEmail,
            to: payload.toEmail,
            subject,
            html,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, reason: errorBody || "email_send_failed" };
    }

    const result = await response.json().catch(() => ({}));
    return { success: true, messageId: result?.id };
}
