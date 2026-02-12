
"use client";

import { useState } from "react";
import { Send, Check, Phone } from "lucide-react";

interface ShareItineraryProps {
    tripTitle: string;
}

export default function ShareItinerary({ tripTitle }: ShareItineraryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        if (!phoneNumber) return;
        setLoading(true);

        try {
            const res = await fetch("/api/itinerary/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phoneNumber,
                    tripTitle
                }),
            });

            if (res.ok) {
                setSent(true);
                setTimeout(() => {
                    setSent(false);
                    setIsOpen(false);
                    setPhoneNumber("");
                }, 3000);
            } else {
                alert("Failed to send. Check console.");
            }
        } catch (e) {
            console.error(e);
            alert("Error sending message");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <button disabled className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2 border border-green-200">
                <Check className="w-4 h-4" /> Sent to Client
            </button>
        );
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 bg-white text-secondary hover:bg-gray-50 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2 transition-all"
            >
                <Send className="w-4 h-4" /> Share via WhatsApp
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-primary shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="pl-2 text-gray-400">
                <Phone className="w-4 h-4" />
            </div>
            <input
                type="tel"
                placeholder="+1 555 000 0000"
                className="w-40 text-sm outline-none bg-transparent placeholder:text-gray-300"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoFocus
            />
            <button
                onClick={handleSend}
                disabled={loading}
                className="p-2 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 transition-all text-xs font-bold"
            >
                {loading ? "..." : "SEND"}
            </button>
            <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
            >
                ✕
            </button>
        </div>
    );
}
