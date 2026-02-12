# Findings & Decisions

## Requirements
<!-- Captured from implementation_plan.md and brand_identity.md -->
- Mobile app for clients (Flutter) - iOS/Android
- Admin panel for travel agents (Next.js)
- Push notifications via Firebase FCM
- Driver assignment and daily briefings
- WhatsApp integration for drivers
- Multi-tenant support (organizations)
- GoBuddy Adventures brand identity

## Research Findings

### Project Architecture
- **Monorepo structure** at `projects/travel-suite/`
- **apps/mobile/** - Flutter client app
- **apps/web/** - Next.js admin + client portal
- **apps/agents/** - Python AI agents (FastAPI + Agno)
- **supabase/** - Database schema, 24 migrations, Edge Functions
- **docs/** - 17 documentation files
- **scripts/** - Utility scripts (RLS verification)

### Mobile App Stack
- **Platforms:** Android, iOS (Flutter web target exists but unused)
- **State management:** flutter_riverpod
- **Data modeling:** freezed 3.x + json_serializable (abstract class pattern)
- **Backend:** supabase_flutter (Auth, Database, Realtime)
- **Maps:** flutter_map with OpenStreetMap tiles
- **Animations:** flutter_animate (stagger, scale, fade)
- **Loading states:** shimmer (skeleton placeholders)
- **Advanced layouts:** sliver_tools + SliverAppBar
- **Notifications:** firebase_messaging + flutter_local_notifications
- **Linting:** Modernized analysis_options.yaml with strict rules, avoid_print, const enforcement

### Flutter Dart SDK
- Requires SDK `^3.10.8`
- Freezed 3.x uses `abstract class` pattern (not `@freezed class`)
- `@JsonKey` on factory params produces warnings but works
- `withOpacity` deprecated, prefer `withValues()` for color manipulation
- Android release: signing, ProGuard, minification configured

### Web App Stack
- Next.js 16 with React 19
- shadcn/ui component library
- Tailwind CSS 4
- @react-pdf/renderer for PDF export
- Google Gemini 1.5 Flash for AI itinerary generation
- MapLibre GL JS (via mapcn) for maps
- @sentry/nextjs for error monitoring
- Playwright for e2e testing (configured)
- Node >= 22 < 23

> **Update (2026-02-12):** Unused Leaflet packages removed; MapLibre GL is the sole map library.

### AI Agents Stack
- FastAPI (Python) with Agno framework
- 3 agents: trip_planner, support_bot, recommender
- JWT auth via Supabase Auth API (`api/auth.py`)
- Per-user sliding-window rate limiting (`api/rate_limit.py`)
- Structured Python `logging` module (no print statements)
- Knowledge base RAG on startup

### External APIs (All Free Tier)
| Service | Purpose | Endpoint |
|---------|---------|----------|
| Open-Meteo | Weather forecasts | `api/weather?location=X&days=7` |
| Frankfurter | Currency conversion | `api/currency?amount=X&from=USD&to=EUR` |
| Wikimedia | Location images | `api/images?query=X` |
| Supabase Auth | Authentication | Built-in |

### Firebase Project Details
- **Project ID:** `travel-suite-5d509`
- **Android Package:** `com.gobuddy.gobuddy_mobile`
- **iOS Bundle ID:** `com.gobuddy.gobuddyMobile`
- **Admin SDK:** Service account key stored as Supabase secret (rotated 2026-02-12)
- **Key Status:** Only 1 active key in GCP (all 6 old keys deleted)

### Notification Architecture
- **FCM V1:** Push notifications sent via Firebase Cloud Messaging Version 1
- **Supabase Edge Functions:** `send-notification` (v8) handles message construction and delivery
- **Auth:** JWT verification + admin role check enforced internally
- **Secrets Management:** Firebase credentials stored as Supabase secrets (`FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`)
- **Token Management:** Auto-deactivation of invalid FCM tokens (404/400 responses)
- **Admin Panel:** `SendNotificationDialog` for custom push notifications from trip detail
- **Mobile:** `Info.plist` configured for background fetch and remote notifications
- **Database:** `push_tokens`, `notification_logs`, `notification_queue`, `notification_delivery_status` tables
- **Queue Processing:** Cron/admin-triggered with HMAC signing, service-role bearer, or shared-secret auth
- **Structured logging:** JSON-formatted logs with timestamps in Edge Function

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Supabase Edge Functions | Server-side security, avoids exposing Firebase keys to client |
| FCM V1 over Legacy | Recommended by Google, better security, more features |
| navigatorKey | Handles deep-linking in Flutter from background/terminated states |
| Supabase over Firebase DB | Already in use, Postgres preferred, free tier sufficient |
| Flutter over React Native | Company already using Flutter |
| MapLibre GL over Leaflet | Better performance, TypeScript support, more active maintenance |
| Agno framework | Multi-agent collaboration for AI trip planning |
| JWT auth on AI endpoints | Prevents unauthorized access to LLM resources |
| Sliding-window rate limiting | Protects upstream LLM quota (Gemini 1,500 req/day) |
| Organization-scoped RLS | Enables true multi-tenant data isolation |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Notification navigation in background | Implemented global `navigatorKey` in `main.dart` |
| FCM payload inconsistency | Standardized on `trip_id` (snake_case) for mobile deep-linking |
| Supabase CLI Deno linting | Recognized as environment setup (Deno) rather than code errors |
| Freezed 3.x syntax incompatibility | Changed from `@freezed class` to `abstract class X with _$X` |
| Android SDK not available | Cannot build APK on current machine |
| `flutterfire configure` failed | Missing `xcodeproj` ruby gem. Resolved with `gem install xcodeproj` |
| Edge Function `atob` failure | `atob` failed on PEM key due to non-base64 characters. Fixed with regex sanitization |
| Docker deployment failed | `npx supabase functions deploy` fixed by deploying v8 with JWT auth |
| Database Type Consistency | Fixed TypeScript errors in admin panel by updating `database.types.ts` |
| Hardcoded DB credentials in web script | Removed `apps/web/scripts/run-migration.js` and deleted scripts directory |
| Mobile trip data mismatch | Mobile was reading `itineraries` directly; updated to query `trips` with join |
| "I've Landed" server sync | Mobile calls `/api/notifications/client-landed` with user token |
| Flutter doctor environment | Flutter SDK present but Android SDK missing, Xcode incomplete |
| Deep-link navigation timing | Added deferred navigation if `navigatorKey` not ready |
| flutter_local_notifications API change | Updated `show` to use `notificationDetails` named parameter for v20+ |
| Flutter analyze warnings | Current warnings for `@JsonKey`, deprecated `withOpacity`; no errors |
| Android desugaring requirement | Enabled core library desugaring with `desugar_jdk_libs:2.1.4` |
| Firebase key compromise risk | Rotated key, deleted all 6 old keys from GCP, stored as Supabase secret |
| HNSW migration dependency | `policy_embeddings` table doesn't exist yet; migration deferred |
| IVFFlat on empty table | Switched to HNSW index (m=16, ef_construction=64) |

## Resources
- Brand identity: `docs/brand_identity.md`
- Implementation plan: `docs/implementation_plan.md`
- Monetization plan: `docs/monetization.md`
- Database schema: `supabase/schema.sql`
- Google OAuth setup: `docs/GOOGLE_OAUTH_SETUP.md`
- Mobile README: `apps/mobile/README.md`
- Deep dive analysis: `docs/deep_dive_analysis.md`
- Client experience SOP: `docs/client_experience_sop.md`
- Android production sign-off: `docs/android_production_signoff_2026-02-12.md`
- GoBuddy website: https://gobuddyadventures.com/

## Visual/Browser Findings
- GoBuddy logo: https://gobuddyadventures.com/wp-content/uploads/2021/12/GoBuddy-Full-Logo-Transparent-1.png
- Primary color: `#00d084` (Vivid Green)
- Secondary color: `#124ea2` (Royal Blue)
- Heading font: Cormorant Garamond (serif)
- Body font: Poppins (sans-serif)

---
*Updated: 2026-02-12 00:28 CST — Post-security-hardening, key rotation, and full documentation pass*
