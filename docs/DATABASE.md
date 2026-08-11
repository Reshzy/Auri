# Auri database setup

## Architecture

| Concern                 | Local development                        | Production                  |
| ----------------------- | ---------------------------------------- | --------------------------- |
| App schema + migrations | Drizzle → PostgreSQL `Auri` on localhost | Drizzle → Supabase Postgres |
| ORM                     | Drizzle (`src/db`)                       | Drizzle (`src/db`)          |
| Auth                    | Clerk                                    | Clerk                       |
| Storage                 | Optional for Phase 6 template upload     | Private Supabase Storage    |
| RLS / `auth.uid()`      | Not available on ordinary Postgres       | Stale overlays — see below  |
| Deployment              | —                                        | Vercel                      |

**Drizzle is the canonical application-schema source of truth** (`src/db/schema/` → `drizzle/`). Do not edit a parallel portable schema under `supabase/migrations/`.

Local PostgreSQL does **not** include Supabase Auth, Storage, `auth.users`, or `auth.uid()`. Clerk is the identity provider. Docker / `supabase start` are optional alternatives for Storage only, not required for Auth.

Direct PostgreSQL connections (Drizzle) bypass Supabase Data API RLS. The server data-access layer always scopes by the verified internal profile UUID from Clerk. Do not rely on `auth.uid()` RLS for Clerk deployments unless JWT claims and policies are intentionally rewritten.

## Clerk → database ownership

1. Clerk verifies the session (`auth()` / `currentUser()`).
2. `requireAuthenticatedUser()` calls `ensureProfileForClerkUser(clerkUserId)`.
3. `profiles.clerk_user_id` (text, unique) stores the Clerk `user_…` id.
4. `profiles.id` is an internal UUID used by all tenant foreign keys (`user_id`).
5. Never write a Clerk string into a UUID ownership column. Never accept browser-supplied owner ids.

## Environment

1. Copy `.env.example` → `.env.local`.
2. Fill Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and site URL.
3. Set local database URLs (password only in `.env.local`, never commit):

```dotenv
DATABASE_URL=postgresql://postgres:<LOCAL_POSTGRES_PASSWORD>@localhost:5432/Auri
DIRECT_URL=postgresql://postgres:<LOCAL_POSTGRES_PASSWORD>@localhost:5432/Auri
```

- `DATABASE_URL` — app runtime (local Postgres, or Supabase **pooled** URL in production).
- `DIRECT_URL` — `drizzle-kit` migrate/generate (local same as runtime; production: direct or session pooler).

Optional for trusted template Storage scripts (server/setup only — never `NEXT_PUBLIC_`):

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Local commands

```bash
pnpm db:inspect    # non-destructive schema listing
pnpm db:generate   # after editing src/db/schema
pnpm db:migrate    # apply committed drizzle/ migrations
pnpm db:check      # static consistency checks
pnpm db:studio     # Drizzle Studio
pnpm db:smoke      # insert/select/delete disposable profile row
pnpm reports:smoke # Phase 4 disposable report classification smoke
pnpm presets:smoke # Phase 5 disposable preset CRUD/apply smoke
pnpm docx:prepare  # Phase 6 runtime DOCX derivation
pnpm docx:smoke    # Phase 6 DOCX mapping/generation smoke
```

Do **not** use destructive reset commands. Do **not** run `drizzle-kit push` against production.

## Production deployment (schema + overlays)

1. Set production `DATABASE_URL` (pooler) and `DIRECT_URL` (direct/session).
2. Apply Drizzle migrations with an explicit production step: `pnpm db:migrate` using production `DIRECT_URL`.
3. Apply Storage bucket overlay carefully (`supabase/overlays/004_storage_buckets.sql`). Do **not** apply `001`–`003` as-is — they assume Supabase Auth UUID identity (`auth.users` FK, `auth.uid()` RLS) and conflict with Clerk + internal profile UUIDs.
4. Confirm Clerk redirect URLs for the Vercel site.

## Profile provisioning

After Clerk session validation, `ensureProfileForClerkUser(clerkUserId)` upserts a profile with a new internal UUID and the Clerk id. Idempotent; never trusts a client-supplied user id. There is no `auth.users` trigger under Clerk.

## Why DAL authorization is mandatory

- Drizzle uses a privileged Postgres connection that can bypass RLS.
- Every user-owned query/mutation must filter by the session profile UUID in the DAL.
- Legacy Supabase Auth RLS overlays are not a safe Clerk boundary until rewritten.
- Do not expose user tables or private files through an unauthenticated Supabase Data API.
- Service-role keys are for trusted server/setup code only.

## Local verification (2026-08-11)

Verified against existing database `Auri` on `localhost:5432` (credentials never logged):

1. `pnpm db:inspect` — public tables: `accomplishment_presets`, `daily_entries`, `profiles`, `report_exports`, `report_periods`, `signatories`, `template_versions`, `work_schedules`; Drizzle migrations table present.
2. `pnpm db:migrate` — committed `drizzle/` migrations applied successfully (no push/reset).
3. `pnpm db:check` — static assertions pass; local policy `prepare=true`, `ssl=false`.
4. `pnpm db:smoke` — disposable profile CRUD passed; smoke row deleted.

No schema or migration-history conflict was observed. No destructive repair was performed.

## Phase 3 data-access notes

- Onboarding and settings mutations live in server-only DAL modules under `src/db/dal/` and server actions under `src/features/settings/actions.ts`.
- Session owner UUID comes from Clerk → `profiles.id` only. Client-supplied `user_id` / `owner_id` fields are rejected.
- `profiles.active_schedule_id` is set only to a `work_schedules` row owned by the same user.
- Snapshot builders (`src/db/dal/snapshots.ts`) copy current profile, active schedule, and active signatories into JSON for `report_periods` inserts.
- Template availability checks active `template_versions` rows and falls back to audited Phase 0 `templates/manifests` + `templates/source` for onboarding UX. Real DOCX/XLSX export requires an activated runtime template (Phase 6/7) or documented local runtime fallback.

## Phase 4 data-access notes

- Report/daily DAL: `src/db/dal/reports.ts`, `src/db/dal/daily-entries.ts`.
- Services: `ReportPeriodService`, `DailyEntryService`, validation in `src/server/services/`.
- Additive column: `report_periods.snapshots_refreshed_at` (migration `drizzle/0001_*.sql`).
- Report create inserts the period and all daily rows in one transaction; duplicate active ranges are returned idempotently.
- Mutations always scope by authenticated user UUID + report id; finalized/archived reports reject edits.
- Reopen sets related `report_exports.is_current = false` without deleting export rows.
- See `docs/PHASE4_REPORTS.md` for time/undertime, autosave, and readiness rules.

## Phase 5 data-access notes

- Preset DAL: `src/db/dal/presets.ts` (CRUD, soft deactivate, starter seed, transactional apply).
- Service: `PresetService` in `src/server/services/preset-service.ts`.
- Table `accomplishment_presets` already exists in core schema (no Phase 5 migration).
- Apply path locks the daily entry (`FOR UPDATE`), updates `accomplishments text[]`, and increments `use_count` / `last_used_at` only for inserted presets — all in one transaction.
- Shortcut uniqueness is per-user via partial unique index; app stores lowercase canonical shortcuts for case-insensitive conflicts.
- Deletion in the UI is deactivation (`is_active = false`) to preserve usage history.
- See `docs/PHASE5_PRESETS.md` for validation, starters, picker, and duplicate rules.

## Phase 6 data-access notes

- Runtime DOCX lives under `templates/runtime/`; source under `templates/source/` is immutable.
- Trusted upload (`pnpm templates:upload:docx` / `pnpm templates:upload:xlsx`) writes to the private `templates` bucket and activates `template_versions` for the matching `template_key` only (`accomplishment` or `dtr`).
- DOCX export returns a verified buffer in Phase 6; generated-report Storage + `report_exports` persistence remain Phase 8.
- See `docs/PHASE6_DOCX_EXPORT.md`.

## Local verification commands

```bash
pnpm db:smoke        # disposable profile CRUD
pnpm reports:smoke   # disposable Aug 2026 first-half classification smoke
pnpm phase4:check    # alias of reports:smoke
pnpm presets:smoke   # disposable preset seed/apply/duplicate smoke
pnpm phase5:check    # alias of presets:smoke
pnpm docx:smoke      # Phase 6 DOCX smoke
pnpm test            # unit + live integration (skips integration if no DATABASE_URL)
pnpm test:e2e        # Playwright; skipped without Clerk + E2E_USER_* credentials
```

## Testing Phase 3–6 locally

1. Ensure `DATABASE_URL` / `DIRECT_URL` point at local `Auri` and Clerk env is set.
2. Sign in → incomplete profiles are redirected to `/onboarding`.
3. Complete steps; refresh mid-flow to confirm resume.
4. After completion, create a report under `/app/reports/new` and edit days under `/app/reports/[id]/edit`.
5. Manage presets at `/app/presets` (starter seed + CRUD) and apply them from the day editor picker.
6. Prepare/upload DOCX runtime template, then `POST /api/reports/{id}/exports` with `{ "formats": ["docx"] }`.
7. Automated coverage: `pnpm test` (unit + disposable Postgres integration). Live Auth browser E2E requires a real onboarded Clerk test account — do not invent credentials.
