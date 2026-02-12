# Client Experience SOP (Post-Trip Confirmation)

## Purpose
Define the exact client journey after trip confirmation, including service standards, automation triggers, ownership, and fallback rules.

## Scope
- Web Admin: `/admin/trips`, `/admin/trips/[id]`, notifications flows
- Mobile App: trip detail, itinerary view, push reception, "I've Landed"
- Backend: Supabase tables/functions (`trips`, `trip_driver_assignments`, `trip_accommodations`, `notification_logs`, `push_tokens`, `notification_queue`)

## Experience Goals
- Zero ambiguity: client always knows what happens next.
- Proactive communication: reminders happen before clients ask.
- High trust: visible driver, pickup, and support details.
- Fast exception handling: changes pushed immediately.

## SOP Timeline

### 1. Trip Confirmed (T+0)
**What client gets**
- Confirmation message with:
  - destination, date range, trip ID
  - inclusions/exclusions
  - payment status and next due date
  - support contact (WhatsApp + fallback phone/email)

**Operator action**
- Ensure trip status is set to confirmed.
- Validate client profile (email + phone).
- Send push + WhatsApp confirmation.

### 2. Pre-Trip Readiness (T-14 to T-7 days)
**What client gets**
- Document checklist (passport/visa/ID).
- Preference confirmation (budget, pace, food, accessibility).
- App onboarding instructions.

**Operator action**
- Complete/verify profile fields.
- Ensure itinerary has day-wise activities and locations.

### 3. Final Operations Lock (T-72 to T-24 hours)
**What client gets**
- Day 1 pickup details (time/location).
- Driver profile (name/phone/vehicle).
- Hotel details (name/address/contact).
- Packing/weather/currency reminder.

**Operator action**
- Assign driver per day.
- Fill accommodation details.
- Verify route and schedule on admin trip page.

### 4. Pickup Reminder (T-60 minutes)
**Default delivery policy**
- Primary: WhatsApp to client + driver.
- Secondary: Push notification where FCM token exists.

**Minimum message content**
- Pickup time + location
- Driver/client name and phone
- Trip/day reference
- Live location link (when active)

### 5. During Trip (Daily)
**What client gets**
- Morning briefing.
- Day itinerary with ordered route and activity timings.
- Real-time updates for changes.

**Operator action**
- Keep itinerary current in admin.
- Send immediate notifications for delays/changes.
- Monitor issue reports.

### 6. Post-Day and Post-Trip
**What client gets**
- End-of-day quick feedback prompt.
- Trip closure summary.
- Review/referral request and next-trip CTA.

**Operator action**
- Review service logs and feedback.
- Mark trip complete and archive key records.

## Automation Checklist (Mapped to Current System)

## A. Confirmation Automation
- Trigger: trip status moves to confirmed.
- Actions:
  - queue confirmation notification (`notification_queue`)
  - send push (if token in `push_tokens`)
  - generate WhatsApp text for manual/API send
  - log to `notification_logs`

## B. Final Ops Readiness Check
- Trigger: daily cron for trips starting in <=72h.
- Checks:
  - `trip_driver_assignments` exists for day 1
  - `trip_accommodations` exists for day 1
  - pickup time/location present
- On failure:
  - alert admin (dashboard + push/email)

## C. Pickup Reminder (Priority)
- Trigger: scheduler at `pickup_time - 60 min`.
- Recipients: driver + associated client.
- Channel strategy:
  - WhatsApp first
  - push fallback/add-on
- Dedupe:
  - one send per trip/day/recipient/channel key

## D. Live Location Sharing
- Trigger: day starts or pickup reminder sent.
- Actions:
  - generate temporary share context (trip/day)
  - include share link in reminders
  - store location pings in `driver_locations`

## E. Exception Alerts
- Trigger examples:
  - driver reassigned
  - pickup delayed
  - hotel changed
- Actions:
  - immediate push + WhatsApp template
  - append event to `notification_logs`

## Operational Standards (SLA Targets)
- Response to client support message: <= 5 minutes (active trip window).
- Driver assignment locked before day start: >= 12 hours.
- Pickup reminder success rate target: >= 98%.
- Failed notification retries: 3 attempts within 10 minutes.

## Data Requirements (Must Be Present)
- Client: full name, email, phone.
- Driver: full name, phone, vehicle details.
- Assignment: day number, pickup time, pickup location.
- Itinerary: ordered activities with location and timing.
- Accommodation: hotel name + address at minimum.

## Risks and Controls
- Missing phone/email -> block automation and show admin warning.
- Missing geocode -> still send schedule; degrade route optimization gracefully.
- Push token invalid -> mark inactive and continue WhatsApp.
- Duplicate sends -> idempotency key in queue processor.

## Next Implementation Steps
1. Build scheduled reminder processor for `notification_queue`.
2. Add WhatsApp provider integration (Meta Cloud API preferred).
3. Add delivery state model by channel in `notification_logs`.
4. Add admin "Automation Health" widget (success/fail/retry counts).
5. Add live-location session token and sharing controls.
