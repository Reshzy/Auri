# Environment variables

Last updated: 2026-08-13

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

## Public (browser-safe)

| Name                                              | Purpose                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                            | Canonical site URL (no trailing slash). Used for metadata and Clerk redirects. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Clerk publishable key (`pk_test_` or `pk_live_`).                              |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                   | Default `/sign-in`                                                             |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                   | Default `/sign-up`                                                             |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Default `/app`                                                                 |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Default `/onboarding`                                                          |

## Server only

| Name                        | Purpose                                                                          |
| --------------------------- | -------------------------------------------------------------------------------- |
| `CLERK_SECRET_KEY`          | Clerk secret. Never `NEXT_PUBLIC_`.                                              |
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
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`     | Disposable onboarded Clerk user                  |
| `E2E_USER_B_EMAIL` / `E2E_USER_B_PASSWORD` | Second disposable user                           |
| `PLAYWRIGHT_BASE_URL`                      | Optional; otherwise Playwright starts `next dev` |

## Vercel mapping

Set **Preview** and **Production** separately. Preview must not use production `DATABASE_URL`, `DIRECT_URL`, or Storage keys.

GitHub Actions quality job uses dummy Clerk placeholders sufficient for `next build` and public pages. Authenticated E2E and Storage jobs read repository **secrets**, never fork pull-request secrets.
