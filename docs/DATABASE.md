# Auri database setup

## Architecture

| Concern                 | Local development                        | Production                       |
| ----------------------- | ---------------------------------------- | -------------------------------- |
| App schema + migrations | Drizzle → PostgreSQL `Auri` on localhost | Drizzle → Supabase Postgres      |
| ORM                     | Drizzle (`src/db`)                       | Drizzle (`src/db`)               |
| Auth                    | Hosted Supabase Auth                     | Supabase Auth                    |
| Storage                 | Not required locally for Phase 2         | Supabase Storage (overlays)      |
| RLS / `auth.uid()`      | Not available on ordinary Postgres       | Applied via `supabase/overlays/` |
| Deployment              | —                                        | Vercel                           |

**Drizzle is the canonical application-schema source of truth** (`src/db/schema/` → `drizzle/`). Do not edit a parallel portable schema under `supabase/migrations/`.

Local PostgreSQL does **not** include Supabase Auth, Storage, `auth.users`, or `auth.uid()`. Keep using a hosted Supabase project for Auth while developing locally. Docker / `supabase start` are optional alternatives, not required.

Direct PostgreSQL connections (Drizzle) bypass Supabase Data API RLS. The server data-access layer always scopes by the verified Supabase user UUID. Production RLS remains defense in depth.

## Environment

1. Copy `.env.example` → `.env.local`.
2. Fill hosted Supabase Auth keys (`NEXT_PUBLIC_SUPABASE_*`, optional service role).
3. Set local database URLs (password only in `.env.local`, never commit):

```dotenv
DATABASE_URL=postgresql://postgres:<LOCAL_POSTGRES_PASSWORD>@localhost:5432/Auri
DIRECT_URL=postgresql://postgres:<LOCAL_POSTGRES_PASSWORD>@localhost:5432/Auri
```

- `DATABASE_URL` — app runtime (local Postgres, or Supabase **pooled** URL in production).
- `DIRECT_URL` — `drizzle-kit` migrate/generate (local same as runtime; production: direct or session pooler).

## Local commands

```bash
pnpm db:inspect    # non-destructive schema listing
pnpm db:generate   # after editing src/db/schema
pnpm db:migrate    # apply committed drizzle/ migrations
pnpm db:check      # static consistency checks
pnpm db:studio     # Drizzle Studio
pnpm db:smoke      # insert/select/delete disposable profile row
```

Do **not** use destructive reset commands. Do **not** run `drizzle-kit push` against production.

## Production deployment (schema + overlays)

1. Set production `DATABASE_URL` (pooler) and `DIRECT_URL` (direct/session).
2. Apply Drizzle migrations with an explicit production step: `pnpm db:migrate` using production `DIRECT_URL`.
3. Apply `supabase/overlays/*.sql` in order (Auth FK, profile trigger, RLS, Storage).
4. Confirm Auth redirect URLs for the Vercel site.

## Profile provisioning

- **Production:** `on_auth_user_created` trigger inserts `profiles` (overlay).
- **Local (and backup):** after Supabase session validation, `ensureProfile(user.id)` upserts a row for that UUID only. Idempotent; never trusts a client-supplied user id.

## Why both DAL authorization and RLS

- Drizzle uses a privileged Postgres connection that can bypass RLS.
- Every user-owned query/mutation must filter by the session UUID in the DAL.
- Production RLS still blocks accidental exposure through the Supabase Data API or misconfigured clients.

## Local verification (2026-08-11)

Verified against existing database `Auri` on `localhost:5432` (credentials never logged):

1. `pnpm db:inspect` — public tables: `accomplishment_presets`, `daily_entries`, `profiles`, `report_exports`, `report_periods`, `signatories`, `template_versions`, `work_schedules`; Drizzle migrations table present.
2. `pnpm db:migrate` — committed `drizzle/` migrations applied successfully (no push/reset).
3. `pnpm db:check` — static assertions pass; local policy `prepare=true`, `ssl=false`.
4. `pnpm db:smoke` — disposable profile CRUD passed; smoke row deleted.

No schema or migration-history conflict was observed. No destructive repair was performed.

## Phase 3 data-access notes

- Onboarding and settings mutations live in server-only DAL modules under `src/db/dal/` and server actions under `src/features/settings/actions.ts`.
- Session user UUID comes from Supabase `getUser()` only. Client-supplied `user_id` / `owner_id` fields are rejected.
- `profiles.active_schedule_id` is set only to a `work_schedules` row owned by the same user.
- Snapshot builders (`src/db/dal/snapshots.ts`) copy current profile, active schedule, and active signatories into JSON suitable for later `report_periods` inserts. Phase 3 does not create reports.
- Template availability checks active `template_versions` rows and falls back to audited Phase 0 `templates/manifests` + `templates/source` for local onboarding when DB rows are not yet activated (Phase 6).

## Testing Phase 3 locally

1. Ensure `DATABASE_URL` / `DIRECT_URL` point at local `Auri` and hosted Supabase Auth public env is set.
2. Sign in → incomplete profiles are redirected to `/onboarding`.
3. Complete steps; refresh mid-flow to confirm resume.
4. After completion, edit settings under `/app/settings/*`.
5. Automated coverage: `pnpm test` (mocked unit/DAL tests). Live Auth E2E requires a real test account — do not invent credentials.
