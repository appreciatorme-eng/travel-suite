"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Columns3, RefreshCcw, ArrowRight, ArrowLeft, Clock3, Search, Phone, Upload, UserPlus } from "lucide-react";

type LifecycleStage =
    | "lead"
    | "prospect"
    | "proposal"
    | "payment_pending"
    | "payment_confirmed"
    | "active"
    | "review"
    | "past";

interface ClientCard {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    phase_notifications_enabled?: boolean | null;
    lifecycle_stage: LifecycleStage | null;
    lead_status: string | null;
}

interface StageEvent {
    id: string;
    profile_id: string;
    from_stage: string;
    to_stage: string;
    created_at: string;
    profile: {
        full_name: string | null;
        email: string | null;
    } | null;
    changed_by_profile: {
        full_name: string | null;
        email: string | null;
    } | null;
}

interface ContactItem {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    source: string | null;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
    "lead",
    "prospect",
    "proposal",
    "payment_pending",
    "payment_confirmed",
    "active",
    "review",
    "past",
];

const STAGE_LABELS: Record<LifecycleStage, string> = {
    lead: "Lead",
    prospect: "Prospect",
    proposal: "Proposal",
    payment_pending: "Payment Pending",
    payment_confirmed: "Payment Confirmed",
    active: "Active Trip",
    review: "Review",
    past: "Closed",
};

function getStageLabel(value: string | null | undefined): string {
    if (!value) return "Unknown";
    if (value === "pre_lead") return "Pre-Lead";
    return STAGE_LABELS[value as LifecycleStage] || value;
}

const mockClients: ClientCard[] = [
    { id: "c1", full_name: "Ava Chen", email: "ava@example.com", phone: "+1 415 555 1010", phase_notifications_enabled: true, lifecycle_stage: "lead", lead_status: "new" },
    { id: "c2", full_name: "Liam Walker", email: "liam@example.com", phone: "+44 20 7000 1000", phase_notifications_enabled: true, lifecycle_stage: "payment_pending", lead_status: "qualified" },
    { id: "c3", full_name: "Sofia Ramirez", email: "sofia@example.com", phone: "+34 91 123 4567", phase_notifications_enabled: false, lifecycle_stage: "review", lead_status: "contacted" },
];

const mockEvents: StageEvent[] = [
    {
        id: "e1",
        profile_id: "c2",
        from_stage: "proposal",
        to_stage: "payment_pending",
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        profile: { full_name: "Liam Walker", email: "liam@example.com" },
        changed_by_profile: { full_name: "Admin User", email: "admin@example.com" },
    },
];

const mockContacts: ContactItem[] = [
    { id: "ct1", full_name: "Nora Patel", email: "nora@example.com", phone: "+1 650 555 2211", source: "phone_import" },
    { id: "ct2", full_name: "Raj Kumar", email: null, phone: "+91 98 7654 3210", source: "manual" },
];

export default function AdminKanbanPage() {
    const supabase = createClient();
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";
    const [clients, setClients] = useState<ClientCard[]>([]);
    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [events, setEvents] = useState<StageEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [movingClientId, setMovingClientId] = useState<string | null>(null);
    const [draggingClientId, setDraggingClientId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [importingContacts, setImportingContacts] = useState(false);
    const [promotingContactId, setPromotingContactId] = useState<string | null>(null);
    const [contactsError, setContactsError] = useState<string | null>(null);
    const csvInputRef = useRef<HTMLInputElement | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (useMockAdmin) {
                setClients(mockClients);
                setContacts(mockContacts);
                setEvents(mockEvents);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            const [clientsResult, contactsResult, eventsResult] = await Promise.allSettled([
                fetch("/api/admin/clients", { headers }),
                fetch("/api/admin/contacts", { headers }),
                fetch("/api/admin/workflow/events?limit=40", { headers }),
            ]);

            if (clientsResult.status !== "fulfilled") {
                throw new Error("Failed to fetch clients");
            }

            const clientsRes = clientsResult.value;
            const clientsPayload = await clientsRes.json();
            if (!clientsRes.ok) {
                throw new Error(clientsPayload?.error || "Failed to fetch clients");
            }
            setClients((clientsPayload.clients || []) as ClientCard[]);

            if (eventsResult.status === "fulfilled") {
                const eventsRes = eventsResult.value;
                const eventsPayload = await eventsRes.json();
                if (eventsRes.ok) {
                    setEvents((eventsPayload.events || []) as StageEvent[]);
                }
            }

            if (contactsResult.status === "fulfilled") {
                const contactsRes = contactsResult.value;
                const contactsPayload = await contactsRes.json();
                if (contactsRes.ok) {
                    setContacts((contactsPayload.contacts || []) as ContactItem[]);
                    setContactsError(null);
                } else {
                    setContacts([]);
                    setContactsError(contactsPayload?.error || "Contacts unavailable");
                }
            } else {
                setContacts([]);
                setContactsError("Contacts unavailable");
            }
        } catch (error) {
            console.error("Kanban data fetch failed:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase, useMockAdmin]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const filteredClients = useMemo(
        () =>
            clients.filter((client) => {
                const q = searchTerm.trim().toLowerCase();
                if (!q) return true;
                return (
                    client.full_name?.toLowerCase().includes(q) ||
                    client.email?.toLowerCase().includes(q) ||
                    client.phone?.toLowerCase().includes(q)
                );
            }),
        [clients, searchTerm]
    );

    const clientsByStage = useMemo(
        () =>
            LIFECYCLE_STAGES.map((stage) => ({
                stage,
                label: STAGE_LABELS[stage],
                clients: filteredClients.filter((client) => (client.lifecycle_stage || "lead") === stage),
            })),
        [filteredClients]
    );

    const filteredContacts = useMemo(() => {
        const q = contactSearch.trim().toLowerCase();
        if (!q) return contacts;
        return contacts.filter((item) => (
            item.full_name?.toLowerCase().includes(q) ||
            item.email?.toLowerCase().includes(q) ||
            item.phone?.toLowerCase().includes(q)
        ));
    }, [contacts, contactSearch]);

    const totalVisibleClients = filteredClients.length;
    const totalPreLeadContacts = filteredContacts.length;

    const stageIndex = (stage?: string | null) => {
        const idx = LIFECYCLE_STAGES.indexOf((stage || "lead") as LifecycleStage);
        return idx < 0 ? 0 : idx;
    };

    const moveToStage = async (client: ClientCard, stage: LifecycleStage) => {
        if ((client.lifecycle_stage || "lead") === stage) return;
        setMovingClientId(client.id);
        try {
            if (useMockAdmin) {
                setClients((prev) => prev.map((row) => (row.id === client.id ? { ...row, lifecycle_stage: stage } : row)));
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/clients", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify({ id: client.id, lifecycle_stage: stage }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || "Failed to update stage");
            }

            setClients((prev) => prev.map((row) => (row.id === client.id ? { ...row, lifecycle_stage: stage } : row)));
            await fetchData();
        } catch (error) {
            console.error("Stage move failed:", error);
            alert(error instanceof Error ? error.message : "Failed to move stage");
        } finally {
            setMovingClientId(null);
        }
    };

    const toggleClientPhaseNotifications = async (client: ClientCard, enabled: boolean) => {
        setMovingClientId(client.id);
        try {
            if (useMockAdmin) {
                setClients((prev) => prev.map((row) => (
                    row.id === client.id ? { ...row, phase_notifications_enabled: enabled } : row
                )));
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/clients", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify({ id: client.id, phase_notifications_enabled: enabled }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || "Failed to update client notification toggle");
            }

            setClients((prev) => prev.map((row) => (
                row.id === client.id ? { ...row, phase_notifications_enabled: enabled } : row
            )));
        } catch (error) {
            console.error("Toggle phase notifications failed:", error);
            alert(error instanceof Error ? error.message : "Failed to update client notification toggle");
        } finally {
            setMovingClientId(null);
        }
    };

    const handleDrop = async (stage: LifecycleStage) => {
        if (!draggingClientId) return;
        const client = clients.find((row) => row.id === draggingClientId);
        setDraggingClientId(null);
        if (!client) return;
        await moveToStage(client, stage);
    };

    const promoteContactToLead = async (contact: ContactItem) => {
        setPromotingContactId(contact.id);
        try {
            if (useMockAdmin) {
                setContacts((prev) => prev.filter((item) => item.id !== contact.id));
                setClients((prev) => [
                    {
                        id: `new-${contact.id}`,
                        full_name: contact.full_name,
                        email: contact.email,
                        phone: contact.phone,
                        phase_notifications_enabled: true,
                        lifecycle_stage: "lead",
                        lead_status: "new",
                    },
                    ...prev,
                ]);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/admin/contacts/${contact.id}/promote`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || "Failed to promote contact");
            }
            await fetchData();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to move contact to lead");
        } finally {
            setPromotingContactId(null);
        }
    };

    const importFromPhone = async () => {
        const contactsApi = (navigator as Navigator & {
            contacts?: {
                select: (
                    properties: string[],
                    options?: { multiple?: boolean }
                ) => Promise<Array<{ name?: string[]; email?: string[]; tel?: string[] }>>;
            };
        }).contacts;

        if (!contactsApi?.select) {
            alert("Phone contact picker is not supported in this browser. Use CSV import.");
            return;
        }

        try {
            setImportingContacts(true);
            const picked = await contactsApi.select(["name", "email", "tel"], { multiple: true });
            if (!picked || picked.length === 0) return;

            const payloadContacts = picked.map((item) => ({
                full_name: item.name?.[0] || "",
                email: item.email?.[0] || "",
                phone: item.tel?.[0] || "",
            }));

            if (useMockAdmin) {
                setContacts((prev) => [
                    ...payloadContacts.map((c, idx) => ({
                        id: `mock-import-${Date.now()}-${idx}`,
                        full_name: c.full_name || "Imported Contact",
                        email: c.email || null,
                        phone: c.phone || null,
                        source: "phone_import",
                    })),
                    ...prev,
                ]);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/contacts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify({
                    source: "phone_import",
                    contacts: payloadContacts,
                }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || "Failed to import contacts");
            await fetchData();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to import phone contacts");
        } finally {
            setImportingContacts(false);
        }
    };

    const importCsvContacts = async (file: File) => {
        try {
            setImportingContacts(true);
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) {
                alert("CSV needs headers and at least one contact row.");
                return;
            }

            const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
            const nameIdx = headers.findIndex((h) => ["name", "full_name", "fullname"].includes(h));
            const emailIdx = headers.findIndex((h) => h === "email");
            const phoneIdx = headers.findIndex((h) => ["phone", "mobile", "tel", "telephone"].includes(h));

            const contactsPayload = lines.slice(1).map((line) => {
                const cols = line.split(",").map((c) => c.trim());
                return {
                    full_name: nameIdx >= 0 ? cols[nameIdx] || "" : "",
                    email: emailIdx >= 0 ? cols[emailIdx] || "" : "",
                    phone: phoneIdx >= 0 ? cols[phoneIdx] || "" : "",
                };
            }).filter((item) => item.full_name || item.email || item.phone);

            if (contactsPayload.length === 0) {
                alert("No valid contact rows found in CSV.");
                return;
            }

            if (useMockAdmin) {
                setContacts((prev) => [
                    ...contactsPayload.map((c, idx) => ({
                        id: `mock-csv-${Date.now()}-${idx}`,
                        full_name: c.full_name || "Imported Contact",
                        email: c.email || null,
                        phone: c.phone || null,
                        source: "csv_import",
                    })),
                    ...prev,
                ]);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch("/api/admin/contacts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify({
                    source: "csv_import",
                    contacts: contactsPayload,
                }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || "Failed to import CSV contacts");
            await fetchData();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to import CSV contacts");
        } finally {
            setImportingContacts(false);
            if (csvInputRef.current) {
                csvInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Operations</span>
                    <h1 className="text-3xl font-[var(--font-display)] text-[#1b140a] mt-2 flex items-center gap-3">
                        <Columns3 className="w-8 h-8 text-[#c4a870]" />
                        Lifecycle Kanban
                    </h1>
                    <p className="text-[#6f5b3e] mt-1">Drag or move clients between stages. Notifications run on configured transitions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b09a74]" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search client..."
                            className="pl-9 pr-3 py-2 rounded-lg border border-[#eadfcd] bg-white text-sm text-[#1b140a] w-[220px]"
                        />
                    </div>
                    <button
                        onClick={() => void fetchData()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eadfcd] rounded-lg text-[#6f5b3e] hover:bg-[#f8f1e6] transition-colors shadow-sm"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-[#8d7650]">Operational Snapshot</span>
                <span className="rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-xs text-[#6f5b3e]">
                    Visible Clients: <span className="font-semibold text-[#1b140a]">{totalVisibleClients}</span>
                </span>
                <span className="rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-xs text-[#6f5b3e]">
                    Pre-Lead Contacts: <span className="font-semibold text-[#1b140a]">{totalPreLeadContacts}</span>
                </span>
            </div>

            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-4 shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div>
                        <p className="text-sm font-semibold text-[#1b140a]">Pre-Lead Contacts</p>
                        <p className="text-xs text-[#8d7650]">Search/import contacts and promote them to Lead when ready.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b09a74]" />
                            <input
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                                placeholder="Search contacts..."
                                className="pl-9 pr-3 py-2 rounded-lg border border-[#eadfcd] bg-white text-sm text-[#1b140a] w-[220px]"
                            />
                        </div>
                        <button
                            onClick={() => void importFromPhone()}
                            disabled={importingContacts}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#eadfcd] bg-white text-sm text-[#6f5b3e] hover:bg-[#f8f1e6] disabled:opacity-60"
                        >
                            <Phone className={`w-4 h-4 ${importingContacts ? "animate-spin" : ""}`} />
                            Import Phone
                        </button>
                        <input
                            ref={csvInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void importCsvContacts(file);
                            }}
                        />
                        <button
                            onClick={() => csvInputRef.current?.click()}
                            disabled={importingContacts}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#eadfcd] bg-white text-sm text-[#6f5b3e] hover:bg-[#f8f1e6] disabled:opacity-60"
                        >
                            <Upload className={`w-4 h-4 ${importingContacts ? "animate-spin" : ""}`} />
                            Import CSV
                        </button>
                    </div>
                </div>
                {contactsError ? (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Contacts inbox unavailable: {contactsError}
                    </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {filteredContacts.length === 0 ? (
                        <p className="text-xs text-[#8d7650]">No pre-lead contacts found.</p>
                    ) : (
                        filteredContacts.map((contact) => (
                            <div key={contact.id} className="rounded-xl border border-[#eadfcd] bg-[#fcf8f1] px-3 py-2">
                                <p className="text-sm font-semibold text-[#1b140a] truncate">{contact.full_name || "Unnamed Contact"}</p>
                                <p className="text-xs text-[#8d7650] truncate">{contact.email || "No email"}</p>
                                <p className="text-xs text-[#8d7650] truncate">{contact.phone || "No phone"}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wide text-[#b09a74]">{contact.source || "manual"}</span>
                                    <button
                                        onClick={() => void promoteContactToLead(contact)}
                                        disabled={promotingContactId === contact.id}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#eadfcd] bg-white text-[11px] font-semibold text-[#6f5b3e] disabled:opacity-60"
                                    >
                                        <UserPlus className="w-3 h-3" />
                                        {promotingContactId === contact.id ? "Moving..." : "Move to Lead"}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 items-start">
                {clientsByStage.map((column) => (
                    <div
                        key={column.stage}
                        className="min-w-[290px] max-w-[290px] rounded-2xl border border-[#eadfcd] bg-gradient-to-b from-[#fffaf2] to-[#f8efe0] p-3 shadow-[0_10px_24px_rgba(20,16,12,0.06)] self-start"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => void handleDrop(column.stage)}
                    >
                        <div className="flex items-center justify-between mb-3 sticky top-0 bg-[#fff8ec]/90 backdrop-blur rounded-lg px-2 py-1 border border-[#f1e4cf]">
                            <p className="text-xs uppercase tracking-wide font-semibold text-[#9c7c46]">{column.label}</p>
                            <span className="text-xs font-semibold text-[#6f5b3e] bg-white px-2 py-0.5 rounded-full border border-[#eadfcd]">{column.clients.length}</span>
                        </div>
                        <div className="space-y-2 min-h-[120px]">
                            {column.clients.map((client) => {
                                const idx = stageIndex(client.lifecycle_stage);
                                const prev = idx > 0 ? LIFECYCLE_STAGES[idx - 1] : null;
                                const next = idx < LIFECYCLE_STAGES.length - 1 ? LIFECYCLE_STAGES[idx + 1] : null;
                                return (
                                    <div
                                        key={client.id}
                                        draggable
                                        onDragStart={() => setDraggingClientId(client.id)}
                                        onDragEnd={() => setDraggingClientId(null)}
                                        className="rounded-xl border border-[#eadfcd] bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-[0_12px_18px_rgba(20,16,12,0.08)] transition-shadow"
                                    >
                                        <p className="text-sm font-semibold text-[#1b140a] truncate">{client.full_name || "Unnamed Client"}</p>
                                        <p className="text-xs text-[#8d7650] truncate">{client.email || "No email"}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <p className="text-[10px] text-[#b09a74] uppercase tracking-wide">{client.lead_status || "new"}</p>
                                            <span className="text-[10px] text-[#8d7650]">•</span>
                                            <p className="text-[10px] text-[#8d7650]">{client.phone || "No phone"}</p>
                                        </div>
                                        <div className="mt-2">
                                            <select
                                                value={(client.lifecycle_stage || "lead")}
                                                onChange={(e) => void moveToStage(client, e.target.value as LifecycleStage)}
                                                disabled={movingClientId === client.id}
                                                className="w-full rounded-md border border-[#eadfcd] bg-white px-2 py-1 text-xs font-semibold text-[#6f5b3e]"
                                            >
                                                {LIFECYCLE_STAGES.map((stage) => (
                                                    <option key={`${client.id}-${stage}`} value={stage}>
                                                        {STAGE_LABELS[stage]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between rounded-md border border-[#eadfcd] bg-[#fcf8f1] px-2 py-1.5">
                                            <span className="text-[10px] uppercase tracking-wide text-[#8d7650]">Phase Notify</span>
                                            <button
                                                onClick={() => void toggleClientPhaseNotifications(client, !(client.phase_notifications_enabled ?? true))}
                                                disabled={movingClientId === client.id}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${(client.phase_notifications_enabled ?? true) ? "bg-emerald-500" : "bg-slate-300"} disabled:opacity-60`}
                                                type="button"
                                            >
                                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${(client.phase_notifications_enabled ?? true) ? "right-0.5" : "left-0.5"}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => prev && void moveToStage(client, prev)}
                                                disabled={!prev || movingClientId === client.id}
                                                className="text-[11px] px-2 py-1 rounded-md border border-[#eadfcd] text-[#6f5b3e] disabled:opacity-40"
                                            >
                                                <ArrowLeft className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => next && void moveToStage(client, next)}
                                                disabled={!next || movingClientId === client.id}
                                                className="text-[11px] px-2 py-1 rounded-md border border-[#eadfcd] text-[#6f5b3e] disabled:opacity-40"
                                            >
                                                <ArrowRight className="w-3 h-3" />
                                            </button>
                                            {movingClientId === client.id ? (
                                                <span className="text-[10px] text-[#9c7c46]">Saving…</span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                            {!loading && column.clients.length === 0 ? (
                                <p className="text-xs text-[#b09a74]">No clients</p>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-5 shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                <div className="flex items-center gap-2 mb-3">
                    <Clock3 className="w-5 h-5 text-[#9c7c46]" />
                    <h2 className="text-lg font-[var(--font-display)] text-[#1b140a]">Recent Stage Transitions</h2>
                </div>
                <div className="space-y-2">
                    {events.length === 0 ? (
                        <p className="text-sm text-[#8d7650]">No transitions yet.</p>
                    ) : (
                        events.map((event) => (
                            <div key={event.id} className="rounded-lg border border-[#eadfcd] bg-[#fcf8f1] px-3 py-2">
                                <p className="text-sm text-[#1b140a]">
                                    <span className="font-semibold">{event.profile?.full_name || event.profile?.email || "Client"}</span>
                                    {" moved "}
                                    <span className="font-semibold">{getStageLabel(event.from_stage)}</span>
                                    {" → "}
                                    <span className="font-semibold">{getStageLabel(event.to_stage)}</span>
                                </p>
                                <p className="text-xs text-[#8d7650]">
                                    {new Date(event.created_at).toLocaleString()} by {event.changed_by_profile?.full_name || event.changed_by_profile?.email || "Admin"}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
