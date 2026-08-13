# Testing

Last updated: 2026-08-13

## Layout

| Suite                    | Command                                                            | Database                           | Secrets                            |
| ------------------------ | ------------------------------------------------------------------ | ---------------------------------- | ---------------------------------- |
| Unit                     | `pnpm test:unit`                                                   | No                                 | No                                 |
| Integration              | `pnpm test:integration`                                            | `DATABASE_URL` (skipped if absent) | No                                 |
| All Vitest               | `pnpm test`                                                        | Integration skipped without DB     | No                                 |
| Public Playwright        | `pnpm test:e2e:public`                                             | No                                 | Clerk publishable key for app boot |
| Authenticated Playwright | `pnpm test:e2e:authenticated`                                      | App DB                             | Disposable Clerk `E2E_USER_*`      |
| Smokes                   | `pnpm db:smoke`, `reports:smoke`, `presets:smoke`, `exports:smoke` | Local/CI Postgres                  | No                                 |
| Live Storage             | `pnpm exports:storage:smoke`                                       | No                                 | Supabase URL + service role        |
| Office visual            | `pnpm office:visual`                                               | No                                 | LibreOffice or Microsoft Office    |

Mocked Clerk route tests are **not** authenticated E2E.

## CI

`.github/workflows/ci.yml`:

1. **quality** — frozen lockfile, format, lint, typecheck, migrate from zero, `0003` incremental replay, `pnpm test`, build, template audits, auth/db/security checks, smokes, `pnpm audit:deps`. Uses a disposable Postgres service. No production deploy.
2. **playwright-public** — Chromium; uploads HTML report on failure only.
3. **playwright-authenticated** — same-repo only; requires `E2E_USER_EMAIL`. Traces off. No report artifacts (may contain personal data).
4. **storage-smoke** — same-repo only; requires service role. Not run on forks.

## Playwright credentials

Use a disposable onboarded Clerk **test** user (`pk_test` / `sk_test` instance). Never commit passwords or `storageState`. Optional `E2E_USER_B_*` for cross-user checks.

Clerk testing tokens (`CLERK_TESTING_TOKEN`) are optional; see [Clerk Playwright testing](https://clerk.com/docs/guides/development/testing/playwright/overview).

## Fixtures

`tests/fixtures/reports/*.json` are visual-review cases (15-row, 16-row, long names, XML/Filipino characters, undertime override). Generated Office files are artifacts, not committed outputs.

## Isolation tests

Phase 8 integration tests create disposable users A/B/C in Postgres and assert user B cannot read, export, download, or delete user A’s rows (memory Storage). Live Supabase Storage two-user checks remain a manual/CI-gated job.
