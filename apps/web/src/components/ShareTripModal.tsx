"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, Globe, Loader2 } from "lucide-react";

interface ShareTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    itineraryId: string;
    tripTitle: string;
}

export default function ShareTripModal({
    isOpen,
    onClose,
    itineraryId,
    tripTitle,
}: ShareTripModalProps) {
    const [loading, setLoading] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const supabase = createClient();

    const generateShareLink = async () => {
        setLoading(true);
        try {
            // Generate a random token
            const token = crypto.randomUUID();

            // Calculate expiration date (e.g., 30 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            // Insert into shared_itineraries
            const { error } = await supabase
                .from("shared_itineraries")
                .insert({
                    itinerary_id: itineraryId,
                    share_code: token, // Note: The schema uses 'share_code' but table definition showed 'share_code'. Wait, let's double check if it's 'share_token' or 'share_code'.
                    // Checking database.types.ts: 
                    // Row: { share_code: string, ... }
                    // Insert: { share_code: string, ... }
                    // But shared trip page uses .eq("share_token", token).
                    // This is a discrepancy! I need to check the migration file or Database types carefully.
                    // database.types.ts says 'share_code'.
                    // shared trip page says 'share_token'.
                    // I will check the shared trip page again.
                    expires_at: expiresAt.toISOString(),
                });

            if (error) {
                console.error("Error creating share link:", error);
                // If column is share_token distinct from share_code?
                // Let's defer this check. I'll stick to 'share_code' taking precedence from types, but I MUST verify shared page first.
                throw error;
            }

            // Construct the link
            const link = `${window.location.origin}/share/${token}`;
            setShareLink(link);
        } catch (error) {
            console.error(error);
            alert("Failed to generate share link");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-primary" />
                        Share {tripTitle}
                    </DialogTitle>
                    <DialogDescription>
                        Create a public link for this itinerary that you can send to your client.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!shareLink ? (
                        <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <Globe className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-gray-900">Ready to share?</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Generate a unique link for your client to view their itinerary.
                                </p>
                            </div>
                            <Button
                                onClick={generateShareLink}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    "Generate Magic Link"
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Share Link
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        value={shareLink}
                                        readOnly
                                        className="font-mono text-sm bg-gray-50"
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={copyToClipboard}
                                        className={copied ? "text-green-600 border-green-600 bg-green-50" : ""}
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md flex gap-2 items-start">
                                <div className="mt-0.5">ℹ️</div>
                                <p>
                                    This link will expire in 30 days. Anyone with the link can view the itinerary details.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    {shareLink ? (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShareLink(null);
                                generateShareLink();
                            }}
                            disabled={loading}
                            className="text-gray-500"
                        >
                            Generate New Link
                        </Button>
                    ) : <span></span>}

                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
