
"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Download } from "lucide-react";
import type { ItineraryResult } from "@/types/itinerary";

// Dynamically import PDFDownloadLink to avoid SSR issues with @react-pdf/renderer
const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => (
            <button disabled className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Preparing PDF...
            </button>
        ),
    }
);

import ItineraryDocument from './ItineraryDocument';

interface DownloadPDFButtonProps {
    data: ItineraryResult;
    fileName?: string;
}

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({ data, fileName = "itinerary.pdf" }) => {
    return (
        <PDFDownloadLink
            document={<ItineraryDocument data={data} />}
            fileName={fileName}
        >
            {({ loading }) =>
                loading ? (
                    <button disabled className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...
                    </button>
                ) : (
                    <button className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                )
            }
        </PDFDownloadLink>
    );
};

export default DownloadPDFButton;
