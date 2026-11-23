# Architecture & Product Decisions (`DECISIONS.md`)

Where the Keyhaus brief was silent, we recorded our engineering choices below to keep everything inside the free tiers of Supabase and Vercel.

## 1. Preview / Unconfigured Supabase Mode
- **Decision**: When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are empty (e.g., fresh AI Studio preview or local UI review before provisioning Supabase), `src/lib/data/queries.ts` and Server Actions transparently fall back to an in-memory Node demo repository (`src/lib/data/demo-store.ts`) with an `HttpOnly` demo session cookie (`keyhaus_demo_uid`).
- **Why**: Prevents crashes when booting without `.env.local` while keeping 100% of real Supabase SSR queries, RLS, RPCs, and Storage paths intact as soon as env vars are configured.

## 2. Street Address Column Protection
- **Decision**: Used BOTH PostgreSQL column-level privileges (`REVOKE SELECT ON listings`, `GRANT SELECT (<non-address columns>)`) AND `SECURITY DEFINER` RPC `get_listing_address(listing_id)`.
- **Why**: Ensures even direct SQL/PostgREST `SELECT address_line` attempts from `anon` or non-accepted `authenticated` callers are rejected at the database layer.

## 3. Panorama Auto-Detection Tolerance
- **Decision**: `detectRoomKindFromRatio(width, height)` classifies an image as `panorama` when `Math.abs(width / height - 2) <= 0.28`, and allows the landlord to confirm or toggle `360 Panorama` vs `Flat photo` in Step 3.
- **Why**: Accommodates minor cropping variance on smartphone 360 camera exports while letting landlords override.

## 4. Next.js 15 + Serwist Webpack Build
- **Decision**: Used Next.js 15 (`15.5.x`) with `@serwist/next` (`9.5.x`) and `images: { unoptimized: true }`.
- **Why**: Reliable Serwist webpack integration for service worker precaching, offline fallback (`/offline`), and zero Vercel Image Optimization quota consumption.

## 5. Phase 2 Schema (`ground_reports`)
- **Decision**: Included `public.ground_reports` table and RLS policy (readable once `>= 3` reports exist for a listing; insertable only by renters with an `accepted` viewing request) in `202611230001_initial_schema.sql`, without building UI yet.
- **Why**: Avoids breaking schema migrations after launch data exists.
