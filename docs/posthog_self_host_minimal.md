# PostHog Self-Host (Minimal for Travel Suite)

This setup keeps only what Travel Suite needs: server-side operational metrics from API routes.

Official repo:
- `https://github.com/PostHog/posthog`

## 1) Deploy PostHog

Use PostHog's official self-host instructions from the repo/docs. After deployment, note:
- PostHog host URL (example: `https://posthog.yourdomain.com`)
- Project API key from your PostHog project

## 2) Configure Travel Suite Web

In `apps/web/.env.local`:

```bash
POSTHOG_HOST=https://posthog.yourdomain.com
POSTHOG_PROJECT_API_KEY=phc_xxxxxxxxx
```

Compatibility fallback is also supported:

```bash
POSTHOG_API_KEY=phc_xxxxxxxxx
```

## 3) What Events We Send (Only required ones)

Travel Suite emits only operational events required for production debugging:
- `api.health.checked`
- `api.notifications.send`
- `api.notifications.send.error`
- `api.notifications.queue.processed`
- `api.notifications.queue.error`

Source:
- `apps/web/src/lib/observability/metrics.ts`

## 4) Verify

1. Start web app and hit `/api/health` and notification APIs.
2. In PostHog Events, confirm above events appear.
3. If no events appear, verify:
   - `POSTHOG_HOST` is reachable from web server
   - project API key is correct
   - reverse proxy allows POST to `/capture/`
