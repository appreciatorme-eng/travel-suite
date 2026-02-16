"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Car,
    Plus,
    Search,
    Phone,
    Edit2,
    Trash2,
    X,
    Loader2,
    Check,
    AlertCircle,
    Link2,
    Link2Off,
    ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/database.types";

type ExternalDriver = Database["public"]["Tables"]["external_drivers"]["Row"];
type NewDriver = Database["public"]["Tables"]["external_drivers"]["Insert"];

interface DriverAccountLink {
    id: string;
    external_driver_id: string;
    profile_id: string;
    is_active: boolean;
    profile_email?: string | null;
    profile_name?: string | null;
}

interface DriverAccountJoinRow {
    id: string;
    external_driver_id: string;
    profile_id: string;
    is_active: boolean;
    profiles: {
        email: string | null;
        full_name: string | null;
    } | null;
}

const mockDrivers: ExternalDriver[] = [
    {
        id: "mock-driver-1",
        organization_id: "mock-org",
        full_name: "Kenji Sato",
        phone: "+81 90 1234 5678",
        vehicle_type: "sedan",
        vehicle_plate: "KY-1204",
        vehicle_capacity: 3,
        languages: ["Japanese", "English"],
        notes: "Specializes in Kyoto transfers.",
        is_active: true,
        created_at: "2026-01-10T09:00:00Z",
        updated_at: "2026-02-05T11:00:00Z",
        photo_url: null,
    },
    {
        id: "mock-driver-2",
        organization_id: "mock-org",
        full_name: "Elena Petrova",
        phone: "+354 770 5566",
        vehicle_type: "suv",
        vehicle_plate: "ICE-447",
        vehicle_capacity: 4,
        languages: ["English", "Russian"],
        notes: "Northern lights expert.",
        is_active: true,
        created_at: "2026-01-18T12:00:00Z",
        updated_at: "2026-02-02T10:30:00Z",
        photo_url: null,
    },
];

const VEHICLE_TYPES = [
    { value: "sedan", label: "Sedan" },
    { value: "suv", label: "SUV" },
    { value: "van", label: "Van" },
    { value: "minibus", label: "Minibus" },
    { value: "bus", label: "Bus" },
];

export default function DriversPage() {
    const [drivers, setDrivers] = useState<ExternalDriver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<ExternalDriver | null>(null);
    const [saving, setSaving] = useState(false);
    const [linking, setLinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [driverAccountLinks, setDriverAccountLinks] = useState<Record<string, DriverAccountLink>>({});
    const [linkEmailByDriver, setLinkEmailByDriver] = useState<Record<string, string>>({});
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    // Form state
    const [formData, setFormData] = useState<Partial<NewDriver>>({
        full_name: "",
        phone: "",
        vehicle_type: null,
        vehicle_plate: "",
        vehicle_capacity: 4,
        languages: [],
        notes: "",
    });

    const fetchDrivers = useCallback(async () => {
        if (useMockAdmin) {
            setDrivers(mockDrivers);
            setLoading(false);
            return;
        }

        const supabase = createClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .single();

        if (!profile?.organization_id) {
            // If no org, create one for this admin
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: newOrg } = await supabase
                    .from("organizations")
                    .insert({
                        name: "My Travel Agency",
                        slug: `agency-${user.id.slice(0, 8)}`,
                        owner_id: user.id,
                    })
                    .select()
                    .single();

                if (newOrg) {
                    await supabase
                        .from("profiles")
                        .update({ organization_id: newOrg.id })
                        .eq("id", user.id);
                }
            }
        }

        const { data, error } = await supabase
            .from("external_drivers")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching drivers:", error);
            return;
        }

        setDrivers(data || []);

        const { data: links } = await supabase
            .from("driver_accounts")
            .select(`
                id,
                external_driver_id,
                profile_id,
                is_active,
                profiles:profile_id (
                    email,
                    full_name
                )
            `);

        const mapping: Record<string, DriverAccountLink> = {};
        (links as DriverAccountJoinRow[] | null || []).forEach((item) => {
            mapping[item.external_driver_id] = {
                id: item.id,
                external_driver_id: item.external_driver_id,
                profile_id: item.profile_id,
                is_active: item.is_active,
                profile_email: item.profiles?.email || null,
                profile_name: item.profiles?.full_name || null,
            };
        });
        setDriverAccountLinks(mapping);
        setLoading(false);
    }, [useMockAdmin]);

    useEffect(() => {
        void fetchDrivers();
    }, [fetchDrivers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (useMockAdmin) {
                if (editingDriver) {
                    setDrivers((prev) =>
                        prev.map((driver) =>
                            driver.id === editingDriver.id
                                ? {
                                    ...driver,
                                    full_name: formData.full_name || driver.full_name,
                                    phone: formData.phone || driver.phone,
                                    vehicle_type: (formData.vehicle_type as ExternalDriver["vehicle_type"]) || driver.vehicle_type,
                                    vehicle_plate: formData.vehicle_plate || driver.vehicle_plate,
                                    vehicle_capacity: formData.vehicle_capacity || driver.vehicle_capacity,
                                    languages: formData.languages || driver.languages,
                                    notes: formData.notes || driver.notes,
                                    updated_at: new Date().toISOString(),
                                }
                                : driver
                        )
                    );
                    setSuccess("Driver updated successfully (mock)");
                } else {
                    const newDriver: ExternalDriver = {
                        id: `mock-driver-${Date.now()}`,
                        organization_id: "mock-org",
                        full_name: formData.full_name || "New Driver",
                        phone: formData.phone || "",
                        vehicle_type: (formData.vehicle_type as ExternalDriver["vehicle_type"]) || "sedan",
                        vehicle_plate: formData.vehicle_plate || "",
                        vehicle_capacity: formData.vehicle_capacity || 4,
                        languages: formData.languages || [],
                        notes: formData.notes || "",
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        photo_url: null,
                    };
                    setDrivers((prev) => [newDriver, ...prev]);
                    setSuccess("Driver added successfully (mock)");
                }

                setShowModal(false);
                setEditingDriver(null);
                resetForm();
                return;
            }

            // Get organization ID
            const { data: profile } = await supabase
                .from("profiles")
                .select("organization_id")
                .single();

            if (!profile?.organization_id) {
                throw new Error("No organization found. Please refresh and try again.");
            }

            if (editingDriver) {
                // Update existing driver
                const { error } = await supabase
                    .from("external_drivers")
                    .update({
                        full_name: formData.full_name,
                        phone: formData.phone,
                        vehicle_type: formData.vehicle_type as ExternalDriver["vehicle_type"],
                        vehicle_plate: formData.vehicle_plate,
                        vehicle_capacity: formData.vehicle_capacity,
                        languages: formData.languages,
                        notes: formData.notes,
                    })
                    .eq("id", editingDriver.id);

                if (error) throw error;
                setSuccess("Driver updated successfully");
            } else {
                // Create new driver
                const { error } = await supabase.from("external_drivers").insert({
                    organization_id: profile.organization_id,
                    full_name: formData.full_name!,
                    phone: formData.phone!,
                    vehicle_type: formData.vehicle_type as ExternalDriver["vehicle_type"],
                    vehicle_plate: formData.vehicle_plate,
                    vehicle_capacity: formData.vehicle_capacity || 4,
                    languages: formData.languages,
                    notes: formData.notes,
                });

                if (error) throw error;
                setSuccess("Driver added successfully");
            }

            setShowModal(false);
            setEditingDriver(null);
            resetForm();
            fetchDrivers();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save driver");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (driver: ExternalDriver) => {
        if (!confirm(`Are you sure you want to delete ${driver.full_name}?`)) {
            return;
        }

        if (useMockAdmin) {
            setDrivers((prev) => prev.filter((item) => item.id !== driver.id));
            setSuccess("Driver deleted successfully (mock)");
            return;
        }

        const { error } = await supabase
            .from("external_drivers")
            .delete()
            .eq("id", driver.id);

        if (error) {
            setError("Failed to delete driver");
            return;
        }

        setSuccess("Driver deleted successfully");
        fetchDrivers();
    };

    const handleLinkDriverAccount = async (driver: ExternalDriver) => {
        const email = (linkEmailByDriver[driver.id] || "").trim().toLowerCase();
        if (!email) {
            setError("Enter app user email to link this driver.");
            return;
        }

        setLinking(true);
        setError(null);

        try {
            if (useMockAdmin) {
                setDriverAccountLinks((prev) => ({
                    ...prev,
                    [driver.id]: {
                        id: `mock-link-${driver.id}`,
                        external_driver_id: driver.id,
                        profile_id: "mock-profile-id",
                        is_active: true,
                        profile_email: email,
                        profile_name: "Mock Driver User",
                    },
                }));
                setSuccess("Driver linked to app account (mock).");
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("id,email,full_name,role")
                .eq("email", email)
                .maybeSingle();

            if (profileError || !profile) {
                throw new Error("No app user found with that email.");
            }

            const { data: upserted, error: upsertError } = await supabase
                .from("driver_accounts")
                .upsert(
                    {
                        external_driver_id: driver.id,
                        profile_id: profile.id,
                        is_active: true,
                    },
                    { onConflict: "external_driver_id" }
                )
                .select("id,external_driver_id,profile_id,is_active")
                .single();

            if (upsertError || !upserted) {
                throw upsertError ?? new Error("Failed to link driver account.");
            }

            if (profile.role !== "driver") {
                const { error: roleError } = await supabase
                    .from("profiles")
                    .update({ role: "driver" })
                    .eq("id", profile.id);

                if (roleError) {
                    throw new Error(`Linked account but failed to set driver role: ${roleError.message}`);
                }
            }

            setDriverAccountLinks((prev) => ({
                ...prev,
                [driver.id]: {
                    id: upserted.id,
                    external_driver_id: upserted.external_driver_id,
                    profile_id: upserted.profile_id,
                    is_active: upserted.is_active,
                    profile_email: profile.email,
                    profile_name: profile.full_name,
                },
            }));
            setSuccess("Driver linked to app account and role synced.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to link driver account.");
        } finally {
            setLinking(false);
        }
    };

    const handleUnlinkDriverAccount = async (driver: ExternalDriver) => {
        const existing = driverAccountLinks[driver.id];
        if (!existing) return;

        setLinking(true);
        setError(null);

        try {
            if (useMockAdmin) {
                setDriverAccountLinks((prev) => {
                    const clone = { ...prev };
                    delete clone[driver.id];
                    return clone;
                });
                setSuccess("Driver link removed (mock).");
                return;
            }

            const { error } = await supabase
                .from("driver_accounts")
                .delete()
                .eq("id", existing.id);

            if (error) throw error;

            setDriverAccountLinks((prev) => {
                const clone = { ...prev };
                delete clone[driver.id];
                return clone;
            });
            setSuccess("Driver link removed.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to unlink driver account.");
        } finally {
            setLinking(false);
        }
    };

    const handleEdit = (driver: ExternalDriver) => {
        setEditingDriver(driver);
        setFormData({
            full_name: driver.full_name,
            phone: driver.phone,
            vehicle_type: driver.vehicle_type,
            vehicle_plate: driver.vehicle_plate,
            vehicle_capacity: driver.vehicle_capacity,
            languages: driver.languages,
            notes: driver.notes,
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            full_name: "",
            phone: "",
            vehicle_type: null,
            vehicle_plate: "",
            vehicle_capacity: 4,
            languages: [],
            notes: "",
        });
    };

    const filteredDrivers = drivers.filter(
        (driver) =>
            driver.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            driver.phone.includes(searchQuery) ||
            driver.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Clear messages after 3 seconds
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Drivers</span>
                    <h1 className="text-3xl font-[var(--font-display)] text-[#1b140a] mt-2">Drivers</h1>
                    <p className="text-[#6f5b3e]">
                        Manage your partner drivers for trip assignments
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setEditingDriver(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1b140a] text-[#f5e7c6] rounded-lg hover:bg-[#2a2217] transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Add Driver
                </button>
            </div>

            {/* Notifications */}
            {success && (
                <div className="mb-4 p-4 bg-[#f1e4d2] border border-[#eadfcd] rounded-lg flex items-center gap-2 text-[#9c7c46]">
                    <Check className="w-5 h-5" />
                    {success}
                </div>
            )}
            {error && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Search */}
            <div>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#bda87f]" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or plate..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-[#eadfcd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c4a870]/20 focus:border-[#c4a870] bg-white/90"
                    />
                </div>
            </div>

            {/* Drivers Table */}
            <div className="bg-white/90 rounded-2xl border border-[#eadfcd] overflow-hidden shadow-[0_12px_30px_rgba(20,16,12,0.06)]">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-[#c4a870] animate-spin mx-auto mb-2" />
                        <p className="text-[#6f5b3e]">Loading drivers...</p>
                    </div>
                ) : filteredDrivers.length === 0 ? (
                    <div className="p-8 text-center">
                        <Car className="w-12 h-12 text-[#bda87f] mx-auto mb-3" />
                        <p className="text-[#6f5b3e]">
                            {searchQuery
                                ? "No drivers match your search"
                                : "No drivers added yet"}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 text-[#9c7c46] hover:underline"
                            >
                                Add your first driver
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-[#f8f1e6] border-b border-[#eadfcd]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6f5b3e] uppercase tracking-wider">
                                    Driver
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6f5b3e] uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6f5b3e] uppercase tracking-wider">
                                    Vehicle
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6f5b3e] uppercase tracking-wider">
                                    Capacity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6f5b3e] uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6f5b3e] uppercase tracking-wider">
                                    App Link
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-[#6f5b3e] uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#efe2cf]">
                            {filteredDrivers.map((driver) => (
                                <tr key={driver.id} className="hover:bg-[#f8f1e6]">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#f6efe4] rounded-full flex items-center justify-center border border-[#eadfcd]">
                                                <span className="text-[#9c7c46] font-medium">
                                                    {driver.full_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <Link href={`/admin/drivers/${driver.id}`} className="font-medium text-[#1b140a] hover:underline flex items-center gap-1">
                                                    {driver.full_name}
                                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                                </Link>
                                                {driver.languages && driver.languages.length > 0 && (
                                                    <p className="text-sm text-[#6f5b3e]">
                                                        {driver.languages.join(", ")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a
                                            href={`tel:${driver.phone}`}
                                            className="flex items-center gap-2 text-[#6f5b3e] hover:text-[#9c7c46]"
                                        >
                                            <Phone className="w-4 h-4" />
                                            {driver.phone}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-gray-900 capitalize">
                                                {driver.vehicle_type || "-"}
                                            </p>
                                            {driver.vehicle_plate && (
                                                <p className="text-sm text-gray-500">
                                                    {driver.vehicle_plate}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {driver.vehicle_capacity} seats
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${driver.is_active
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {driver.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {driverAccountLinks[driver.id] ? (
                                            <div className="space-y-2">
                                                <div className="text-xs text-emerald-700 font-medium">
                                                    Linked: {driverAccountLinks[driver.id].profile_email || "app user"}
                                                </div>
                                                <button
                                                    onClick={() => void handleUnlinkDriverAccount(driver)}
                                                    disabled={linking}
                                                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline disabled:opacity-60"
                                                >
                                                    <Link2Off className="w-3.5 h-3.5" />
                                                    Unlink
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    type="email"
                                                    placeholder="driver app email"
                                                    value={linkEmailByDriver[driver.id] || ""}
                                                    onChange={(e) =>
                                                        setLinkEmailByDriver((prev) => ({
                                                            ...prev,
                                                            [driver.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="w-44 rounded border border-[#eadfcd] px-2 py-1 text-xs"
                                                />
                                                <button
                                                    onClick={() => void handleLinkDriverAccount(driver)}
                                                    disabled={linking}
                                                    className="inline-flex items-center gap-1 text-xs text-[#6f5b3e] hover:underline disabled:opacity-60"
                                                >
                                                    <Link2 className="w-3.5 h-3.5" />
                                                    Link
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(driver)}
                                                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit driver"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(driver)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete driver"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingDriver ? "Edit Driver" : "Add New Driver"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingDriver(null);
                                    resetForm();
                                }}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, full_name: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="John Doe"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, phone: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="+1234567890"
                                />
                            </div>

                            {/* Vehicle Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vehicle Type
                                </label>
                                <select
                                    value={formData.vehicle_type || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            vehicle_type: e.target.value as ExternalDriver["vehicle_type"],
                                        })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="">Select type</option>
                                    {VEHICLE_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Vehicle Plate */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vehicle Plate
                                </label>
                                <input
                                    type="text"
                                    value={formData.vehicle_plate || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, vehicle_plate: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="ABC-1234"
                                />
                            </div>

                            {/* Capacity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Passenger Capacity
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={formData.vehicle_capacity || 4}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            vehicle_capacity: parseInt(e.target.value),
                                        })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            {/* Languages */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Languages (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={formData.languages?.join(", ") || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            languages: e.target.value
                                                .split(",")
                                                .map((l) => l.trim())
                                                .filter(Boolean),
                                        })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="English, Spanish, French"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notes: e.target.value })
                                    }
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    placeholder="Any additional notes about this driver..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingDriver(null);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : editingDriver ? (
                                        "Update Driver"
                                    ) : (
                                        "Add Driver"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
