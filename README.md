# Keyhaus

Mobile-first Nigerian rental homes web app and installable PWA featuring room-by-room photo tours (flat + 360 panoramas) and honest neighborhood reports (electricity, roads, flooding, waste, water, security, mobile network).

## Tech Stack
- **Framework**: Next.js 15 (App Router, strict TypeScript, Server Components + Server Actions)
- **Styling**: Tailwind CSS v4 + Radix UI (`shadcn/ui` primitives) + `lucide-react`
- **Backend**: Supabase (Auth, Postgres, Storage, Row Level Security, `@supabase/ssr`)
- **Validation**: `react-hook-form` + `zod` (shared client/server schemas)
- **Media & 360**: `browser-image-compression` + `@photo-sphere-viewer/core` & `markers-plugin` (dynamic import, `ssr: false`)
- **PWA**: `@serwist/next` + `serwist`
- **Tests**: Vitest (unit) + Playwright (E2E smoke)

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings. (Without these env vars, Keyhaus runs in an interactive in-memory Demo Preview mode with the 10 seeded Nigerian listings.)
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup (Free Tier)

1. Create a free project at [supabase.com](https://supabase.com).
2. Run both migrations in the SQL Editor (or via `supabase db push`):
   - `supabase/migrations/202611230001_initial_schema.sql`
   - `supabase/migrations/202611230002_viewing_modes.sql`
3. Optional demo seed: run `supabase/seed.sql` to populate 10 demo listings across Lagos, Abuja (FCT), Rivers, Oyo, and Kano (including sample approximate coordinates and an illustrative 2D floor plan).
4. Verify RLS & column privileges by running `supabase/tests/rls_policy_test.sql` in `psql` or the SQL Editor.
5. **Google Sign-In**: Enable the Google provider under **Authentication → Providers** in Supabase and add `<your-app-url>/auth/callback` to Redirect URLs.
6. **Admin Promotion**: Admin accounts (`profiles.is_admin = true`) cannot be self-assigned via the client or RLS. Promote an operator manually via the Supabase SQL Editor or service role:
   ```sql
   update public.profiles set is_admin = true where id = '<user-uuid>';
   ```

### Supabase Free Tier Maintenance Notes
- **Storage limit (~1 GB)**: Keyhaus enforces WebP client-side compression (~250 KB flat, ~700 KB panorama), tiny compressed WebP depth maps in the `depth-maps` bucket, a 1 MB bucket file limit, max 12 rooms per listing, and max 10 published listings per landlord. Check storage usage in **Supabase Dashboard → Storage → Usage** (or **Project Settings → Billing & Usage**).
- **Waking a paused project**: Supabase Free projects pause after 7 days of inactivity. Open your Supabase Dashboard and click **Restore project**; allow 1–2 minutes for Postgres and Auth to resume.
- **Custom SMTP before launch**: Supabase's built-in email sender is heavily rate-limited (2 emails/hour). Before public launch, configure a free custom SMTP provider (such as **Brevo** 300/day free, **Resend** 100/day free, or **Zoho Mail**) under **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**.

## Listing Viewing Modes & Paid-Service Limits

Listing detail pages support four lazy-loaded viewing modes (Area View, Street View, 2D Plan, 3D View). Each mode loads its scripts/libraries only when opened and can be switched off immediately without a redeploy via environment variables:

| Mode | Env Flag (`"false"` / `"0"` disables) | Provider & Free-Tier / Quota Controls |
| --- | --- | --- |
| **Area View** | `FEATURE_AREA_VIEW` | Google Maps JavaScript API (`satellite` view) + Geocoding API. Centered on `approx_latitude`/`approx_longitude` (~400 m privacy circle, no street pin). |
| **Street View** | `FEATURE_STREET_VIEW` | Google Maps Street View (`StreetViewService` + `StreetViewPanorama`). Unlocked only after a viewing request is `accepted` (or for listing owner/admin) via `get_listing_location(listing_id)` RPC. |
| **2D Plan** | `FEATURE_2D_PLAN` | Anthropic Claude (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`). On-demand landlord/admin trigger only; never runs on page view. Cached permanently in `listing_floor_plans`. Only admins can click **Regenerate**. |
| **3D View** | `FEATURE_3D_VIEW` | Matterport HTTPS iframe embed (if `matterport_url` is set), Photo Sphere Viewer for `panorama` rooms, or Three.js 2.5D depth parallax using Hugging Face `Depth-Anything-V2` (`DEPTH_ESTIMATION_API_URL`, `DEPTH_ESTIMATION_API_KEY`) stored as small WebP files. Falls back cleanly to standard photos if unconfigured or pending. |

### Google Maps & Third-Party Cost Safeguards
1. **HTTP Referrer Restrictions**: In Google Cloud Console → **Credentials**, restrict `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to your production domain(s) (e.g. `https://*.vercel.app/*`, `https://keyhaus.ng/*`) and localhost during development, and restrict enabled APIs strictly to **Maps JavaScript API** (plus a separate server-side key or IP-restricted key for **Geocoding API** via `GOOGLE_MAPS_SERVER_API_KEY`).
2. **Free-Tier Credits & Quotas**: Google Maps Platform includes monthly free-tier credit / per-SKU free usage caps (see Google Maps Platform pricing). Set **daily request quota caps** per API and enable **Cloud Billing Budget Alerts** before production traffic.
3. **Anthropic & Hugging Face**: Set monthly spend limits on your Anthropic API workspace (`~$5–$10` covers hundreds of on-demand JSON floor plans). Hugging Face Serverless Inference free/low-tier has rate limits; when `DEPTH_ESTIMATION_API_URL` is unset or throttled, flat room photos still render normally without breaking the 3D tab.

## Deploying to Vercel (Hobby Plan)

1. Push this repository to GitHub and import into Vercel.
2. Add environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production `https://...` URL)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, optional `GOOGLE_MAPS_SERVER_API_KEY`
   - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
   - `DEPTH_ESTIMATION_API_URL`, `DEPTH_ESTIMATION_API_KEY`
   - `FEATURE_AREA_VIEW`, `FEATURE_STREET_VIEW`, `FEATURE_2D_PLAN`, `FEATURE_3D_VIEW`
3. Deploy with default Next.js build (`npm run build`). Keyhaus avoids Vercel-only services (KV, Blob, Edge Config) and disables Next.js Image Optimization (`images.unoptimized: true`), keeping hosting portable and within Vercel Hobby limits.

## Running Tests

- Unit tests (Vitest):
  ```bash
  npm test
  ```
- Typecheck & lint:
  ```bash
  npm run typecheck && npm run lint
  ```
- End-to-end smoke test (Playwright, with app running on port 3000):
  ```bash
  npx playwright install chromium
  npm run test:e2e
  ```