# Next Critical Steps (Feb 11, 2026)

This is the immediate execution roadmap after the tenant hardening + billing foundation pass.

## P0 Status Update (Feb 12, 2026)

- Completed:
  - Admin API auth/authorization regression coverage expanded (`/api/admin/clients`, `/api/admin/trips`, `/api/admin/workflow/events`, `/api/admin/contacts`).
  - WhatsApp webhook signature validation + replay protection (`whatsapp_webhook_events`).
  - Notification queue reliability hardening:
    - exponential retry backoff
    - configurable max attempts
    - dead-letter capture (`notification_dead_letters`)
  - `/api/health` now includes notification pipeline health (pending/failed/dead-letter pressure).
- Deferred by decision:
  - Secret/password rotation is intentionally deferred until pre-production hardening.
  - Rotation remains a mandatory release gate before production.

## P1 Status Update (Feb 12, 2026)

- Completed:
  - Observability finalization for CRM/Kanban APIs:
    - request ids in response payload/header
    - structured logs + operational metrics
    - Sentry crash capture
  - Admin dashboard health now shows notification pipeline status.
  - Android production readiness sign-off package:
    - release signing config via `android/key.properties`
    - release shrink/minify hardening
    - proguard baseline rules
    - repeatable `apps/mobile/scripts/android_signoff.sh`
    - release sign-off docs + checklist updates

## 1) Billing Admin UI (Highest)

- Build `/admin/billing` with:
  - invoice list (status, due date, balance)
  - invoice detail (trip/client link, line summary, payment history)
  - "mark paid" action writing to `invoice_payments`
- Add payment confirmation trigger to queue client notifications.

## 2) Admin API Security Tests

- Add API tests for:
  - unauthorized access rejection
  - non-admin access rejection
  - cross-organization access rejection
- Cover endpoints:
  - `/api/admin/clients`
  - `/api/admin/trips`
  - `/api/admin/workflow/events`

## 3) Notification Operations Dashboard

- Add admin view for `notification_queue`:
  - pending / sent / failed counters by channel
  - failed message details
  - retry action for failed queue records

## 4) WhatsApp Webhook Hardening

- Validate webhook signatures.
- Add replay protection and request age checks.
- Add structured audit logs for inbound/outbound tracking.

## 5) Android Production Readiness

- Execute real-device test matrix:
  - push in foreground/background/terminated states
  - deep-link open from notification
  - role onboarding (client/driver) and trip visibility
- Add release checklist results to docs before iOS pass.

## Architecture Note

Travel Suite automation is standardized on **Supabase Edge Functions + queue tables + scheduled workers** for consistency. External workflow engines are not part of the active implementation plan.
