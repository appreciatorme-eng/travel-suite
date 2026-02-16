"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, RefreshCw, Loader2 } from "lucide-react";

// Popular travel currencies
const CURRENCIES = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "MXN", name: "Mexican Peso", symbol: "$" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "THB", name: "Thai Baht", symbol: "฿" },
    { code: "KRW", name: "South Korean Won", symbol: "₩" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
];

interface CurrencyConverterProps {
    defaultFrom?: string;
    defaultTo?: string;
    compact?: boolean;
}

export default function CurrencyConverter({
    defaultFrom = "USD",
    defaultTo = "EUR",
    compact = false
}: CurrencyConverterProps) {
    const [amount, setAmount] = useState("100");
    const [fromCurrency, setFromCurrency] = useState(defaultFrom);
    const [toCurrency, setToCurrency] = useState(defaultTo);
    const [result, setResult] = useState<{
        converted: number;
        rate: number;
        formatted: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const convert = async () => {
        if (!amount || isNaN(Number(amount))) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch(
                `/api/currency?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
            );
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setResult({
                converted: data.converted,
                rate: data.rate,
                formatted: data.toFormatted,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Conversion failed";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const swapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
        setResult(null);
    };

    // Auto-convert on currency change
    useEffect(() => {
        if (amount) {
            convert();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromCurrency, toCurrency]);

    if (compact) {
        return (
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-sm text-gray-700">Currency Converter</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onBlur={convert}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="100"
                    />
                    <select
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                        {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.code}</option>
                        ))}
                    </select>
                    <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                    <select
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                        {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.code}</option>
                        ))}
                    </select>
                </div>

                {loading && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Converting...
                    </div>
                )}

                {result && !loading && (
                    <div className="mt-3 p-2 bg-indigo-50 rounded-lg">
                        <div className="text-sm font-semibold text-indigo-900">
                            {CURRENCIES.find(c => c.code === fromCurrency)?.symbol}{Number(amount).toLocaleString()} {fromCurrency} = {result.formatted}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            1 {fromCurrency} = {result.rate.toFixed(4)} {toCurrency}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-2 text-xs text-red-500">{error}</div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Currency Converter</h3>
                    <p className="text-xs text-gray-500">Real-time exchange rates</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* From Currency */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">From</label>
                    <div className="flex gap-2">
                        <select
                            value={fromCurrency}
                            onChange={(e) => setFromCurrency(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.symbol} {c.code} - {c.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-right"
                            placeholder="Amount"
                        />
                    </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                    <button
                        onClick={swapCurrencies}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <ArrowRightLeft className="w-5 h-5 text-gray-600 rotate-90" />
                    </button>
                </div>

                {/* To Currency */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
                    <select
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.symbol} {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Convert Button */}
                <button
                    onClick={convert}
                    disabled={loading || !amount}
                    className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Converting...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            Convert
                        </>
                    )}
                </button>

                {/* Result */}
                {result && !loading && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-indigo-900 mb-1">
                            {result.formatted}
                        </div>
                        <div className="text-sm text-gray-600">
                            1 {fromCurrency} = {result.rate.toFixed(4)} {toCurrency}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
