# Environment variables

Last updated: 2026-08-23

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

## Public (browser-safe)

| Name                                   | Purpose                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical site URL (no trailing slash). Used for metadata and Auth redirects. |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL (`https://<project-ref>.supabase.co`).                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key (`sb_publishable_…`). Safe for the browser.            |

OAuth client IDs and secrets for Google, GitHub, and Facebook belong in the **Supabase Dashboard** (Authentication → Providers), not in Next.js env.

## Server only

| Name                        | Purpose                                                                          |
| --------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Runtime Postgres (local, or Supabase **pooler** in production).                  |
| `DIRECT_URL`                | `drizzle-kit` migrate (local same as runtime; production direct/session pooler). |
| `SUPABASE_URL`              | Storage API URL. Trusted server/setup only.                                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage admin. Bypasses RLS. Not user authorization.                             |
| `AURI_TEMPLATE_BUCKET`      | Default `templates`                                                              |
| `AURI_GENERATED_BUCKET`     | Default `generated-reports`                                                      |
| `AURI_DEFAULT_TIMEZONE`     | Default `Asia/Manila`                                                            |

## Admin / CI only

| Name                                       | Purpose                                          |
| ------------------------------------------ | ------------------------------------------------ |
| `AURI_MIGRATE_TARGET`                      | `local` \| `ci` \| `preview` \| `production`     |
| `AURI_ALLOW_PRODUCTION_MIGRATE`            | Must be `1` together with production target      |
| `AURI_INCREMENTAL_DATABASE_URL`            | Empty disposable DB for 0003 replay              |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`     | Disposable onboarded Auth user                   |
| `E2E_USER_B_EMAIL` / `E2E_USER_B_PASSWORD` | Second disposable user                           |
| `PLAYWRIGHT_BASE_URL`                      | Optional; otherwise Playwright starts `next dev` |

## Vercel mapping

Set **Preview** and **Production** separately. Preview must not use production `DATABASE_URL`, `DIRECT_URL`, or Storage keys.

GitHub Actions quality job uses dummy Supabase URL/publishable placeholders sufficient for `next build` and public pages. Authenticated E2E and Storage jobs read repository **secrets**, never fork pull-request secrets.
