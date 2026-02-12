/**
 * ExchangeRate-API Integration (Free Tier)
 * Free tier: 1,500 requests/month
 * 
 * We'll use the free frankfurter.app API as a fully free alternative
 * No API key required, unlimited requests
 * 
 * @see https://www.frankfurter.app/docs/
 */

export interface ExchangeRates {
    base: string;
    date: string;
    rates: Record<string, number>;
}

export interface ConversionResult {
    from: string;
    to: string;
    amount: number;
    result: number;
    rate: number;
    date: string;
}

// Common currency symbols
const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    KRW: "₩",
    INR: "₹",
    BRL: "R$",
    MXN: "$",
    CAD: "C$",
    AUD: "A$",
    CHF: "CHF",
    THB: "฿",
    SGD: "S$",
    HKD: "HK$",
    NZD: "NZ$",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    TRY: "₺",
    ZAR: "R",
    AED: "د.إ",
    SAR: "﷼",
    ILS: "₪",
    PHP: "₱",
    IDR: "Rp",
    MYR: "RM",
    VND: "₫",
};

/**
 * Get the latest exchange rates for a base currency
 */
export async function getExchangeRates(baseCurrency: string = "USD"): Promise<ExchangeRates | null> {
    try {
        const response = await fetch(
            `https://api.frankfurter.app/latest?from=${baseCurrency.toUpperCase()}`
        );

        if (!response.ok) {
            console.error(`Exchange rate API failed:`, response.status);
            return null;
        }

        const data = await response.json();

        return {
            base: data.base,
            date: data.date,
            rates: data.rates,
        };
    } catch (error) {
        console.error(`Exchange rate fetch error:`, error);
        return null;
    }
}

/**
 * Convert an amount from one currency to another
 */
export async function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
): Promise<ConversionResult | null> {
    try {
        const from = fromCurrency.toUpperCase();
        const to = toCurrency.toUpperCase();

        // Same currency, no conversion needed
        if (from === to) {
            return {
                from,
                to,
                amount,
                result: amount,
                rate: 1,
                date: new Date().toISOString().split("T")[0],
            };
        }

        const response = await fetch(
            `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`
        );

        if (!response.ok) {
            console.error(`Currency conversion failed:`, response.status);
            return null;
        }

        const data = await response.json();

        return {
            from: data.base,
            to,
            amount: data.amount,
            result: data.rates[to],
            rate: data.rates[to] / data.amount,
            date: data.date,
        };
    } catch (error) {
        console.error(`Currency conversion error:`, error);
        return null;
    }
}

/**
 * Get available currencies
 */
export async function getAvailableCurrencies(): Promise<Record<string, string> | null> {
    try {
        const response = await fetch("https://api.frankfurter.app/currencies");

        if (!response.ok) {
            console.error(`Currencies list failed:`, response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`Currencies list error:`, error);
        return null;
    }
}

/**
 * Format a currency amount with symbol
 */
export function formatCurrency(amount: number, currency: string): string {
    const code = currency.toUpperCase();
    const symbol = currencySymbols[code] || code;

    // Format with appropriate decimal places
    const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

    // Handle symbol placement
    if (["EUR", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF"].includes(code)) {
        return `${formatted} ${symbol}`;
    }

    return `${symbol}${formatted}`;
}

/**
 * Get the currency symbol for a currency code
 */
export function getCurrencySymbol(currency: string): string {
    return currencySymbols[currency.toUpperCase()] || currency.toUpperCase();
}

/**
 * Detect likely currency for a destination country
 */
export function getCurrencyForCountry(countryCode: string): string {
    const countryCurrencies: Record<string, string> = {
        US: "USD",
        GB: "GBP",
        EU: "EUR",
        DE: "EUR",
        FR: "EUR",
        IT: "EUR",
        ES: "EUR",
        JP: "JPY",
        CN: "CNY",
        KR: "KRW",
        IN: "INR",
        BR: "BRL",
        MX: "MXN",
        CA: "CAD",
        AU: "AUD",
        CH: "CHF",
        TH: "THB",
        SG: "SGD",
        HK: "HKD",
        NZ: "NZD",
        SE: "SEK",
        NO: "NOK",
        DK: "DKK",
        PL: "PLN",
        CZ: "CZK",
        HU: "HUF",
        TR: "TRY",
        ZA: "ZAR",
        AE: "AED",
        SA: "SAR",
        IL: "ILS",
        PH: "PHP",
        ID: "IDR",
        MY: "MYR",
        VN: "VND",
    };

    return countryCurrencies[countryCode.toUpperCase()] || "USD";
}
