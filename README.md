# Travel Suite Project

A comprehensive AI-powered travel planning and management platform for tour operators. Built as a **B2B SaaS product** for travel agents using modern technologies.

## 🏗️ Architecture

```
travel-suite/
├── apps/
│   ├── mobile/          # Flutter client app (iOS/Android)
│   ├── web/             # Next.js 16 web app + admin panel
│   └── agents/          # Python AI agents (FastAPI + Agno)
├── docs/                # Project documentation (18 docs), including `manual_testing_guide.md`
├── scripts/             # Utility scripts (RLS verification)
├── supabase/            # Edge Functions + 24 migrations
│   ├── functions/       # send-notification (v8)
│   ├── migrations/      # 24 SQL migration files
│   └── schema.sql       # Master schema reference
└── packages/            # Shared code (future)
```

## 🚀 Quick Start

### Web App
```bash
cd apps/web
npm install
npm run dev
```

### Mobile App
```bash
cd apps/mobile
flutter pub get
flutter run
```

### AI Agents
```bash
cd apps/agents
pip install -r requirements.txt
python main.py
```
> **Note**: All AI endpoints require JWT authentication and are rate-limited (5 req/min, 60 req/hr per user).

## 📱 Mobile App Features

- **Authentication**: Email/password + Google OAuth via Supabase
- **Role Onboarding**: Progressive profile setup with specific fields for `Client` (Bio, Diet, Mobility) and `Driver` (Vehicle, License)
- **Trips Overview**: Animated card list with shimmer loading
- **Trip Detail**: Collapsing header (SliverAppBar), day selector, activity timeline
- **Driver Info**: View assigned driver details
- **Notifications**: FCM push + local notifications for "I've Landed" feature
- **Maps**: Interactive OpenStreetMap via flutter_map
- **Driver Live Location**: Driver-mode users can publish real-time location pings (~20s interval)
- **Client Live Tracking**: Open current live driver route from trip detail

### Key Dependencies
- `supabase_flutter` - Backend integration
- `flutter_riverpod` - State management
- `freezed` - Immutable data classes (3.x, abstract class pattern)
- `flutter_animate` - Entrance animations
- `shimmer` - Loading skeletons
- `flutter_map` - Interactive maps
- `firebase_messaging` + `flutter_local_notifications` - Push + local notifications

## 🌐 Web App Features

- **AI Itinerary Generator**: Powered by Google Gemini 1.5 Flash
- **Weather Integration**: Open-Meteo API (free, no key required)
- **Currency Conversion**: Frankfurter API (free, unlimited)
- **PDF Export**: @react-pdf/renderer (client-side)
- **Maps**: MapLibre GL JS (via mapcn)
- **Authentication**: Supabase Auth with Google OAuth
- **Monitoring**: Sentry (error tracking) + PostHog (product analytics)
- **Admin Trip Editor**:
  - Route-optimized day sequencing from itinerary locations
  - Numbered map markers + route distance labels
  - Auto-calculated start/end times (30-minute slots, travel-time aware)
  - Nearby hotel suggestions with one-click autofill (name/address/phone)
  - Driver assignment conflict detection (visual busy indicators)
  - Tokenized live-location links per trip/day (`/live/:token`)
  - Reminder queue + driver ping visibility per day
- **Admin User Controls**:
  - Client creation with travel preference metadata
  - Per-client tag dropdown (`standard`, `vip`, `repeat`, `corporate`, `family`, `honeymoon`, `high_priority`)
  - New clients default to `lead` stage (with backfill migration for existing records)
  - Lifecycle stages include payment and review phases (`payment_pending`, `payment_confirmed`, `review`)
  - Kanban lifecycle board with stage movement controls (`lead` → `past`)
  - Dedicated Kanban page (`/admin/kanban`) with drag/drop and transition timeline
  - Pre-lead contact inbox with search + import (phone picker/CSV) and one-click "Move to Lead"
  - Per-client phase notification toggle in Kanban (default ON)
  - Per-stage notification toggles in Settings (enable/disable auto client notifications by phase)
  - Role override (`client` ↔ `driver`) from Clients panel
  - Driver account linking auto-syncs linked app user role to `driver`
- **Admin Panel Sections** (13):
  - Activity, Analytics, Billing, Clients, Drivers, Kanban, Notifications, Planner, Security, Settings, Support, Templates, Trips

## 🤖 AI Agents

| Agent | Endpoint | Description |
|-------|----------|-------------|
| **Trip Planner** | `POST /api/chat/trip-planner` | Multi-agent team (researcher + planner + budgeter) |
| **Support Bot** | `POST /api/chat/support` | RAG-powered support with knowledge base |
| **Recommender** | `POST /api/chat/recommend` | Personalized destination recommendations |

### Security & Infrastructure
- **Auth**: JWT verification via Supabase Auth API (dev fallback when `SUPABASE_URL` not set)
- **Rate Limiting**: In-memory sliding-window per user
  - AI endpoints: 5 req/min, 60 req/hr
  - General endpoints: 30 req/min, 500 req/hr
- **CORS**: Restricted to configured origins, methods (GET, POST, OPTIONS), and specific headers
- **Logging**: Structured Python `logging` module (`gobuddy.*` namespace)
- **Additional Endpoints**: `/recommend/preferences`, `/recommend/feedback`, `/conversations/{user_id}`

## 💼 Monetization

Travel Suite is designed as a **B2B SaaS product for travel agents** with tiered subscriptions:

| Feature | Free Tier | Pro Tier ($29/mo) |
|---------|-----------|-------------------|
| Trips/month | 10 | Unlimited |
| Drivers | 5 | Unlimited |
| Push notifications | 100/mo | Unlimited |
| White-label branding | No | Yes |

See `docs/monetization.md` for full details. `invoices` + `invoice_payments` tables are in place for billing foundation.

## 🧭 Client Operations SOP

Post-confirmation client experience flow and automation checklist:
- `docs/client_experience_sop.md` — Client experience flow
- `docs/e2e_release_checklist.md` — Pre-release validation runbook
- `docs/whatsapp_tracking_flow.md` — Template catalog + webhook/location flow
- `docs/critical_foundations_2026-02-11.md` — Tenant isolation + CI + billing foundation
- `docs/next_critical_steps_2026-02-11.md` — Execution roadmap for current sprint
- `docs/observability_and_notification_architecture_2026-02-11.md` — Logging, metrics, uptime, notification refactor
- `docs/observability_finalization_2026-02-12.md` — Request-level observability completion
- `docs/posthog_self_host_minimal.md` — Minimal self-host PostHog setup
- `docs/android_production_signoff_2026-02-12.md` — Android release sign-off gates

## 🔔 Automation & Notifications

- Runtime standardized on **Supabase Edge Functions + queue tables + scheduled workers** (no n8n)
- `send-notification` Edge Function (v8): JWT-verified, admin-only, FCM v1 API
- Notification logging and admin-triggered sends
- Welcome email sent on first successful mobile auth (via web API)
- Scheduled jobs planned for daily briefings and reminders
- WhatsApp template sends for operational reminders with push fallback
- Payment-confirmed stage trigger queues WhatsApp + push confirmation
- All lifecycle stage transitions (`lead` → `past`) auto-queue client notifications
- Lifecycle auto-notifications can be toggled per stage via `/api/admin/workflow/rules`
- Lifecycle stage transitions audit-logged in `workflow_stage_events`
- WhatsApp webhook endpoint for inbound live-location payloads (`/api/whatsapp/webhook`)
- Admin webhook health diagnostics for WhatsApp/location ingestion (`/api/admin/whatsapp/health`)
- Admin one-click driver phone normalization for WhatsApp mapping

## ❤️ Health Check

- System health endpoint: `/api/health`
- Includes dependency checks for:
  - Database connectivity
  - Supabase Edge Functions reachability
  - Firebase FCM endpoint reachability
  - WhatsApp API availability
  - External APIs (Open-Meteo weather, Frankfurter currency)
  - Observability stack configuration (`SENTRY_DSN`, `POSTHOG_PROJECT_API_KEY`/`POSTHOG_API_KEY`, uptime heartbeat URL)
- Response includes `request_id` and structured JSON logs for queue + notification routes
- CRM and workflow endpoints also emit `request_id` + structured operational metrics

## 🎨 Brand Identity

- **Primary**: `#00d084` (Vivid Green)
- **Secondary**: `#124ea2` (Royal Blue)
- **Headings**: Cormorant Garamond
- **Body Text**: Poppins

## 📊 Database (Supabase)

**20 tables** in `public` schema. **21 migrations applied**, 3 pending locally.

Key tables:
- `profiles` — User profiles with CRM fields (travel preferences, lifecycle stage, tags)
- `organizations` — Multi-tenant orgs with subscription tier
- `itineraries` — AI-generated travel plans
- `trips` — Booked trips with `organization_id` for tenant safety
- `external_drivers` — Third-party drivers per org
- `driver_accounts` — App user ↔ external driver mapping
- `trip_driver_assignments` — Per-day driver assignments
- `push_tokens` — FCM device tokens
- `notification_queue` / `notification_logs` — Queue + audit trail
- `notification_delivery_status` — Per-channel delivery tracking (whatsapp/push/email)
- `crm_contacts` — Pre-lead contact inbox
- `workflow_stage_events` — Lifecycle audit log
- `workflow_notification_rules` — Per-stage notification toggles
- `invoices` / `invoice_payments` — Billing foundation
- `trip_location_shares` — Tokenized live-location links
- `trip_location_share_access_logs` — Anti-abuse rate limit logs

Security baseline:
- Organization-scoped RLS hardening applied across all admin tables
- Verification script: `scripts/verify_rls_policies.sql`
- Queue processor supports signed cron HMAC headers and service-role bearer
- Public live-share endpoint has per-IP/token rate limiting + token expiry + revocation
- Security diagnostics: `SELECT * FROM security_diagnostic_report();`
- Admin security API: `/api/admin/security/diagnostics`
- Admin security UI: `/admin/security`

## 🔒 Security

- **Firebase SA Key**: Rotated (2026-02-12). Only one active key in GCP. Stored as Supabase secret only.
- **Git Security**: Root `.gitignore` blocks `firebase-service-account.json` and `*-service-account.json`
- **Edge Function**: JWT + admin role verification (v8 deployed)
- **AI Agents**: JWT auth + per-user rate limiting on all endpoints
- **CORS**: Restricted origins, methods, and headers
- **Structured Logging**: All services use structured logging (Python `logging`, JSON for Edge Functions)

## 🔄 CI/CD

- **GitHub Actions**: `.github/workflows/ci.yml` runs on push/PR to `main`
  - **Web**: lint → type-check → build
  - **Agents**: Python syntax check + pytest
  - **Mobile**: `flutter analyze`
  - **Migrations**: SQL file syntax check
- **GitHub Secrets required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🛠️ Development Status

### ✅ Completed
- [x] Web app foundation (Next.js 16, React 19)
- [x] Mobile app foundation (Flutter, Dart 3.10+)
- [x] Supabase integration (Auth, Database, Realtime)
- [x] AI itinerary generation (Gemini 1.5 Flash)
- [x] Weather & currency APIs
- [x] PDF export
- [x] Mobile UI polish (animations, shimmer, SliverAppBar)
- [x] Driver assignment feature
- [x] Push notification system (FCM + Edge Function v8)
- [x] Firebase service account key rotation
- [x] CI/CD pipeline (GitHub Actions)
- [x] AI agent JWT auth + rate limiting
- [x] CORS restriction on AI agents
- [x] Structured logging in all services
- [x] Admin panel (13 sections)
- [x] CRM + Kanban lifecycle board
- [x] Billing foundation (invoices + payments)
- [x] Organization-scoped RLS hardening
- [x] Android release infrastructure (signing, ProGuard, minification)
- [x] Observability (Sentry + PostHog integration)

### 🔄 In Progress
- [ ] End-to-end push notification validation on real devices
- [ ] Apply remaining local migrations (3 pending)
- [ ] Automated pickup reminders (T-60 min): WhatsApp + push fallback
- [ ] Driver/client live location sharing workflow completion

### 🔮 Future
- [ ] Stripe billing integration
- [ ] App Store / Play Store submission
- [ ] Vercel deployment
- [ ] AI Agents production hosting
- [ ] Offline support
- [ ] Multi-language support
- [ ] White-label support

## 📄 License

Proprietary — GoBuddy Adventures
