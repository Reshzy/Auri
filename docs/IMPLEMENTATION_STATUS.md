# Auri Implementation Status

Last updated: 2026-08-11

## Current phase

**Phase 4 complete (report periods and daily editor).** Phase 5 has not started.

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
- [x] Supabase-only SQL moved to `supabase/overlays/`
- [x] Server-only DAL: `requireAuthenticatedUser`, `ensureProfile`, ownership guards
- [x] Local `db:inspect` → `db:migrate` → `db:check` → `db:smoke` verified

### Phase 3 — Onboarding and settings

- [x] Resumable `/onboarding` wizard (welcome → profile → schedule → signatories → templates → ready)
- [x] Settings: `/app/settings/profile`, `schedule`, `signatories`, `templates`
- [x] Zod schemas: `profileSchema`, `weekdayRuleSchema`/`weekdayRulesSchema`, `workScheduleSchema`, `signatorySchema`
- [x] Server-only DAL: profiles update/complete, schedules, signatories, template availability, snapshot builders
- [x] Auth gates: `/onboarding` requires session; incomplete users blocked from `/app/*`; completed users leave onboarding
- [x] Active schedule integrity when saving/selecting schedules
- [x] Sample defaults from §7.2–7.4 as editable form defaults (not hard-coded constants)
- [x] Snapshot builders for `profile_snapshot` / `schedule_snapshot` / `signatory_snapshot`

### Phase 4 — Report periods and daily editor

- [x] First/second-half creation with transactional daily entries
- [x] Schedule classification + off labels; Aug 1–15 2026 fixture
- [x] Routes: `/app/reports`, `/new`, `/[reportId]`, `/[reportId]/edit`; dashboard current-period + recent
- [x] Mobile-first day editor (no spreadsheet grid); ordered accomplishments; remarks; classification
- [x] Time normalize (`700`/`7:00`/`07:00`); server worked/undertime minutes; manual override
- [x] Autosave states + sessionStorage failed-draft recovery keyed by user/report/entry
- [x] Copy previous workday; clear day with confirmation
- [x] `ReportValidationService` readiness (errors/warnings/infos)
- [x] Finalize / deliberate reopen; export `is_current` invalidated on reopen
- [x] Draft **Refresh from current settings** + `snapshots_refreshed_at`
- [x] DAL ownership scoping; finalized/archived mutation rejection
- [x] `pnpm reports:smoke` / `phase4:check`; Playwright suite skipped without Auth credentials
- [x] Docs: `docs/PHASE4_REPORTS.md`

## Quality gates (Phase 4)

| Check                  | Result                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| `pnpm format:check`    | (run at delivery)                                                 |
| `pnpm lint`            | (run at delivery)                                                 |
| `pnpm typecheck`       | Pass                                                              |
| `pnpm test`            | Pass (unit + live Postgres integration when `DATABASE_URL` set)   |
| `pnpm build`           | (run at delivery)                                                 |
| `pnpm templates:audit` | (run at delivery)                                                 |
| `pnpm auth:check`      | (run at delivery; live Auth E2E still skipped without public env) |
| `pnpm db:check`        | (run at delivery)                                                 |
| `pnpm db:smoke`        | (run at delivery)                                                 |
| `pnpm reports:smoke`   | (run at delivery)                                                 |
| `pnpm test:e2e`        | Skipped unless `E2E_USER_*` + Supabase public env configured      |
| Live Auth E2E          | Skipped — no usable hosted Supabase Auth test account in this env |

## Schema sources

| Layer                                     | Location                      | Environments                       |
| ----------------------------------------- | ----------------------------- | ---------------------------------- |
| Portable app schema                       | `src/db/schema/` → `drizzle/` | Local Postgres + Supabase Postgres |
| Auth FK + profile trigger + RLS + Storage | `supabase/overlays/`          | Production Supabase only           |
| Historical pre-Drizzle SQL                | `supabase/archive/`           | Reference only                     |

Phase 4 additive migration: `drizzle/0001_*.sql` adds `report_periods.snapshots_refreshed_at`.

## Environment variables

See `.env.example` and `docs/DATABASE.md`.

Optional for Playwright live Auth: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`.

Never commit `.env.local` or real passwords/keys.

## Manual setup still required

1. Confirm hosted Supabase Auth public keys + redirect URLs (needed for live Auth/onboarding/report E2E).
2. For production: Drizzle migrate with `DIRECT_URL` (includes `0001` refresh column), then apply `supabase/overlays/` in order.
3. Optional: configure Supabase service role for admin/live isolation checks.
4. Optional: set `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` for Playwright (onboarded test user only).
5. Phase 6 will activate runtime templates in `template_versions`; readiness also accepts Phase 0 audited source+manifest pairs.

## Assumptions

1. Drizzle owns portable schema; overlays never run against ordinary local Postgres.
2. Hosted Supabase Auth remains the identity provider during local web development.
3. `ensureProfile` / all mutations use only the verified Supabase user UUID.
4. Direct Postgres bypasses Data API RLS; DAL ownership scoping is mandatory.
5. Accomplishments remain `daily_entries.accomplishments text[]` (no separate items table).
6. `CUSTOM` period kind stays schema-supported but hidden from the main create UI.
7. Phase 5 presets are not wired into the day editor.

## Next work

1. Phase 5: accomplishment presets (CRUD, picker, shortcuts, use-count) — not started.
