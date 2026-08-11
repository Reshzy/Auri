# Supabase production overlays

These SQL files are **not** applied to local PostgreSQL. They require Supabase platform schemas (`auth`, `storage`) and functions (`auth.uid()`).

## Apply order (production only)

1. Apply portable Drizzle migrations (`pnpm db:migrate` with production `DIRECT_URL`).
2. Apply overlays in filename order:
   - `001_profiles_auth_users_fk.sql`
   - `002_profile_trigger.sql`
   - `003_rls_policies.sql`
   - `004_storage_buckets.sql`

Use the Supabase SQL editor, linked CLI, or an explicit production deployment step. Do not auto-apply from local `db:migrate`.

## Local development

- Schema: Drizzle → local `Auri` database.
- Auth: hosted Supabase project (browser/server clients).
- Profiles: `ensureProfile` after session validation (no `auth.users` trigger locally).
