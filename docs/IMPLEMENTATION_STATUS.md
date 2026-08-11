# Auri Implementation Status

Last updated: 2026-08-11

## Current phase

**Phase 5 complete (accomplishment presets).** Phase 6 has not started.

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

### Phase 5 — Accomplishment presets

- [x] Shared `presetSchema` + normalize/order/search/merge helpers
- [x] Server-only presets DAL + `PresetService` + server actions
- [x] `/app/presets` CRUD, search, deactivate-with-confirm, empty/loading/error states
- [x] Idempotent starter-preset seeding (explicit empty-state action)
- [x] Daily-editor searchable multi-select picker + shortcut match (picker-scoped keyboard)
- [x] Server-authoritative apply with duplicate prevention, selection order, use_count / last_used_at
- [x] Dashboard quick action to manage presets
- [x] Soft delete via `is_active = false` (no normal hard delete)
- [x] `pnpm presets:smoke` / `phase5:check`; Playwright skipped without Auth credentials
- [x] Docs: `docs/PHASE5_PRESETS.md`

## Quality gates (Phase 5)

| Check                  | Result                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| `pnpm format:check`    | Pass                                                               |
| `pnpm lint`            | Pass                                                               |
| `pnpm typecheck`       | Pass                                                               |
| `pnpm test`            | Pass (112 tests; includes live Postgres Phase 4 + Phase 5)         |
| `pnpm build`           | Pass                                                               |
| `pnpm templates:audit` | Pass                                                               |
| `pnpm auth:check`      | Pass (static; service role optional/skipped)                       |
| `pnpm db:check`        | Pass                                                               |
| `pnpm db:smoke`        | Pass                                                               |
| `pnpm reports:smoke`   | Pass                                                               |
| `pnpm presets:smoke`   | Pass                                                               |
| `pnpm test:e2e`        | Skipped — no usable `E2E_USER_*` / live Auth credentials           |
| Live Auth E2E          | Skipped — no usable hosted Supabase Auth test account in this env  |

## Schema sources

| Layer                                     | Location                      | Environments                       |
| ----------------------------------------- | ----------------------------- | ---------------------------------- |
| Portable app schema                       | `src/db/schema/` → `drizzle/` | Local Postgres + Supabase Postgres |
| Auth FK + profile trigger + RLS + Storage | `supabase/overlays/`          | Production Supabase only           |
| Historical pre-Drizzle SQL                | `supabase/archive/`           | Reference only                     |

Phase 4 additive migration: `drizzle/0001_*.sql` adds `report_periods.snapshots_refreshed_at`.  
Phase 5: no new migration (`accomplishment_presets` already in core schema).

## Environment variables

See `.env.example` and `docs/DATABASE.md`.

Optional for Playwright live Auth: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`.

Never commit `.env.local` or real passwords/keys.

## Manual setup still required

1. Confirm hosted Supabase Auth public keys + redirect URLs (needed for live Auth/onboarding/report/preset E2E).
2. For production: Drizzle migrate with `DIRECT_URL` (includes `0001` refresh column), then apply `supabase/overlays/` in order.
3. Optional: configure Supabase service role for admin/live isolation checks.
4. Optional: set `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` for Playwright (onboarded test user only).
5. Phase 6 will activate runtime templates in `template_versions`; readiness also accepts Phase 0 audited source+manifest pairs.

## Assumptions

1. Drizzle owns portable schema; overlays never run against ordinary local Postgres.
2. Hosted Supabase Auth remains the identity provider during local web development.
3. `ensureProfile` / all mutations use only the verified Supabase user UUID.
4. Direct Postgres bypasses Data API RLS; DAL ownership scoping is mandatory.
5. Accomplishments remain `daily_entries.accomplishments text[]` (no separate items table; no preset IDs stored in the array).
6. `CUSTOM` period kind stays schema-supported but hidden from the main create UI.
7. Shortcut uniqueness is case-insensitive via lowercase canonical storage against the existing partial unique index.
8. Starter presets are added only through an explicit user action when the list is empty.

## Next work

1. Phase 6: DOCX runtime template and export — not started.
