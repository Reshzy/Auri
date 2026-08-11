# Auri Implementation Status

Last updated: 2026-08-11

## Current phase

**Phase 3 complete (onboarding and settings).** Phase 4 has not started.

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
- [x] Snapshot builders for `profile_snapshot` / `schedule_snapshot` / `signatory_snapshot` (no report create)

## Quality gates (Phase 3)

| Check                  | Result                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| `pnpm format:check`    | Pass                                                                |
| `pnpm lint`            | Pass                                                                |
| `pnpm typecheck`       | Pass                                                                |
| `pnpm test`            | Pass (52 tests; mocked DAL/unit — not live integration)             |
| `pnpm build`           | Pass                                                                |
| `pnpm templates:audit` | Pass                                                                |
| `pnpm auth:check`      | Pass (static; live Auth skipped — public env not detected by check) |
| `pnpm db:check`        | Pass                                                                |
| Local `db:inspect`     | Pass (Phase 2 verification)                                         |
| Local `db:migrate`     | Pass (Phase 2 verification)                                         |
| Local `db:smoke`       | Pass (Phase 2 verification)                                         |
| Live Auth E2E          | Skipped — no usable hosted Supabase Auth test account in this env   |

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

1. Confirm hosted Supabase Auth public keys + redirect URLs (needed for live onboarding E2E).
2. For production: Drizzle migrate with `DIRECT_URL`, then apply `supabase/overlays/` in order.
3. Optional: configure Supabase service role for admin/live isolation checks.
4. Phase 6 will activate runtime templates in `template_versions`; Phase 3 availability also accepts Phase 0 audited source+manifest pairs.

## Assumptions

1. Drizzle owns portable schema; overlays never run against ordinary local Postgres.
2. Hosted Supabase Auth remains the identity provider during local web development.
3. `ensureProfile` / all mutations use only the verified Supabase user UUID.
4. Direct Postgres bypasses Data API RLS; DAL ownership scoping is mandatory.
5. Onboarding step resume is inferred from persisted domain state (no `onboarding_step` column in §8.1).
6. Template availability for Phase 3 = active `template_versions` row **or** Phase 0 manifest+source present.
7. Ready step offers period creation only as Phase 4 placeholder copy — no report creation.

## Next work

1. Phase 4: report periods and daily editor (not started).
