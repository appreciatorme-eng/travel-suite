"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Playfair_Display, Manrope } from "next/font/google";
import {
    LayoutDashboard,
    Users,
    Car,
    MapPin,
    Bell,
    Settings,
    ChevronLeft,
    Loader2,
    ShieldAlert,
    ShieldCheck,
    BarChart3,
    FileText,
    Inbox,
    Wand2,
    ClipboardList,
    Compass,
    Columns3,
} from "lucide-react";

const displayFont = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-display",
});

const bodyFont = Manrope({
    subsets: ["latin"],
    variable: "--font-body",
});

const sidebarLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/planner", label: "Planner", icon: Compass },
    { href: "/admin/drivers", label: "Drivers", icon: Car },
    { href: "/admin/trips", label: "Trips", icon: MapPin },
    { href: "/admin/clients", label: "Clients", icon: Users },
    { href: "/admin/kanban", label: "Kanban", icon: Columns3 },
    { href: "/admin/activity", label: "Activity", icon: ClipboardList },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/templates", label: "Templates", icon: Wand2 },
    { href: "/admin/billing", label: "Billing", icon: FileText },
    { href: "/admin/security", label: "Security", icon: ShieldCheck },
    { href: "/admin/support", label: "Support", icon: Inbox },
    { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const useMockAdmin = process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";

    useEffect(() => {
        const checkAuth = async () => {
            if (useMockAdmin) {
                setAuthorized(true);
                setLoading(false);
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth");
                return;
            }

            // Check if user is admin
            const { data: profile } = await supabase
                .from("profiles")
                .select("role, organization_id")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "admin") {
                setAuthorized(false);
                setLoading(false);
                return;
            }

            setAuthorized(true);
            setLoading(false);
        };

        checkAuth();
    }, [supabase, router, useMockAdmin]);

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-[#f5efe6] ${bodyFont.className} ${displayFont.variable}`}>
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-[#f5efe6] ${bodyFont.className} ${displayFont.variable}`}>
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-[var(--font-display)] text-gray-900 mb-2">
                        Access Denied
                    </h1>
                    <p className="text-gray-600 mb-6">
                        You don&apos;t have permission to access the admin panel. Please
                        contact your administrator if you believe this is an error.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex bg-[radial-gradient(circle_at_top,_#fbf4e9_0%,_#f5efe6_45%,_#efe6d9_100%)] ${bodyFont.className} ${displayFont.variable}`}>
            {/* Sidebar */}
            <aside className="w-64 bg-[#0f0d0b] border-r border-[#1f1a14] flex flex-col">
                {/* Logo */}
                <div className="p-5 border-b border-[#1f1a14]">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-[#c4a870] flex items-center justify-center shadow-[0_6px_18px_rgba(196,168,112,0.35)]">
                            <LayoutDashboard className="w-5 h-5 text-[#1b140a]" />
                        </div>
                        <div className="leading-tight">
                            <span className="block text-xs uppercase tracking-[0.25em] text-[#cbb68e]">Travel Suite</span>
                            <span className="block text-base font-[var(--font-display)] text-[#f5e9d2]">Admin Atelier</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {sidebarLinks.map((link) => {
                        const isActive = pathname === link.href ||
                            (link.href !== "/admin" && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    isActive
                                        ? "bg-[#2a2217] text-[#f5e7c6] shadow-[inset_0_0_0_1px_rgba(196,168,112,0.35)]"
                                        : "text-[#bda87f] hover:bg-[#1b1712] hover:text-[#f5e7c6]"
                                }`}
                            >
                                <link.icon className={`w-5 h-5 ${isActive ? "text-[#c4a870]" : ""}`} />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Back to site */}
                <div className="p-4 border-t border-[#1f1a14]">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-[#bda87f] hover:text-[#f5e7c6] transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to site
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto p-8">
                {useMockAdmin && (
                    <div className="mb-6 rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-sm">
                        Mock mode enabled. Admin access and data are simulated for demo purposes.
                    </div>
                )}
                <div className="rounded-[32px] bg-white/85 shadow-[0_24px_60px_rgba(20,16,12,0.08)] ring-1 ring-[#eadfcd] p-8 backdrop-blur lux-fade-up lux-stagger">
                    {children}
                </div>
            </main>
            <style jsx global>{`
                @keyframes luxFadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .lux-fade-up {
                    animation: luxFadeUp 420ms ease-out both;
                }
                .lux-stagger > * {
                    animation: luxFadeUp 480ms ease-out both;
                }
                .lux-stagger > *:nth-child(1) { animation-delay: 40ms; }
                .lux-stagger > *:nth-child(2) { animation-delay: 90ms; }
                .lux-stagger > *:nth-child(3) { animation-delay: 140ms; }
                .lux-stagger > *:nth-child(4) { animation-delay: 190ms; }
                .lux-stagger > *:nth-child(5) { animation-delay: 240ms; }
                .lux-stagger > *:nth-child(6) { animation-delay: 290ms; }
                .lux-stagger > *:nth-child(7) { animation-delay: 340ms; }
                .lux-stagger > *:nth-child(8) { animation-delay: 390ms; }
                @media (prefers-reduced-motion: reduce) {
                    .lux-fade-up,
                    .lux-stagger > * {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}
