# E2E Release Checklist (Operations + Live Tracking)

## 1. Assignment to Reminder Queue
- Create/Update a `trip_driver_assignments` row with pickup time.
- Verify two queue rows are created in `notification_queue` for the assignment:
  - `recipient_type = client`
  - `recipient_type = driver`
- Verify `idempotency_key` format:
  - `<assignment_id>:client:pickup`
  - `<assignment_id>:driver:pickup`

## 2. Manual Queue Execution
- Open **Admin → Notifications**.
- Click **Run Queue Now**.
- Verify success summary appears and queue status transitions (`pending -> sent/failed`).
- Verify `notification_logs` contains delivery records.

## 3. Failed Queue Retry
- Force one delivery failure (invalid WhatsApp config or token).
- Verify queue item becomes `failed`.
- Click **Retry Failed** in admin.
- Confirm failed rows move to `pending` and are attempted again.

## 4. Live Link Generation and Revoke
- Open **Admin → Trips → [Trip]**.
- Click **Live Link**, confirm link opens `/live/:token`.
- Click **Revoke Live**, confirm link is deactivated.
- Verify revoked links stop returning valid payload from `/api/location/live/:token`.

## 5. Driver Location Publish
- Login as mapped app driver.
- Open mobile trip detail and start live sharing.
- Verify `driver_locations` rows insert every ~20 seconds.
- Verify ping throttling: repeated rapid calls (<5s) are accepted as `throttled`.

## 6. Live Realtime View
- Open `/live/:token` in browser.
- With active driver sharing, verify marker updates without full-page refresh.
- Confirm fallback polling still keeps page updated if realtime disconnects.

## 7. Client Mobile Live Access
- Login as client.
- Open trip detail day with driver assignment.
- Tap **View Live Driver Location**.
- Verify app opens tokenized live page.

## 8. Cleanup Job
- Ensure there are active expired rows in `trip_location_shares`.
- Run `POST /api/location/cleanup-expired` (cron secret or admin auth).
- Verify expired rows are set `is_active = false`.

## 9. Security Checks
- Non-admin user cannot call admin-only endpoints:
  - `/api/location/share` (POST/DELETE)
  - `/api/notifications/retry-failed`
- Non-driver user cannot publish to `/api/location/ping`.
- Client cannot fetch share link for another client’s trip (`/api/location/client-share`).

## 10. WhatsApp Webhook Hardening
- Ensure `WHATSAPP_APP_SECRET` is configured.
- Send unsigned payload to `/api/whatsapp/webhook` and verify `401`.
- Send correctly signed payload and verify `200`.
- Verify duplicate inbound WhatsApp location payloads are ignored:
  - `whatsapp_webhook_events.provider_message_id` remains unique
  - API response includes `duplicate_messages > 0` on replay.

## 11. Queue Reliability and Dead Letters
- Force queue delivery failures (invalid WhatsApp token / invalid push target).
- Verify retry schedule uses exponential backoff (`5 -> 10 -> 20 ...` minutes).
- Verify terminal failures are moved to `notification_dead_letters`.
- Verify `/api/health` includes `checks.notification_pipeline` with queue and dead-letter counts.

## 12. Password Rotation Gate (Pre-Production)
- During active development, credentials may remain stable for velocity.
- Before production cutover, rotate:
  - Supabase service role and anon keys (if exposed in dev workflows)
  - Firebase service account key
  - WhatsApp token/app secret
  - Google API keys used by server-side endpoints
  - Any admin test account passwords used during development
