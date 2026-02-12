# Observability + Notification Architecture (Feb 11, 2026)

## 1) Structured Logging (Implemented)

Structured JSON logging is now enabled for high-traffic operational endpoints:
- `apps/web/src/app/api/health/route.ts`
- `apps/web/src/app/api/notifications/process-queue/route.ts`
- `apps/web/src/app/api/notifications/send/route.ts`
- `supabase/functions/send-notification/index.ts`

Common log fields:
- `level`
- `message`
- `timestamp`
- `requestId` (web API)
- `route`
- `method`
- operation-specific fields (`trip_id`, `queue_id`, `durationMs`, etc.)

Example log payload:

```json
{
  "level": "error",
  "message": "Notification queue run crashed",
  "timestamp": "2026-02-11T16:30:00.000Z",
  "requestId": "f4a7...",
  "route": "/api/notifications/process-queue",
  "method": "POST",
  "error_message": "..."
}
```

## 2) Operational Metrics (Implemented)

Server-side metric capture helper added:
- `apps/web/src/lib/observability/metrics.ts`

Current events emitted:
- `api.health.checked`
- `api.notifications.send`
- `api.notifications.send.error`
- `api.notifications.queue.processed`
- `api.notifications.queue.error`

Metrics are best-effort and do not block API responses.

## 3) Health / Uptime Signals (Implemented)

`/api/health` now reports observability configuration status for:
- Sentry (`SENTRY_DSN`)
- PostHog (`POSTHOG_API_KEY` + optional `POSTHOG_HOST`)
- Uptime heartbeat monitor URL (`HEALTHCHECK_PING_URL` or `UPTIMEROBOT_HEARTBEAT_URL`)

This enables easy integration with BetterUptime/UptimeRobot by monitoring `/api/health` and/or using a heartbeat URL.

## 4) Environment Variables

Add in `apps/web/.env.local` (or deployment secrets):

```bash
# Sentry
SENTRY_DSN=...

# PostHog
POSTHOG_API_KEY=...
POSTHOG_HOST=https://app.posthog.com

# Uptime heartbeat (optional)
HEALTHCHECK_PING_URL=...
# or
UPTIMEROBOT_HEARTBEAT_URL=...
```

## 5) Medium-Term Notification Refactor Plan (6-12 months)

Target architecture:

- `Trip Created` -> `Event Bus` -> `Notification Scheduler`
- Scheduler -> `Priority Queue`
- Workers per channel:
  - WhatsApp worker
  - Push worker
  - Email worker

Expected benefits:
- independent channel scaling
- cleaner retries and dead-letter handling
- easier debugging per channel
- per-channel delivery observability and SLOs

Suggested path in Travel Suite:
1. Introduce `notification_events` table as append-only event bus.
2. Add scheduler worker to convert events -> queue records by channel.
3. Split queue processor into channel workers while preserving current API contracts.
4. Add dead-letter table + retry policy by channel.
5. Add dashboard slices by channel latency, failure rate, and retry depth.

Implementation options:
- native Supabase path: Postgres tables + `pg_cron` + Edge Functions
- external queue path: Redis/BullMQ workers (if throughput requires)
