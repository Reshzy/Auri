# Auri Implementation Status

Last updated: 2026-08-11

## Current phase

**Phase 2 revised (Drizzle + local PostgreSQL architecture).** Auth UI/Proxy preserved. Live local migrate/smoke skipped: `DATABASE_URL` is present but PostgreSQL rejected the password for user `postgres` (credentials not invented or logged).

**Phase 3 has not started.**

## Completed

### Phase 0 — Repository and template audit

- [x] Source templates, audit docs, manifests, `pnpm templates:audit`

### Phase 1 — Next.js and design foundation

- [x] App Router shells, tokens, tooling, motion, route placeholders

### Phase 2 — Supabase Auth + Drizzle data layer

- [x] Hosted Supabase Auth clients, Proxy, sign-up/in/out, forgot/reset, callback
- [x] Protected `/app/*` + auth-entry redirects
- [x] Drizzle ORM + `postgres` driver; `src/db/schema` canonical for eight §8 tables
- [x] Committed `drizzle/` migrations (portable Postgres)
- [x] Supabase-only SQL moved to `supabase/overlays/` (auth FK, trigger, RLS, storage)
- [x] Pre-Drizzle core SQL archived under `supabase/archive/`
- [x] Server-only DAL: `requireAuthenticatedUser`, `ensureProfile`, ownership guards
- [x] App layout calls `getAppUser()` when Supabase public env is configured
- [x] Env validation for `DATABASE_URL` / `DIRECT_URL` + local vs remote SSL/`prepare`
- [x] Scripts: `db:generate`, `db:migrate`, `db:check`, `db:studio`, `db:inspect`, `db:smoke`
- [x] Docs: `docs/DATABASE.md`
- [x] Slim `database.types.ts` (no duplicate table types)

## Quality gates (Phase 2 revision)

| Check                  | Result                                                  |
| ---------------------- | ------------------------------------------------------- |
| `pnpm format:check`    | Pass                                                    |
| `pnpm lint`            | Pass                                                    |
| `pnpm typecheck`       | Pass                                                    |
| `pnpm test`            | Pass (30 tests)                                         |
| `pnpm build`           | Pass                                                    |
| `pnpm templates:audit` | Pass                                                    |
| `pnpm auth:check`      | Pass (public Supabase configured; service role missing) |
| `pnpm db:check`        | Pass                                                    |
| Local `db:inspect`     | Failed: password authentication for `postgres`          |
| Local `db:migrate`     | Skipped (credential failure; DB not reset)              |
| Local `db:smoke`       | Skipped (credential failure; DB not reset)              |

## Schema sources

| Layer                                     | Location                      | Environments                       |
| ----------------------------------------- | ----------------------------- | ---------------------------------- |
| Portable app schema                       | `src/db/schema/` → `drizzle/` | Local Postgres + Supabase Postgres |
| Auth FK + profile trigger + RLS + Storage | `supabase/overlays/`          | Production Supabase only           |
| Historical pre-Drizzle SQL                | `supabase/archive/`           | Reference only                     |

## Environment variables

See `.env.example` and `docs/DATABASE.md`.

Never commit `.env.local` or real passwords/keys.

## Manual setup still required

1. Fix local `DATABASE_URL` / `DIRECT_URL` password for `localhost:5432/Auri`.
2. `pnpm db:inspect` → `pnpm db:migrate` → `pnpm db:smoke`.
3. Confirm hosted Supabase Auth redirect URLs.
4. For production: Drizzle migrate with `DIRECT_URL`, then apply `supabase/overlays/` in order.

## Assumptions

1. Drizzle owns portable schema; overlays never run against ordinary local Postgres.
2. Hosted Supabase Auth remains the identity provider during local web development.
3. `ensureProfile` uses only the verified Supabase user UUID.
4. Direct Postgres bypasses Data API RLS; DAL ownership scoping is mandatory.
5. Template audit discrepancies and source DOCX/XLSX remain untouched.
6. Phase 3 onboarding/settings not started.

## Next work

1. Operator: correct local Postgres password and run migrate/smoke.
2. Phase 3: onboarding and settings (not started).
