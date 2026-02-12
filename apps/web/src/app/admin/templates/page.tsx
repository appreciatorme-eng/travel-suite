"use client";

import { Wand2, Bell, MessageCircle, Save } from "lucide-react";

const templates = [
    {
        id: "tmpl-1",
        title: "Itinerary Update",
        channel: "Push",
        subject: "Your itinerary is ready",
        body: "Hi {{client_name}}, your updated itinerary for {{destination}} is ready.",
    },
    {
        id: "tmpl-2",
        title: "Driver Assigned",
        channel: "WhatsApp",
        subject: "Driver confirmation",
        body: "Your driver {{driver_name}} will pick you up at {{pickup_time}}.",
    },
    {
        id: "tmpl-3",
        title: "Payment Reminder",
        channel: "Email",
        subject: "Deposit due soon",
        body: "This is a reminder that your deposit is due on {{due_date}}.",
    },
];

export default function TemplatesPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f6efe4] flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-[#9c7c46]" />
                </div>
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Templates</span>
                    <h1 className="text-2xl font-[var(--font-display)] text-[#1b140a] mt-1">Notification Templates</h1>
                    <p className="text-sm text-[#6f5b3e]">Mock templates for push, email, and WhatsApp.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div key={template.id} className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm font-semibold text-[#1b140a]">{template.title}</p>
                                <p className="text-xs text-[#bda87f]">{template.channel}</p>
                            </div>
                            {template.channel === "Push" ? (
                                <Bell className="w-4 h-4 text-[#9c7c46]" />
                            ) : (
                                <MessageCircle className="w-4 h-4 text-[#9c7c46]" />
                            )}
                        </div>
                        <div className="text-xs text-[#bda87f]">Subject</div>
                        <div className="text-sm text-[#1b140a] mb-3">{template.subject}</div>
                        <div className="text-xs text-[#bda87f]">Body</div>
                        <div className="text-sm text-[#6f5b3e] bg-[#f8f1e6] rounded-lg p-3">{template.body}</div>
                        <button className="mt-4 w-full rounded-lg border border-[#eadfcd] px-4 py-2 text-sm font-semibold text-[#6f5b3e] flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Template
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
