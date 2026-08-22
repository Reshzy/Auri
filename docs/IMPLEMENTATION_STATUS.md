# Auri Implementation Status

Last updated: 2026-08-13

## Current phase

**Phase 10 implemented in-repo** (hardening, CI, production-readiness documentation). Remote production, live Storage, authenticated E2E, Vercel deploy, and Office visual gates remain pending where credentials or tools are absent.

## Completed

### Phase 0–9

Unchanged. See earlier status entries.

### Phase 10 — Hardening, CI, and deployment

- [x] GitHub Actions CI (clean-clone quality, public Playwright, gated authenticated E2E, gated Storage smoke)
- [x] Disposable Postgres migrate-from-zero + `0003_mighty_chamber` incremental replay **in CI** (local Docker absent; local schema check passed)
- [x] Server-auth overlays (`supabase/overlays/server-auth/`)
- [x] Security headers, `pnpm security:check`, `pnpm audit:deps`
- [x] Docs: `PHASE10_HARDENING_DEPLOYMENT.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `LAUNCH_CHECKLIST.md`, `TESTING.md`, `ENVIRONMENT.md`
- [ ] GitHub Actions green on this commit (requires push)
- [ ] Production Supabase migrate / buckets / templates
- [ ] Production Auth + authenticated Playwright
- [ ] Vercel production smoke
- [ ] Office visual / repair-warning review

## Quality gates (Phase 10)

| Check                                 | Result                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`      | Passed                                                                                                                        |
| `pnpm format:check`                   | Passed                                                                                                                        |
| `pnpm lint`                           | Passed (0 errors; pre-existing `.agents` vendor-skill template warning only)                                                  |
| `pnpm typecheck`                      | Passed                                                                                                                        |
| `pnpm test`                           | Passed — 212 tests (42 files), including local Postgres integration                                                           |
| `pnpm build`                          | Passed                                                                                                                        |
| `pnpm templates:audit`                | Passed                                                                                                                        |
| `pnpm docx:audit`                     | Passed                                                                                                                        |
| `pnpm xlsx:audit`                     | Passed (runtime SHA `a08195c6…eba6`)                                                                                          |
| `pnpm docx:smoke`                     | Passed                                                                                                                        |
| `pnpm xlsx:smoke`                     | Passed                                                                                                                        |
| `pnpm auth:check`                     | Passed                                                                                                                        |
| `pnpm db:check`                       | Passed                                                                                                                        |
| `pnpm db:migrate:verify`              | Passed (schema check against local `Auri`). Incremental 0003 replay not run locally (no disposable second database / Docker). |
| `pnpm db:smoke`                       | Passed                                                                                                                        |
| `pnpm reports:smoke`                  | Passed                                                                                                                        |
| `pnpm presets:smoke`                  | Passed                                                                                                                        |
| `pnpm exports:smoke`                  | Passed                                                                                                                        |
| `pnpm security:check`                 | Passed                                                                                                                        |
| `pnpm audit:deps`                     | Passed — no known production vulnerabilities at high level                                                                    |
| `pnpm test:e2e`                       | Passed — 10 public tests. Authenticated tests skipped (`E2E_USER_*` not configured).                                          |
| `pnpm storage:check`                  | Pending manual verification — skipped; service-role credentials absent                                                        |
| Visual LibreOffice / Microsoft Office | Pending manual verification — binaries absent                                                                                 |
| Live two-user Storage isolation       | Pending manual verification                                                                                                   |
| Production migrate / Vercel deploy    | Pending manual verification — targets not configured                                                                          |
| GitHub Actions clean-clone            | Pending manual verification — workflow not executed on GitHub in this session                                                 |

## Schema sources

| Layer                             | Location                         | Environments                                       |
| --------------------------------- | -------------------------------- | -------------------------------------------------- |
| Portable app schema               | `src/db/schema/` → `drizzle/`    | Local Postgres + Supabase Postgres                 |
| Server-auth RLS / private buckets | `supabase/overlays/server-auth/` | Production Supabase (apply after Drizzle migrate)  |
| Historical Auth overlays          | `supabase/overlays/001`–`004`    | Do not apply as-is (`profiles.id ≠ auth.users.id`) |
| Historical pre-Drizzle SQL        | `supabase/archive/`              | Reference only                                     |

## Environment variables

See `.env.example` and `docs/ENVIRONMENT.md`.

Optional for Playwright live Auth: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_USER_B_*`.

Never commit `.env.local` or real passwords/keys.

## Manual setup still required

1. Confirm production Auth Site URL, redirect URLs, and OAuth providers.
2. Production: Drizzle migrate with `DIRECT_URL`; apply `supabase/overlays/server-auth/` only.
3. `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for bucket setup and template upload.
4. Vercel project with split preview/production env; Node 24.x.
5. Disposable onboarded Auth E2E users.
6. Microsoft Word/Excel (or LibreOffice plus a later Word/Excel confirmation) visual review.

## Assumptions

1. Supabase Auth is the canonical identity provider; Supabase also provides Postgres + private Storage.
2. DAL ownership scoping is mandatory; `auth.uid()` policies are not the primary boundary.
3. CI dummy Auth keys are placeholders for `next build` only, not a production instance.
4. Dark mode and all §21 post-v1 features remain deferred.

## Launch classification

**READY AFTER LISTED MANUAL GATES**

## Next work

Complete the manual gates in `docs/LAUNCH_CHECKLIST.md`. Do not start post-v1 features.
