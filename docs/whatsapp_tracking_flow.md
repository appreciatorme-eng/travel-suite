# WhatsApp Tracking Flow

## Approved Utility Templates

Configure these in Meta WhatsApp Manager and keep names aligned with `.env.local`.

1. `pickup_reminder_60m_v1` (client)
- Params order:
1) `client_name`
2) `pickup_time`
3) `pickup_location`
4) `driver_name`
5) `live_link`

2. `pickup_reminder_driver_60m_v1` (driver)
- Params order:
1) `driver_name`
2) `pickup_time`
3) `pickup_location`
4) `client_name`
5) `day_number`
6) `live_link`

3. `trip_delay_update_v1`
- Params order:
1) `destination`
2) `delay_minutes`
3) `day_number`

4. `driver_reassigned_v1`
- Params order:
1) `client_name`
2) `new_driver_name`
3) `pickup_time`
4) `pickup_location`

5. `payment_confirmed_v1`
- Params order:
1) `client_name`
2) `destination`

6. Lifecycle transition templates (kanban stage updates)
- `lifecycle_lead_v1` -> params: `client_name`
- `lifecycle_prospect_v1` -> params: `client_name`, `destination`
- `lifecycle_proposal_v1` -> params: `client_name`, `destination`
- `lifecycle_payment_pending_v1` -> params: `client_name`, `destination`
- `payment_confirmed_v1` -> params: `client_name`, `destination`
- `lifecycle_active_v1` -> params: `client_name`
- `lifecycle_review_v1` -> params: `client_name`
- `lifecycle_past_v1` -> params: `client_name`

## Webhook Location Parsing

- Endpoint: `GET/POST /api/whatsapp/webhook`
- `GET` handles Meta verification using `WHATSAPP_VERIFY_TOKEN`.
- `POST` parses incoming `messages[].type = "location"`.
- Parsed fields:
  - sender WA id
  - message id
  - latitude/longitude
  - optional name/address
  - timestamp

Current processing behavior:
- match sender to `profiles.phone_normalized`
- if profile role is `driver`, save location to `driver_locations`
- attach active trip when available (`driver_id` match + date window)

Admin diagnostics:
- Endpoint: `GET /api/admin/whatsapp/health`
- Surface in admin notifications page as **WhatsApp Webhook Health** card
- Shows:
  - location ping volume (1h, 24h)
  - stale active driver trips
  - unmapped external drivers
  - latest driver ping ages
  - driver profiles missing `phone_normalized`

Phone mapping repair:
- Endpoint: `POST /api/admin/whatsapp/normalize-driver-phones`
- Supports:
  - bulk repair (`{}` body)
  - single driver repair (`{ "driver_id": "<uuid>" }`)
- Admin UI includes:
  - **Fix All Phone Mapping**
  - per-driver **Fix** action in missing mapping list

## Hybrid Channel Strategy (Implemented)

1. Queue sends WhatsApp first for operational reliability.
2. Same queue entry also attempts push notification when `user_id` exists.
3. Success criteria is channel OR:
- WhatsApp success, or
- push success
4. Automatic retries for failures (max 3 attempts).
5. Pickup reminders include live tracking URL when available.
6. Lifecycle stage transitions now auto-queue client notifications for every phase move.
7. Stage auto-notifications can be enabled/disabled per phase via admin workflow rules.

## When to Move Users from WhatsApp to App-First

Switch a user to app-first if any condition is true:
- user has active app session + FCM token
- user opens live tracking 2+ times in a trip
- user has 2+ booked trips
- user uses itinerary changes/support frequently

Even after app-first:
- keep WhatsApp for critical reminders (pickup/driver reassignment/delay).

## Required Environment Variables

- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_TEMPLATE_LANG` (default `en`)
- `WHATSAPP_TEMPLATE_PICKUP_CLIENT`
- `WHATSAPP_TEMPLATE_PICKUP_DRIVER`
- `WHATSAPP_TEMPLATE_TRIP_DELAY`
- `WHATSAPP_TEMPLATE_DRIVER_REASSIGNED`
- `WHATSAPP_TEMPLATE_PAYMENT_CONFIRMED`
- `WHATSAPP_TEMPLATE_LIFECYCLE_LEAD`
- `WHATSAPP_TEMPLATE_LIFECYCLE_PROSPECT`
- `WHATSAPP_TEMPLATE_LIFECYCLE_PROPOSAL`
- `WHATSAPP_TEMPLATE_LIFECYCLE_PAYMENT_PENDING`
- `WHATSAPP_TEMPLATE_LIFECYCLE_ACTIVE`
- `WHATSAPP_TEMPLATE_LIFECYCLE_REVIEW`
- `WHATSAPP_TEMPLATE_LIFECYCLE_PAST`

## Stage Notification Toggles

- Endpoint: `GET/POST /api/admin/workflow/rules`
- Backed by: `workflow_notification_rules` table
- Admin settings page includes toggle switches for each lifecycle stage.
