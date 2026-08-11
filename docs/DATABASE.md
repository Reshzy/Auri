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
