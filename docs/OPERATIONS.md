# Auri operations

Last updated: 2026-08-13

Incident-safe rule: never log secrets, signed URLs, document contents, full employee names, or Storage paths that include owner UUIDs in application or CI logs.

## Database backup and restore

- Production backups are the **Supabase project owner’s** responsibility (dashboard PITR / scheduled backups).
- After restore, verify: tables listed in `docs/DATABASE.md`, `__drizzle_migrations` journal matches committed `drizzle/meta/_journal.json`, and `pnpm db:migrate:verify` against that restored copy **only if** the URL is an explicit restore target.
- Never restore production over a live database without a maintenance window and a second backup of the current state.

## Migration recovery

Migrations are forward-only. If a migrate fails mid-file, do not rewrite the journal. Restore the pre-migrate backup and re-run `pnpm db:migrate` after fixing the cause.

## Runtime templates

| Item               | Location                                                    |
| ------------------ | ----------------------------------------------------------- |
| Source (immutable) | `templates/source/`                                         |
| Runtime            | `templates/runtime/`                                        |
| Manifests          | `templates/manifests/`                                      |
| Active DB row      | `template_versions` (`is_active`, `sha256`, `storage_path`) |

To re-upload an **exact** trusted version:

1. Confirm local runtime SHA-256 matches the manifest (`pnpm docx:audit`, `pnpm xlsx:audit`).
2. `pnpm templates:upload:docx` / `pnpm templates:upload:xlsx`.
3. Same hash is idempotent. Different bytes for the same version are refused.

Keep a copy of runtime files + manifests outside Storage (this git repo is the source of truth). Storage is the production serving copy.

## Generated reports

- Retention: files remain until the owner deletes that export. Invalidation sets `is_current = false` and does not delete bytes.
- Path: `{internalProfileUuid}/{reportPeriodId}/{exportId}/{fileName}`
- Missing object or hash mismatch: download returns a safe integrity error (`EXPORT_INTEGRITY_FAILED`). Do not stream the mismatched bytes.

### Orphaned Storage objects

Investigate with service-role list under a **disposable prefix** only. Match `storage_path` in `report_exports`. Do not bulk-delete production prefixes. Delete only objects created by a known disposable test.

## Clerk mapping failures

- Missing profile: server upserts `profiles` keyed by `clerk_user_id`.
- User stuck on `/onboarding`: complete profile, schedule, signatories, templates.
- Wrong user sees data: treat as an incident; DAL must filter by session profile UUID. Rotate keys if a secret leaked.

## Key rotation

1. Clerk: create a new secret in the Dashboard, set `CLERK_SECRET_KEY` on Vercel, redeploy, then revoke the old secret.
2. Supabase service role: rotate in the dashboard, update Vercel **server** env, redeploy. Never put the new key in git.
3. Database URL: rotate database password, update `DATABASE_URL` / `DIRECT_URL`, redeploy. Run a read-only `db:inspect` equivalent after.

## Logging

Safe: correlation ids, export ids (UUIDs), error codes (`TEMPLATE_HASH_MISMATCH`).  
Unsafe: request bodies with accomplishments, file bytes, `Authorization` headers, connection strings.

## Production smoke (after each production deploy)

- `/` loads branded landing copy
- `/sign-in` reaches Clerk
- Signed-in `/app` loads
- One disposable generate + download
- `Cache-Control: private, no-store` on the download response

## Vercel rollback

Use the Vercel dashboard or CLI to restore a previous **deployment**. Confirm that deployment’s commit understands the **current** database schema. If the failed release included a migration, rolling back the app without restoring the database can break writes.

## CSP

Document security headers are set in `next.config.ts`. A strict Content-Security-Policy is **not** enabled automatically because Clerk’s Frontend API host is instance-specific. Add Clerk’s [CSP directives](https://clerk.com/docs/security/clerk-csp) in production after the production FAPI hostname is known, then re-test sign-in.
