import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
    requestId?: string;
    route?: string;
    method?: string;
    durationMs?: number;
    [key: string]: unknown;
};

type StructuredLog = {
    level: LogLevel;
    message: string;
    timestamp: string;
} & LogContext;

function toErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            error_name: error.name,
            error_message: error.message,
            error_stack: error.stack,
        };
    }

    return { error_message: String(error) };
}

function writeLog(payload: StructuredLog) {
    const serialized = JSON.stringify(payload);

    if (payload.level === "error") {
        console.error(serialized);
        return;
    }

    if (payload.level === "warn") {
        console.warn(serialized);
        return;
    }

    console.log(serialized);
}

export function logEvent(level: LogLevel, message: string, context: LogContext = {}) {
    writeLog({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...context,
    });
}

export function logError(message: string, error: unknown, context: LogContext = {}) {
    logEvent("error", message, {
        ...context,
        ...toErrorDetails(error),
    });
}

export function getRequestId(request: NextRequest): string {
    return request.headers.get("x-request-id")?.trim() || randomUUID();
}

export function getRequestContext(request: NextRequest, requestId: string): LogContext {
    return {
        requestId,
        route: request.nextUrl.pathname,
        method: request.method,
    };
}
