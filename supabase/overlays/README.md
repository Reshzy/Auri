# Supabase production overlays

These SQL files are **not** applied to local PostgreSQL. They require Supabase platform schemas (`auth`, `storage`) and functions (`auth.uid()`).

## Clerk notice (mandatory)

Auri authentication is **Clerk**, not Supabase Auth.

| Overlay                          | Status under Clerk                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_profiles_auth_users_fk.sql` | **Do not apply** — assumes `profiles.id = auth.users.id`; Auri allocates an internal UUID and stores Clerk ids in `profiles.clerk_user_id`.                                                       |
| `002_profile_trigger.sql`        | **Do not apply** — inserts profiles from Supabase Auth signup.                                                                                                                                    |
| `003_rls_policies.sql`           | **Stale** — `auth.uid()` does not equal Auri owner UUIDs unless Clerk JWT claims are intentionally configured and policies rewritten. App authorization is explicit DAL scoping.                  |
| `004_storage_buckets.sql`        | **Templates bucket** is safe (private; service-role write). **generated-reports** path policies that use `auth.uid()` are Clerk-incompatible and must be rewritten before Phase 8 user downloads. |

Never treat service-role Storage access as user authorization. Never expose private buckets publicly.

## Apply order (production only — after reviewing Clerk notice)

1. Apply portable Drizzle migrations (`pnpm db:migrate` with production `DIRECT_URL`).
2. Create Storage buckets (adapt `004` as needed; rewrite generated-report policies for Clerk/internal UUID path prefixes before enabling user downloads).
3. Do not auto-apply Auth FK / trigger / `auth.uid()` RLS overlays against a Clerk-backed deployment.

## Local development

- Schema: Drizzle → local `Auri` database.
- Auth: Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
- Profiles: `ensureProfileForClerkUser` after Clerk session validation.
- Template upload: optional `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for `pnpm templates:upload:docx`.
