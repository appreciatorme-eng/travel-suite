"use client";

import { Inbox, MessageCircle, UserCircle2 } from "lucide-react";

const tickets = [
    {
        id: "SUP-1042",
        requester: "Liam Walker",
        subject: "Luggage allowance for day 3 flight",
        status: "open",
        updated: "2 hours ago",
    },
    {
        id: "SUP-1037",
        requester: "Ava Chen",
        subject: "Can we add a tea ceremony?",
        status: "pending",
        updated: "Yesterday",
    },
    {
        id: "SUP-1029",
        requester: "Sofia Ramirez",
        subject: "Invoice correction requested",
        status: "resolved",
        updated: "3 days ago",
    },
];

export default function SupportPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f6efe4] flex items-center justify-center">
                    <Inbox className="w-5 h-5 text-[#9c7c46]" />
                </div>
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Support</span>
                    <h1 className="text-2xl font-[var(--font-display)] text-[#1b140a] mt-1">Support Inbox</h1>
                    <p className="text-sm text-[#6f5b3e]">Mock client requests and internal notes.</p>
                </div>
            </div>

            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 overflow-hidden">
                <div className="grid grid-cols-12 border-b border-[#efe2cf] px-6 py-3 text-xs font-semibold text-[#6f5b3e] uppercase">
                    <div className="col-span-3">Requester</div>
                    <div className="col-span-6">Subject</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1 text-right">Updated</div>
                </div>
                <div className="divide-y divide-[#efe2cf]">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="grid grid-cols-12 items-center px-6 py-4">
                            <div className="col-span-3 flex items-center gap-3">
                                <UserCircle2 className="w-8 h-8 text-[#cbb68e]" />
                                <div>
                                    <p className="text-sm font-medium text-[#1b140a]">{ticket.requester}</p>
                                    <p className="text-xs text-[#bda87f]">{ticket.id}</p>
                                </div>
                            </div>
                            <div className="col-span-6 text-sm text-[#6f5b3e] flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-[#cbb68e]" />
                                {ticket.subject}
                            </div>
                            <div className="col-span-2">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                    ticket.status === "open"
                                        ? "bg-[#f1e4d2] text-[#9c7c46]"
                                        : ticket.status === "pending"
                                            ? "bg-[#f6efe4] text-[#6f5b3e]"
                                            : "bg-[#efe2cf] text-[#6f5b3e]"
                                }`}>
                                    {ticket.status}
                                </span>
                            </div>
                            <div className="col-span-1 text-right text-xs text-[#bda87f]">{ticket.updated}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
