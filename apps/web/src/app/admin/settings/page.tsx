"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Settings,
    Save,
    Building2,
    Globe,
    Palette,
    Shield,
    Bell,
    Check
} from "lucide-react";

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string | null;
    subscription_tier: string | null;
}

interface WorkflowRule {
    lifecycle_stage: string;
    notify_client: boolean;
}

const workflowStageLabels: Record<string, string> = {
    lead: "Lead",
    prospect: "Prospect",
    proposal: "Proposal",
    payment_pending: "Payment Pending",
    payment_confirmed: "Payment Confirmed",
    active: "Active Trip",
    review: "Review",
    past: "Closed",
};

const mockOrganization: Organization = {
    id: "mock-org",
    name: "GoBuddy Adventures",
    slug: "gobuddy-adventures",
    logo_url: "https://gobuddyadventures.com/wp-content/uploads/2021/12/GoBuddy-Full-Logo-Transparent-1.png",
    primary_color: "#00D084",
    subscription_tier: "pro",
};

export default function SettingsPage() {
    const supabase = createClient();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>([]);
    const [rulesSaving, setRulesSaving] = useState(false);
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    const fetchSettings = useCallback(async () => {
        try {
            if (useMockAdmin) {
                setOrganization(mockOrganization);
                setWorkflowRules(
                    Object.keys(workflowStageLabels).map((stage) => ({
                        lifecycle_stage: stage,
                        notify_client: true,
                    }))
                );
                return;
            }

            const { data, error } = await supabase
                .from("organizations")
                .select("*")
                .single();

            if (error) throw error;
            setOrganization(data);

            const { data: { session } } = await supabase.auth.getSession();
            const rulesResponse = await fetch("/api/admin/workflow/rules", {
                headers: {
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });
            const rulesPayload = await rulesResponse.json();
            if (rulesResponse.ok) {
                setWorkflowRules(rulesPayload.rules || []);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase, useMockAdmin]);

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

        setSaving(true);
        try {
            if (useMockAdmin) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                return;
            }

            const { error } = await supabase
                .from("organizations")
                .update({
                    name: organization.name,
                    logo_url: organization.logo_url,
                    primary_color: organization.primary_color
                })
                .eq("id", organization.id);

            if (error) throw error;

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const toggleWorkflowRule = (stage: string) => {
        setWorkflowRules((prev) =>
            prev.map((rule) =>
                rule.lifecycle_stage === stage
                    ? { ...rule, notify_client: !rule.notify_client }
                    : rule
            )
        );
    };

    const saveWorkflowRules = async () => {
        setRulesSaving(true);
        try {
            if (useMockAdmin) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            for (const rule of workflowRules) {
                const response = await fetch("/api/admin/workflow/rules", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.access_token || ""}`,
                    },
                    body: JSON.stringify(rule),
                });
                if (!response.ok) {
                    const payload = await response.json();
                    throw new Error(payload?.error || "Failed to save workflow rules");
                }
            }

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Error saving workflow rules:", error);
            alert(error instanceof Error ? error.message : "Failed to save workflow rules");
        } finally {
            setRulesSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Settings</span>
                <h1 className="text-3xl font-[var(--font-display)] text-[#1b140a] mt-2 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-[#c4a870]" />
                    Settings
                </h1>
                <p className="text-[#6f5b3e] mt-1">Manage your organization details and application preferences.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Organization Details */}
                <div className="bg-white/90 border border-[#eadfcd] rounded-2xl overflow-hidden shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-primary" />
                        <h2 className="font-bold text-slate-900">Organization Details</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Company Name</label>
                                <input
                                    type="text"
                                    value={organization?.name || ""}
                                    onChange={(e) => setOrganization(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    placeholder="Enter company name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Organization Slug</label>
                                <input
                                    type="text"
                                    value={organization?.slug || ""}
                                    disabled
                                    className="w-full px-4 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Logo URL</label>
                            <input
                                type="url"
                                value={organization?.logo_url || ""}
                                onChange={(e) => setOrganization(prev => prev ? { ...prev, logo_url: e.target.value } : null)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                    </div>
                </div>

                {/* Branding & Theme */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <Palette className="w-5 h-5 text-purple-500" />
                        <h2 className="font-bold text-slate-900">Branding & Theme</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-6">
                            <div className="space-y-2 flex-1">
                                <label className="text-sm font-semibold text-slate-700">Primary Brand Color</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={organization?.primary_color || "#00D084"}
                                        onChange={(e) => setOrganization(prev => prev ? { ...prev, primary_color: e.target.value } : null)}
                                        className="w-10 h-10 border-none rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={organization?.primary_color || ""}
                                        onChange={(e) => setOrganization(prev => prev ? { ...prev, primary_color: e.target.value } : null)}
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        placeholder="#00D084"
                                    />
                                </div>
                            </div>
                            <div className="w-32 h-32 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 p-4">
                                <div
                                    className="w-full h-8 rounded shadow-sm"
                                    style={{ backgroundColor: organization?.primary_color || "#00D084" }}
                                ></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Primary Color Preview
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lifecycle Notification Rules */}
                <div className="bg-white/90 border border-[#eadfcd] rounded-2xl overflow-hidden shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <Bell className="w-5 h-5 text-primary" />
                        <h2 className="font-bold text-slate-900">Lifecycle Notification Rules</h2>
                    </div>
                    <div className="p-6 space-y-3">
                        <p className="text-sm text-slate-600">
                            Control whether clients receive automatic WhatsApp + app notifications when moved to each lifecycle stage.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {workflowRules.map((rule) => (
                                <div key={rule.lifecycle_stage} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {workflowStageLabels[rule.lifecycle_stage] || rule.lifecycle_stage}
                                        </p>
                                        <p className="text-xs text-slate-500">{rule.lifecycle_stage}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleWorkflowRule(rule.lifecycle_stage)}
                                        className={`w-12 h-7 rounded-full relative transition-colors ${rule.notify_client ? "bg-emerald-500" : "bg-slate-300"}`}
                                        aria-label={`Toggle ${rule.lifecycle_stage}`}
                                    >
                                        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${rule.notify_client ? "right-1" : "left-1"}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={saveWorkflowRules}
                                disabled={rulesSaving}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b140a] text-[#f5e7c6] font-semibold hover:bg-[#2a2217] transition-colors disabled:opacity-60"
                            >
                                {rulesSaving ? (
                                    <div className="w-4 h-4 border-2 border-[#f5e7c6]/40 border-t-[#f5e7c6] rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save Notification Rules
                            </button>
                        </div>
                    </div>
                </div>

                {/* Application Config (ReadOnly in this demo) */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm opacity-60">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <Globe className="w-5 h-5 text-blue-500" />
                        <h2 className="font-bold text-slate-900">System Configuration</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Push Notifications</p>
                                    <p className="text-xs text-slate-500">Global kill switch</p>
                                </div>
                            </div>
                            <div className="w-10 h-6 bg-primary rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Two-Factor Auth</p>
                                    <p className="text-xs text-slate-500">Security requirement</p>
                                </div>
                            </div>
                            <div className="w-10 h-6 bg-slate-300 rounded-full relative">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                    {showSuccess && (
                        <span className="flex items-center gap-2 text-green-600 font-medium animate-in fade-in slide-in-from-right-4">
                            <Check className="w-5 h-5" />
                            Settings saved successfully
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-all shadow-lg disabled:opacity-50 font-bold"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
