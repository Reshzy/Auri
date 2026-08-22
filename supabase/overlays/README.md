# Supabase production overlays

These SQL files are **not** applied to local PostgreSQL. They require Supabase platform schemas (`auth`, `storage`) and functions (`auth.uid()`).

## Auth notice (mandatory)

Auri authentication is **Supabase Auth**. App data still uses Drizzle with a privileged connection. Tenant ownership is `profiles.id` (internal UUID), mapped from `auth.users.id` via `profiles.auth_user_id`.

| Overlay                          | Status                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_profiles_auth_users_fk.sql` | **Do not apply** — assumes `profiles.id = auth.users.id`. Auri allocates an internal UUID and stores Auth ids in `profiles.auth_user_id`.                                                                                                                                                      |
| `002_profile_trigger.sql`        | **Do not apply** — inserts profiles with `id = auth.users.id`. Auri bootstraps via `ensureProfileForAuthUser`.                                                                                                                                                                                 |
| `003_rls_policies.sql`           | **Stale** — `auth.uid()` does not equal Auri owner UUIDs. App authorization is explicit DAL scoping.                                                                                                                                                                                           |
| `004_storage_buckets.sql`        | **Templates bucket** is safe (private; service-role write). **generated-reports** `auth.uid()` path policies do not match Auri paths. Downloads use an authenticated protected streaming endpoint with service-role Storage access in trusted server code only. Do not make the bucket public. |

**Apply `supabase/overlays/server-auth/` instead.** Those files enable RLS without `auth.uid()` policies, keep both buckets private, and drop leftover Auth policies.

Never treat service-role Storage access as user authorization. Never expose private buckets publicly.

## Apply order (production only)

1. Apply portable Drizzle migrations (`pnpm db:migrate` with production `DIRECT_URL`).
2. Apply `supabase/overlays/server-auth/001`–`003` in order.
3. Optionally apply `server-auth/004` (`auth_user_id` → `auth.users`).
4. Do not auto-apply Auth FK / trigger / `auth.uid()` RLS overlays (`001`–`004` in this directory) against a live deployment.

## Local development

- Schema: Drizzle → local `Auri` database.
- Auth: Supabase Auth (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- Profiles: `ensureProfileForAuthUser` after session validation.
- Template upload: optional `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for `pnpm templates:upload:docx`.
