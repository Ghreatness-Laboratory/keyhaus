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

## 6. Coordinate Privacy & Street View Gating
- **Decision**: Added `approx_latitude` and `approx_longitude` (rounded to ~400 m) to `GRANT SELECT` for public Area View circles, while excluding exact `latitude` and `longitude` from public `SELECT` privileges and exposing exact Street View coordinates only through `SECURITY DEFINER` RPC `get_listing_location(listing_id)` (checking viewing request `accepted`, listing ownership, or `is_admin`).
- **Why**: Mirrors `address_line` privacy so landlords' exact street locations are never leaked via browser DevTools or direct PostgREST queries.

## 7. Admin Lock & Runtime Feature Flags
- **Decision**: Added `profiles.is_admin boolean not null default false` with `REVOKE UPDATE (is_admin)` and a `BEFORE UPDATE` trigger (`prevent_profile_admin_escalation`) rather than altering `user_role`. Wrapped viewing mode tabs with `getViewingModeFlags()` reading `FEATURE_*` env vars.
- **Why**: Keeps the `renter`/`landlord` role flow intact, blocks self-promotion to admin, and lets any viewing mode be toggled off via runtime environment configuration without redeploying.

