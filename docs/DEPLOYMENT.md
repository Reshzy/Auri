# Auri deployment

Last updated: 2026-08-13

Do not deploy, migrate, or mutate a remote environment until the exact target is identified as local, preview, staging, or production. Never reset production data.

## Targets in this repository environment (2026-08-13)

| System           | Identified target                                                    | Notes                                                   |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| Git              | `https://github.com/Reshzy/Auri.git` branch `feature/phase-continue` | Local clone                                             |
| Node             | Local v26.5.0; CI and Vercel **24.x**                                | `engines.node` is `>=20.9.0` (Vercel maps this to 24.x) |
| PostgreSQL       | Local `localhost` database `Auri`                                    | Credentials present in `.env.local` (not printed)       |
| Clerk            | Local/dev keys present in `.env.local`                               | Production instance **not** confirmed                   |
| Supabase Storage | Absent                                                               | `SUPABASE_URL` / service role not set                   |
| Vercel           | Absent                                                               | No `.vercel` link, no CLI token                         |
| GitHub Actions   | Workflow committed; no run in this session                           | First green run requires a push                         |

If a row is absent, prepare code/docs and leave the action **Pending**. Do not invent URLs, credentials, or deploy success.

## Node.js runtime

- Next.js 16 requires Node `>=20.9.0`.
- Vercel supported majors: 24.x (default), 22.x, 20.x. Node 20 is deprecated on Vercel on 2026-10-01.
- Set Vercel Project Settings to **24.x**, matching `.nvmrc` and CI.
- DOCX/XLSX/ZIP route handlers already use `export const runtime = "nodejs"`.

## Environment variables

See `docs/ENVIRONMENT.md` and `.env.example`.

Preview and production on Vercel must use **separate** values for Clerk, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_*`, and `NEXT_PUBLIC_SITE_URL`.

Never prefix secrets with `NEXT_PUBLIC_`. Never put service-role keys, Clerk secrets, database URLs, signed URLs, or private Storage paths in the client bundle, git, CI logs, or application logs.

## Database migrations (forward-only)

Committed files:

1. `drizzle/0000_core_schema.sql`
2. `drizzle/0001_worried_sunset_bain.sql` — `snapshots_refreshed_at`
3. `drizzle/0002_groovy_starhawk.sql` — `profiles.clerk_user_id`
4. `drizzle/0003_mighty_chamber.sql` — ZIP `bundle_manifest`, one-current-export index

Migrations are **not** fully reversible. There is no automatic down migration. Rollback is restore-from-backup plus a forward repair if needed. Never rewrite `__drizzle_migrations`. Never `drizzle-kit push` or reset production.

### Apply (explicit production only)

1. Confirm project ref and that `DIRECT_URL` is the **direct or session** connection for that project (not the transaction pooler).
2. Backup the database (Supabase dashboard PITR or `pg_dump`).
3. `AURI_MIGRATE_TARGET=production` and `AURI_ALLOW_PRODUCTION_MIGRATE=1`
4. `pnpm db:migrate`
5. `pnpm db:migrate:verify` (schema check only; do not point incremental replay at production)
6. Apply `supabase/overlays/clerk/001`–`003` in the SQL editor
7. `pnpm storage:setup` then upload templates

### Rollback notes

| Migration | Forward effect                                                       | Honest rollback                                                                                   |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 0000      | Creates all core tables                                              | Restore backup taken before 0000. Do not drop tables that contain user data.                      |
| 0001      | Adds nullable `snapshots_refreshed_at`                               | Column may be left in place. Removing it is optional and unused by older app versions.            |
| 0002      | Adds required `clerk_user_id`                                        | Cannot drop if rows exist and the running app requires it. Restore backup if this must be undone. |
| 0003      | Provenance check, `bundle_manifest`, current-per-format unique index | Restore backup. Manually dropping the check/index without restoring files can strand ZIP rows.    |

Vercel rollback to a previous deployment does **not** roll back the database. Only roll back the app to a SHA that understands the current schema.

## Clerk production

Configure in the Clerk Dashboard (production instance, not development):

- Allowed origins: production site URL and `https://*.vercel.app` preview origins if previews use the same instance (prefer a **separate** Clerk development instance for preview)
- Sign-in `/sign-in`, sign-up `/sign-up`, after sign-in `/app`, after sign-up `/onboarding`, after sign-out `/`
- Publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Secret key → `CLERK_SECRET_KEY` (server only)
- Webhooks: **not used** by Auri v1 — do not configure unless a later phase adds them
- Users without a profile: `ensureProfileForClerkUser` creates an internal UUID; incomplete profiles stay on `/onboarding`

Auri does not use Clerk↔Supabase JWT integration. Storage and SQL access after login go through trusted server code.

## Vercel

1. Import `Reshzy/Auri`.
2. Framework: Next.js (see `vercel.json`).
3. Node.js 24.x.
4. Set preview vs production env vars separately (`docs/ENVIRONMENT.md`).
5. Production branch: `main`. Preview deployments for pull requests are allowed; they must **not** use production `DATABASE_URL` / Storage.
6. Do not add a build-time migrate. Migrations are an explicit admin step.
7. After deploy: sign-in smoke, generate DOCX/XLSX/ZIP, confirm `Cache-Control: private, no-store` on `/api/exports/*/download`.

This environment did not deploy. Record URL and SHA only after a real deploy.

## Storage

Buckets: `templates`, `generated-reports` — both private.

Path: `{internalProfileUuid}/{reportPeriodId}/{exportId}/{fileName}`

Commands (server/setup credentials required):

```bash
pnpm storage:setup
pnpm templates:upload:docx
pnpm templates:upload:xlsx
pnpm storage:check
pnpm exports:storage:smoke
```

## Post-deployment smoke

1. Create a disposable Clerk user (or use the dedicated E2E account).
2. Complete onboarding.
3. Create a short report fixture.
4. Generate DOCX, XLSX, and ZIP.
5. Download through the protected endpoint.
6. Confirm files are not publicly cached.
7. Delete the disposable export/report data.

MIME types:

```text
DOCX: application/vnd.openxmlformats-officedocument.wordprocessingml.document
XLSX: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
ZIP:  application/zip
```
