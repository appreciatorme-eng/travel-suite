# Deployment Instructions for Notification System

Follow these steps to deploy the backend components required for push notifications and scheduled pickup reminders.

## 1. Database Migration
Apply the latest schema/migrations (`push_tokens`, `notification_logs`, reminder queue triggers, HNSW index):

```bash
npx supabase db push
```

> **Note:** This includes migration- `20260212070000_switch_ivfflat_to_hnsw.sql` — HNSW index (requires `policy_embeddings` table to exist first)
- `20260212090000_profile_onboarding.sql` — Profile onboarding fields
- `20260212123000_webhook_and_notification_reliability.sql` — webhook reliability improvementsy, but the table must exist first.

## 2. Supabase Edge Function Configuration

You need to set the `FIREBASE_SERVICE_ACCOUNT` and `FIREBASE_PROJECT_ID` secrets for the `send-notification` function.

1.  **Get your Firebase Service Account JSON (store outside repo):**
    *   Go to Firebase Console -> Project Settings -> Service accounts.
    *   Generate a new private key (JSON file).
    *   Copy the **entire content** of this JSON file.
    *   Minify it to a single line if possible.

2.  **Set the secrets:**
    Replace `<YOUR_FIREBASE_PROJECT_ID>` with your project ID (e.g., `travel-suite-5d509`).
    Replace `<YOUR_SERVICE_ACCOUNT_JSON>` with the JSON content you copied.

    **Note:** ensure you wrap the JSON in single quotes `'` to avoid shell expansion.

```bash
npx supabase secrets set FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT='<YOUR_SERVICE_ACCOUNT_JSON>'
```

## 3. Deploy Edge Function

Deploy the `send-notification` function to Supabase:

```bash
npx supabase functions deploy send-notification
```

> **Important:** The Edge Function (v8) now verifies JWT tokens (`Authorization: Bearer <token>`) and checks for the `admin` role internally. The `--no-verify-jwt` flag is **no longer used**.

## 4. Verify Next.js Environment
Ensure your `apps/web/.env` (and Vercel/Production env) has:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NOTIFICATION_CRON_SECRET=... # Strong random secret for queue processor
NOTIFICATION_SIGNING_SECRET=... # Optional HMAC signing secret
```

### Optional: WhatsApp Cloud API (Recommended)
To send real WhatsApp reminders (instead of push-only fallback), configure:
```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_ID=...
```
If missing, scheduled reminders still run and will use push where possible.

## 5. Configure Scheduled Queue Processing
The reminder queue is auto-populated from `trip_driver_assignments` updates via DB triggers.

Run a scheduler every minute (Vercel Cron or Supabase scheduled call) to invoke:
```
POST /api/notifications/process-queue
Header: x-notification-cron-secret: <NOTIFICATION_CRON_SECRET>
```

Example curl:
```bash
curl -X POST "https://<your-web-domain>/api/notifications/process-queue" \
  -H "x-notification-cron-secret: <NOTIFICATION_CRON_SECRET>"
```

Start the queue processor locally (admin UI):
- Go to **Admin → Notifications**.
- Click **Run Queue Now**.

## 6. Live Location Sharing Endpoints
- `POST /api/location/share` (admin auth): create/reuse live link
- `GET /api/location/share` (admin auth): fetch live link
- `DELETE /api/location/share` (admin auth): revoke live link
- `GET /api/location/live/:token` (public): read latest location (rate-limited)
- `POST /api/location/ping` (driver auth): write GPS ping
- `POST /api/location/cleanup-expired` (cron/admin): deactivate expired links

## 7. Build Mobile App
Rebuild the mobile app to pick up the `Info.plist` changes:

```bash
cd apps/mobile
flutter clean
flutter pub get
cd ios
pod install
cd ..
flutter run
```

### Mobile live-location publishing
- Driver app calls `POST /api/location/ping` every ~20 seconds when active.
- Ensure `apps/mobile/lib/core/config/supabase_config.dart` has a real deployed web base URL:
```dart
static const String apiBaseUrl = 'https://<your-deployed-web-domain>';
```

## 8. CI/CD Pipeline
A GitHub Actions workflow is set up in `.github/workflows/ci.yml`. It runs on push to `main` and checks:
- Web: Lint, Type Check, Build
- Mobile: Flutter Analyze
- Agents: Python Syntax, Pytest
- Migrations: SQL Syntax
