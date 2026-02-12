# Implementation Plan - GoBuddy Adventures MVP

## Goal Description
Build a complete AI-powered travel planning application with the GoBuddy Adventures brand. This includes the core itinerary generation engine, weather forecasts, currency conversion, interactive maps, and PDF export.

## Current Status: ✅ Phase 5 Complete (Security Hardening)

## 2026-02-12 Implementation Update (Security & Quality Pass)

### ✅ Completed Security Hardening
- **Firebase Service Account Key**: Rotated and secured. Old keys deleted from GCP. Key stored as Supabase secret only.
- **Edge Function Auth**: `send-notification` (v8) now enforces JWT verification and admin role check internally.
- **AI Agents**: Added JWT authentication + sliding-window rate limiting (5 req/min per user).
- **CORS**: Restricted AI agent endpoints to specific methods (GET, POST, OPTIONS) and headers.
- **Logging**: Replaced all `print()` statements with structured Python `logging`.
- **Linting**: Modernized Flutter `analysis_options.yaml` with strict rules.
- **CI/CD**: Created GitHub Actions pipeline for web, mobile, agents, and migrations.

### ✅ Completed Features

#### 1. Project Structure
**Directory**: `projects/travel-suite`
```text
├── apps
│   ├── mobile/         # Flutter (Dart) - iOS/Android ✅
│   ├── web/            # Next.js 16 (Main App + Admin) ✅
│   └── agents/         # Python AI Agents (FastAPI) ✅
├── packages
│   └── shared/         # Shared types/utils (Future)
└── supabase
    ├── schema.sql      # Master Schema ✅
    ├── migrations/     # 24 SQL Migrations ✅
    └── functions/      # Edge Functions (send-notification) ✅
```

#### 2. Database Schema (Supabase) ✅
- [x] `profiles`: Users linked to Auth with CRM fields
- [x] `organizations`: Multi-tenant orgs with subscription tiers
- [x] `itineraries`: User's saved itineraries
- [x] `trips`: Core booking entity with org scoping
- [x] `driver_locations`: Real-time GPS data
- [x] `notification_queue`: Scheduled automation (no n8n)
- [x] `push_tokens`: FCM device tokens
- [x] RLS policies: Full org-scoped security applied

#### 3. AI Itinerary Engine ✅
- **Endpoint**: `POST /api/chat/trip-planner`
- **AI Provider**: Google Gemini 1.5 Flash (Free Tier)
- **Features**:
  - Multi-agent team (Researcher, Planner, Budgeter)
  - Structured JSON itinerary output
  - JWT Auth + Rate Limiting protected

#### 4. PDF Generation ✅
- **Library**: `@react-pdf/renderer`
- **Implementation**: Client-side rendering
- **Branding**: GoBuddy Adventures header/footer

#### 5. Weather Integration ✅
**File**: `lib/external/weather.ts`
- **Source**: [Open-Meteo](https://open-meteo.com)
- **API**: `GET /api/weather?location=Paris&days=7`
- **Features**: Geocoding, 7-day forecast

#### 6. Currency Conversion ✅
**File**: `lib/external/currency.ts`
- **Source**: [Frankfurter](https://frankfurter.app)
- **API**: `GET /api/currency?amount=100&from=USD&to=EUR`

#### 7. Maps Integration ✅
- **Library**: MapLibre GL JS (via mapcn)
- **Component**: `ItineraryMap.tsx`
- **Features**: Interactive pins, route visualization, numbered markers
- **Status**: Leaflet removed (2026-02-12)

#### 8. Image Integration ✅
- **Source**: Wikimedia Commons
- **API**: `GET /api/images?query=Eiffel+Tower`

#### 9. Authentication ✅
- **Provider**: Supabase Auth
- **Methods**: Email/Password, Google OAuth
- **Google Client ID**: Configured and working

#### 10. Design System (GoBuddy Identity) ✅
- **Primary Color**: `#00d084` (Vivid Green)
- **Secondary Color**: `#124ea2` (Royal Blue)
- **Typography**: Cormorant Garamond (Headings), Poppins (Body)

---

## 🚀 Phase 2: Tour Operator Notification System

### Goal
Build a **Mobile App for Clients** + **Admin Panel for Travel Agents** with automated push notifications.

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client App    │     │   Admin Panel   │     │   Driver        │
│    (Flutter)    │     │    (Next.js)    │     │  (WhatsApp)     │
│                 │     │                 │     │                 │
│ • View trips    │     │ • Manage trips  │     │ • Receives      │
│ • Get notified  │     │ • Assign drivers│     │   pickup info   │
│ • See driver    │     │ • Send alerts   │     │ • Client details│
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │    Supabase     │
            │  + Firebase FCM │
            └─────────────────┘
```

### New Database Tables (Implemented)
| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant travel agents |
| `external_drivers` | Third-party drivers |
| `trip_driver_assignments` | Driver assigned per trip day |
| `trip_accommodations` | Hotel info per day |
| `push_tokens` | Client device tokens for push (FCM) |
| `notification_logs` | Audit trail |
| `notification_queue` | Scheduled jobs (replacing n8n) |
| `invoices` | Billing foundation |

### Mobile App Features (`apps/mobile/`)
- [x] **My Trips** - View upcoming and past trips
- [x] **Trip Details** - Day-by-day itinerary
- [x] **Driver Info** - Today's driver contact
- [x] **Push Notifications** - Automatic alerts (FCM)
- [x] **"I've Landed" Button** - Triggers driver info
- [x] **Offline Support** - (Planned for future)

### Admin Panel Features (`apps/web/admin/`)
- [x] **Dashboard** - Overview of active trips
- [x] **Driver Management** - Add/edit external drivers
- [x] **Trip Assignment** - Assign drivers (with conflict check) + hotels + map
- [x] **Send Notifications** - Manual triggers + status
- [x] **Client Management** - CRM, Kanban, Tags
- [x] **Billing** - Invoices (foundation only, no Stripe yet)

### Notification Types
| Type | Trigger | To Client | To Driver |
|------|---------|-----------|-----------|
| `trip_confirmed` | Admin confirms | Push | WhatsApp |
| `driver_assigned` | Driver assigned | Push | WhatsApp |
| `daily_briefing` | 7am each day | Push | WhatsApp |
| `client_landed` | Client taps button | Push | WhatsApp |

### Monetization Model
| Feature | Free Tier | Pro Tier ($29/mo) |
|---------|-----------|-------------------|
| Trips/month | 10 | Unlimited |
| Drivers | 5 | Unlimited |
| Push notifications | 100/mo | Unlimited |
| White-label branding | No | Yes |

---

## Verification Plan
1. ✅ **Schema**: SQL applied to Supabase (21 migrations)
2. ✅ **AI API**: Generates valid itineraries (JWT verified)
3. ✅ **Weather API**: Returns 7-day forecasts
4. ✅ **Currency API**: Converts amounts correctly
5. ✅ **Map**: Displays activity pins, route segments, and numbered markers (MapLibre)
6. ✅ **PDF**: Downloads correctly
7. ✅ **Notifications**: Edge Function deployed, FCM configured
