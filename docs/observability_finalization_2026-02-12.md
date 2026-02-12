# Observability Finalization (P1) - 2026-02-12

## Completed

- Added request-level observability for CRM/Kanban operational APIs:
  - `GET /api/admin/contacts`
  - `POST /api/admin/contacts`
  - `POST /api/admin/contacts/[id]/promote`
  - `GET /api/admin/workflow/events`
- Each endpoint now includes:
  - `request_id` in JSON responses
  - `x-request-id` response header
  - structured logs via `logEvent` / `logError`
  - PostHog operational metrics via `captureOperationalMetric`
  - Sentry exception capture on crash paths
- Dashboard health panel now includes notification pipeline state (`checks.notification_pipeline`).

## Health & Alert Threshold Inputs

Configure thresholds in `apps/web/.env.local`:

- `HEALTH_PENDING_QUEUE_THRESHOLD` (default `100`)
- `HEALTH_DEAD_LETTER_THRESHOLD` (default `20`)
- `HEALTH_OLDEST_PENDING_THRESHOLD_MINUTES` (default `30`)

## Validation

1. Open `/admin` and verify System Health contains **Notify Pipeline**.
2. Call contacts/workflow APIs and verify `x-request-id` header exists.
3. Trigger one controlled API error and verify Sentry event appears.
4. Check PostHog events:
   - `api.admin.contacts.list`
   - `api.admin.contacts.import`
   - `api.admin.contacts.promote`
   - `api.admin.workflow.events`
