import { NextRequest, NextResponse } from "next/server";
import {
    convertCurrency,
    getExchangeRates,
    getAvailableCurrencies,
    formatCurrency
} from "@/lib/external/currency";

/**
 * GET /api/currency?amount=100&from=USD&to=EUR
 * GET /api/currency/rates?base=USD
 * GET /api/currency/list
 * 
 * Convert currency or get exchange rates
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const amount = searchParams.get("amount");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const base = searchParams.get("base");
    const list = searchParams.get("list");

    try {
        // Get available currencies
        if (list !== null) {
            const currencies = await getAvailableCurrencies();
            if (!currencies) {
                return NextResponse.json(
                    { error: "Could not fetch currency list" },
                    { status: 500 }
                );
            }
            return NextResponse.json({ currencies });
        }

        // Get exchange rates for base currency
        if (base) {
            const rates = await getExchangeRates(base);
            if (!rates) {
                return NextResponse.json(
                    { error: `Could not fetch rates for: ${base}` },
                    { status: 404 }
                );
            }
            return NextResponse.json(rates);
        }

        // Convert amount
        if (amount && from && to) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount < 0) {
                return NextResponse.json(
                    { error: "Invalid amount" },
                    { status: 400 }
                );
            }

            const conversion = await convertCurrency(numAmount, from, to);
            if (!conversion) {
                return NextResponse.json(
                    { error: `Could not convert ${from} to ${to}` },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                ...conversion,
                formatted: {
                    from: formatCurrency(conversion.amount, conversion.from),
                    to: formatCurrency(conversion.result, conversion.to),
                },
            });
        }

        return NextResponse.json(
            {
                error: "Provide 'amount', 'from', and 'to' for conversion, or 'base' for rates, or 'list' for currencies",
                examples: {
                    convert: "/api/currency?amount=100&from=USD&to=EUR",
                    rates: "/api/currency?base=USD",
                    list: "/api/currency?list",
                }
            },
            { status: 400 }
        );
    } catch (error) {
        console.error("Currency API error:", error);
        return NextResponse.json(
            { error: "Failed to process currency request" },
            { status: 500 }
        );
    }
}
