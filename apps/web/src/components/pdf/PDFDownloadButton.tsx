"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ItineraryResult } from "@/types/itinerary";

interface PDFDownloadButtonProps {
    itinerary: ItineraryResult;
    className?: string;
}

export default function PDFDownloadButton({ itinerary, className = "" }: PDFDownloadButtonProps) {
    const [generating, setGenerating] = useState(false);

    const handleDownload = async () => {
        if (!itinerary) return;

        setGenerating(true);

        try {
            // Dynamic imports to avoid SSR issues
            const { pdf } = await import("@react-pdf/renderer");
            const { default: ItineraryDocument } = await import("./ItineraryDocument");

            // Prepare data for the PDF component
            const pdfData = {
                trip_title: itinerary.trip_title || "My Trip",
                destination: itinerary.destination || "",
                summary: itinerary.summary || "",
                days: itinerary.days || [],
            };

            // Generate the PDF blob
            const blob = await pdf(<ItineraryDocument data={pdfData} />).toBlob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${pdfData.trip_title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            disabled={generating}
            className={`bg-white/80 backdrop-blur-sm shadow-sm hover:bg-gray-100 transition-colors ${className}`}
            title="Download PDF"
        >
            {generating ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
            ) : (
                <Download className="w-4 h-4 text-gray-700" />
            )}
        </Button>
    );
}
