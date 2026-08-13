# Clerk-safe Supabase overlays

Apply these **after** portable Drizzle migrations, and **instead of** `supabase/overlays/001`–`004`.

Auri authentication is Clerk. `auth.uid()` is a Supabase Auth UUID and does not equal `profiles.id`.

| File                                   | Purpose                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `001_rls_enable_deny_default.sql`      | Enable RLS; revoke anon/authenticated table privileges; no `auth.uid()` policies |
| `002_private_storage_buckets.sql`      | Private `templates` and `generated-reports` buckets                              |
| `003_drop_stale_auth_uid_policies.sql` | Remove leftover Auth policies if 003/004 were applied by mistake                 |

## Apply (production, explicit target only)

1. Confirm the Supabase project reference and that `DIRECT_URL` points at that project.
2. Set `AURI_MIGRATE_TARGET=production` and `AURI_ALLOW_PRODUCTION_MIGRATE=1`.
3. `pnpm db:migrate` (Drizzle journal only; never reset).
4. Run the three Clerk overlay files in order in the Supabase SQL editor (or CLI) against that project.
5. Confirm buckets are not public.
6. Upload trusted runtime templates (`pnpm templates:upload:docx` and `pnpm templates:upload:xlsx`).

Do not apply `001_profiles_auth_users_fk.sql`, `002_profile_trigger.sql`, or `003_rls_policies.sql` as-is.

Generated-report paths remain `{internalProfileUuid}/{reportPeriodId}/{exportId}/{fileName}`.
