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
2. Run `supabase/migrations/202611230001_initial_schema.sql` in the SQL Editor (or via `supabase db push`).
3. Optional demo seed: run `supabase/seed.sql` to populate 10 demo listings across Lagos, Abuja (FCT), Rivers, Oyo, and Kano.
4. Verify RLS & column privileges by running `supabase/tests/rls_policy_test.sql` in `psql` or the SQL Editor.
5. **Google Sign-In**: Enable the Google provider under **Authentication → Providers** in Supabase and add `<your-app-url>/auth/callback` to Redirect URLs.

### Supabase Free Tier Maintenance Notes
- **Storage limit (~1 GB)**: Keyhaus enforces WebP client-side compression (~250 KB flat, ~700 KB panorama), a 1 MB bucket file limit, max 12 rooms per listing, and max 10 published listings per landlord. Check storage usage in **Supabase Dashboard → Storage → Usage** (or **Project Settings → Billing & Usage**).
- **Waking a paused project**: Supabase Free projects pause after 7 days of inactivity. Open your Supabase Dashboard and click **Restore project**; allow 1–2 minutes for Postgres and Auth to resume.
- **Custom SMTP before launch**: Supabase's built-in email sender is heavily rate-limited (2 emails/hour). Before public launch, configure a free custom SMTP provider (such as **Brevo** 300/day free, **Resend** 100/day free, or **Zoho Mail**) under **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**.

## Deploying to Vercel (Hobby Plan)

1. Push this repository to GitHub and import into Vercel.
2. Add environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production `https://...` URL)
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