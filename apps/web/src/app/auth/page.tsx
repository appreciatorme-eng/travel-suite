"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type AuthMode = "login" | "signup";

export default function AuthPage() {
    const router = useRouter();
    const supabase = createClient();

    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            if (mode === "signup") {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;
                setMessage("Check your email for a confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/planner");
                router.refresh();
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An error occurred";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-40 -right-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10 animate-scale-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg mb-4 transform hover:rotate-3 transition-transform duration-300">
                        <Plane className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-serif text-secondary tracking-tight">GoBuddy Adventures</h1>
                    <p className="text-gray-500 mt-2 font-light">Your AI-powered travel companion</p>
                </div>

                {/* Auth Card */}
                <Card className="border-gray-100 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8">
                        {/* Tab Switcher */}
                        <div className="flex mb-8 bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button
                                onClick={() => setMode("login")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${mode === "login"
                                    ? "bg-white text-secondary shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                                    }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode("signup")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${mode === "signup"
                                    ? "bg-white text-secondary shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                                    }`}
                            >
                                Create Account
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAuth} className="space-y-5">
                            {mode === "signup" && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 ml-1">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="pl-9 h-11 bg-gray-50/50 border-gray-200 focus-visible:ring-primary"
                                            placeholder="John Doe"
                                            required={mode === "signup"}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 ml-1">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-9 h-11 bg-gray-50/50 border-gray-200 focus-visible:ring-primary"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 ml-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-9 h-11 bg-gray-50/50 border-gray-200 focus-visible:ring-primary"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-2 animate-shake">
                                    <span className="shrink-0 mt-0.5">⚠️</span>
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-lg flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">✅</span>
                                    {message}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {mode === "login" ? "Sign In" : "Create Account"}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <Separator />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-xs uppercase tracking-wider text-gray-400 font-medium">or continue with</span>
                            </div>
                        </div>

                        {/* Google Sign In */}
                        <Button
                            variant="outline"
                            type="button"
                            onClick={async () => {
                                setLoading(true);
                                await supabase.auth.signInWithOAuth({
                                    provider: "google",
                                    options: { redirectTo: `${window.location.origin}/auth/callback` },
                                });
                            }}
                            disabled={loading}
                            className="w-full h-11 bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow relative group overflow-hidden"
                        >
                            <svg className="w-5 h-5 mr-3 shrink-0 relative z-10" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="font-medium text-gray-700 relative z-10">Continue with Google</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-8">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </main>
    );
}
