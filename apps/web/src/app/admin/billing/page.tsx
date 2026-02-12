"use client";

import { FileText, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

const invoices = [
    { id: "INV-2026-021", date: "2026-02-05", amount: "$2,400", status: "paid" },
    { id: "INV-2026-020", date: "2026-01-05", amount: "$2,400", status: "paid" },
    { id: "INV-2025-012", date: "2025-12-05", amount: "$1,800", status: "overdue" },
];

const plans = [
    {
        name: "Starter",
        price: "$99 / mo",
        features: ["Up to 15 clients", "Basic notifications", "Email support"],
        active: false,
    },
    {
        name: "Pro",
        price: "$249 / mo",
        features: ["Unlimited clients", "Advanced notifications", "Priority support"],
        active: true,
    },
    {
        name: "Enterprise",
        price: "Custom",
        features: ["Dedicated success team", "White-label branding", "Custom SLAs"],
        active: false,
    },
];

export default function BillingPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f6efe4] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#9c7c46]" />
                </div>
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Billing</span>
                    <h1 className="text-2xl font-[var(--font-display)] text-[#1b140a] mt-1">Billing</h1>
                    <p className="text-sm text-[#6f5b3e]">Mock billing data and invoice history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.name} className={`rounded-2xl border ${plan.active ? "border-[#c4a870]" : "border-[#eadfcd]"} bg-white/90 p-6`}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-[var(--font-display)] text-[#1b140a]">{plan.name}</h2>
                            {plan.active && <span className="text-xs font-semibold text-[#9c7c46]">Current</span>}
                        </div>
                        <p className="text-2xl font-semibold text-[#1b140a] mt-2">{plan.price}</p>
                        <ul className="mt-4 space-y-2 text-sm text-[#6f5b3e]">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#9c7c46]" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-semibold ${
                                plan.active ? "bg-[#1b140a] text-[#f5e7c6]" : "border border-[#eadfcd] text-[#6f5b3e]"
                            }`}
                        >
                            {plan.active ? "Manage Plan" : "Select Plan"}
                        </button>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-[var(--font-display)] text-[#1b140a]">Invoice History</h2>
                    <button className="flex items-center gap-2 text-sm text-[#6f5b3e]">
                        <CreditCard className="w-4 h-4" />
                        Update payment method
                    </button>
                </div>
                <div className="space-y-3">
                    {invoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-[#efe2cf] bg-[#f8f1e6] px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-[#1b140a]">{invoice.id}</p>
                                <p className="text-xs text-[#6f5b3e]">{invoice.date}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-[#1b140a]">{invoice.amount}</span>
                                {invoice.status === "paid" ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9c7c46]">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Paid
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                                        <AlertCircle className="w-3 h-3" />
                                        Overdue
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
