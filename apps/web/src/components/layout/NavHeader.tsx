"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plane, Menu, X, User, LogOut, Map, Compass, Briefcase, Settings } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfile {
    role: string | null;
}

export default function NavHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                setUserProfile(profile);
            }

            setLoading(false);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    const navLinks = [
        { href: "/", label: "Home", icon: Compass },
        { href: "/planner", label: "Plan Trip", icon: Map },
        ...(user ? [{ href: "/trips", label: "My Trips", icon: Briefcase }] : []),
        ...(userProfile?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
    ];

    const isActive = (href: string) => pathname === href;

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                            <Plane className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-serif text-secondary hidden sm:block">
                            GoBuddy Adventures
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isActive(link.href)
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-secondary"
                                    }`}
                            >
                                <link.icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right side - Auth */}
                    <div className="flex items-center gap-3">
                        {loading ? (
                            <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                        ) : user ? (
                            <div className="hidden md:flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
                                    <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-sm text-gray-700 max-w-[120px] truncate">
                                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Sign out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-2">
                                <Link
                                    href="/auth"
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-secondary transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth"
                                    className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all shadow-sm"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100">
                        <nav className="flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${isActive(link.href)
                                        ? "bg-primary/10 text-primary"
                                        : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    <link.icon className="w-5 h-5" />
                                    {link.label}
                                </Link>
                            ))}

                            <div className="border-t border-gray-100 my-2" />

                            {user ? (
                                <>
                                    <div className="px-4 py-2 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="text-sm text-gray-700">
                                            {user.user_metadata?.full_name || user.email}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            handleSignOut();
                                        }}
                                        className="px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-3"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/auth"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/auth"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="mx-4 py-3 text-sm font-medium bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all text-center"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
