# Android Production Readiness Sign-Off (P1) - 2026-02-12

## Build/Signing Hardening Completed

- `apps/mobile/android/app/build.gradle.kts` updated:
  - Release signing now supports `android/key.properties` keystore config.
  - Falls back to debug signing only when keystore is not configured.
  - Enables `isMinifyEnabled = true` and `isShrinkResources = true` in release builds.
  - Adds ProGuard config usage.
- Added `apps/mobile/android/app/proguard-rules.pro` baseline keep rules.
- Added `apps/mobile/android/key.properties.example` template.

## Repeatable Sign-Off Script

- Added `apps/mobile/scripts/android_signoff.sh`
- Script runs, in order:
  1. `flutter pub get`
  2. `flutter analyze`
  3. `flutter test`
  4. `flutter test --coverage`
  5. `flutter build apk --release`
  6. `flutter build appbundle --release`

## Manual Device Validation Matrix (Required)

Run this on at least one physical Android device before release:

1. Auth role onboarding: `client` and `driver`.
2. Push notification receipt in foreground/background/terminated.
3. Notification tap deep-link lands on correct trip/day.
4. Driver live location publish + client live view.
5. Pickup reminder delivery via WhatsApp + push fallback.
6. App cold-start and navigation performance sanity check.

## Sign-Off Criteria

Release is approved only when all are true:

- `android_signoff.sh` completes with no errors.
- Device matrix above passes.
- No open P1 Android blockers in `progress.md`.
