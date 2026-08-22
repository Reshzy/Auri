# Server-auth Supabase overlays

Apply these **after** portable Drizzle migrations, and **instead of** `supabase/overlays/001`–`004`.

Auri authentication is Supabase Auth. `auth.uid()` is the Auth user UUID and does **not** equal `profiles.id` (internal tenant UUID stored in child-table `user_id` columns).

| File                                   | Purpose                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `001_rls_enable_deny_default.sql`      | Enable RLS; revoke anon/authenticated table privileges; no `auth.uid()` policies |
| `002_private_storage_buckets.sql`      | Private `templates` and `generated-reports` buckets                              |
| `003_drop_stale_auth_uid_policies.sql` | Remove leftover Auth policies if 003/004 were applied by mistake                 |
| `004_auth_user_id_fk.sql`              | Optional: `profiles.auth_user_id` → `auth.users(id)` (hosted only)               |

## Apply (production, explicit target only)

1. Confirm the Supabase project reference and that `DIRECT_URL` points at that project.
2. Set `AURI_MIGRATE_TARGET=production` and `AURI_ALLOW_PRODUCTION_MIGRATE=1`.
3. `pnpm db:migrate` (Drizzle journal only; never reset).
4. Run `001`–`003` in order in the Supabase SQL editor (or CLI) against that project.
5. Optionally run `004` after every `auth_user_id` value is a UUID.
6. Confirm buckets are not public.

Do not apply `supabase/overlays/001_profiles_auth_users_fk.sql` (that file wrongly binds `profiles.id` to `auth.users.id`). Do not apply `002_profile_trigger.sql` or `003_rls_policies.sql` as-is.

Generated-report paths remain `{internalProfileUuid}/{reportPeriodId}/{exportId}/{fileName}`.
