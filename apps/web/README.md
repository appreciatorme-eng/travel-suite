# Travel Suite Web App

Next.js admin panel and client web app for Travel Suite.

## Quick Start

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GEMINI_API_KEY=
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - eslint
- `npm run test:e2e` - Playwright tests

## Notes

- Server-only utilities live in `src/lib/notifications.ts` (guarded by `server-only`).
- Shared formatting helpers live in `src/lib/notifications.shared.ts` and are safe to import in client components.
- Admin notification routes require an authenticated admin user.
