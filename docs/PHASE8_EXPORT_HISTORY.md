# Phase 8 — Preview, generation review, and export history

Last updated: 2026-08-13

## Clerk identity boundary

| Step       | Behavior                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Session    | Clerk `auth()` / `currentUser()` on the server                                                      |
| Mapping    | `ensureProfileForClerkUser(clerkUserId)` → `profiles.id` (UUID) via unique `profiles.clerk_user_id` |
| Ownership  | All tenant FKs use `profiles.id`. Clerk `user_…` strings are never written into UUID columns        |
| Client ids | Generation, download, and delete JSON/query ownership fields are rejected                           |
| Reports    | Loaded with `getOwnReportWithEntries(ownerUuid, reportId)`                                          |
| Exports    | Loaded/deleted with export ID **and** owner UUID                                                    |

PostgreSQL is accessed through authenticated server-side Drizzle. Explicit DAL authorization is mandatory. Service-role Storage access is trusted server/setup code only and is **not** user authorization. Supabase Auth `auth.uid()` overlays are stale under Clerk.

## `report_exports` and ZIP provenance

Base columns remain: `id`, `user_id`, `report_period_id`, `template_version_id`, `format`, `storage_path`, `file_name`, `file_size_bytes`, `sha256`, `source_revision`, `is_current`, `created_at`.

Phase 8 additive migration `drizzle/0003_mighty_chamber.sql`:

- `template_version_id` is **required for `docx`/`xlsx`** and **null for `zip`**
- `bundle_manifest` jsonb is **required for `zip`** and **null for `docx`/`xlsx`**
- Check `report_exports_template_provenance_check` enforces that contract
- Partial unique index: at most one current export per `(report_period_id, format)`
- History indexes on `(report_period_id, created_at desc)` and `(user_id, created_at desc)`

ZIP `bundle_manifest` version 1 records both member export IDs, filenames, hashes, sizes, template-version IDs, and template hashes. Auri does not assign one arbitrary template version to a ZIP that contains two independently versioned templates.

## Format-specific source revisions

Centralized in `src/lib/exports/source-revision.ts` with version marker `auri-src-rev-v1` and labeled fields so concatenations cannot collide:

- DOCX = canonical payload + accomplishment template hash
- XLSX = canonical payload + DTR template hash
- ZIP = canonical payload + both template hashes

Canonical JSON sorts object keys recursively.

## Current / outdated

An export is presented as **Current** only when:

1. `is_current` is still true
2. Stored `source_revision` matches the format-specific revision of the present payload + active templates
3. The private Storage object exists and matches recorded size/hash
4. The flag has not been invalidated

History **does not trust `is_current` alone**. Viewing history does not mutate rows.

Invalidation (`is_current = false`, files kept) runs in the same database transaction as:

- daily-entry mutations
- preset apply when accomplishments change
- draft snapshot refresh
- report reopening

A newly generated export supersedes the older current export of the **same format**. DOCX, XLSX, and ZIP from one revision may all be current simultaneously. Template activation makes affected old exports present as Outdated even if the stored flag is still true.

## Deterministic reuse, concurrency, rate limiting

Reuse requires owner, report, format, source revision, template provenance, generated hash metadata, and a verified private Storage object.

Concurrent generation uses PostgreSQL `pg_advisory_xact_lock(hashtext('auri-export:{userId}:{reportId}'))` inside the reuse/insert transaction (not a session-level lock, which is unsafe with the postgres.js pool).

User-scoped rate limit: at most **12 new `report_exports` rows per user per 60 seconds**. Idempotent reuse does not need Redis.

## Private Storage

Bucket: `generated-reports` (never public).

Path: `{internalProfileUuid}/{reportPeriodId}/{exportId}/{fileName}`

- Internal profile UUID, never Clerk ID
- Server-only upload with `upsert: false`
- Refuses overwrite of an existing path with different bytes
- Validates MIME, extension, size, and hash before upload
- Downloads stream through `GET /api/exports/{exportId}/download` (no public bucket, no logged signed URLs)

```bash
pnpm storage:setup:generated
pnpm storage:check:generated
```

A database row is not evidence that the remote object exists.

## Upload / metadata compensation

PostgreSQL and Storage are not one atomic transaction.

- Upload failure → no metadata row
- Upload success + insert failure → delete only the newly uploaded object
- Compensation delete failure → log opaque `orphanRef` only (hash prefix), never the private path or URL
- Missing or hash-mismatched objects are not reused; fail closed

## ZIP package

Filename: `Auri_{Sanitized-Employee-Name}_{YYYY-MM-DD}_to_{YYYY-MM-DD}_Report-Package.zip`

Exactly two flat entries:

- `Auri_…_Accomplishment.docx`
- `Auri_…_DTR.xlsx`

Selecting ZIP in the UI selects DOCX and XLSX. The API rejects `zip` unless both members are also requested.

## Generation contract

```http
POST /api/reports/{reportId}/exports
```

```json
{ "formats": ["docx", "xlsx", "zip"], "acknowledgedWarnings": [] }
```

Response is JSON (`overallStatus`: `complete` | `partial` | `failed`) with per-format `created` | `reused` | `failed`. Partial success is never described as complete. `Cache-Control: private, no-store`.

Protected download: `GET /api/exports/{exportId}/download`  
Explicit delete: `DELETE /api/exports/{exportId}` → `204`. ZIP delete does not delete members; member delete does not delete ZIP.

## Preview and review

- `/app/reports/{reportId}/preview` — semantic HTML tabs `Accomplishment Report` and `Daily Time Record`
- Disclaimer: `Preview verifies your content. The downloaded Word and Excel templates are the official print layouts.`
- Preview is not pixel-perfect Word/Excel rendering
- Generate opens an accessible review panel with acknowledgement, format checkboxes, per-format progress, and Created vs Reused

## Live results / blockers

| Check                       | Result                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| Local Postgres + `0003`     | Blocked — `localhost:5432` `ECONNREFUSED`; migration not applied   |
| Live `generated-reports`    | Pending without `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`       |
| Clerk Playwright E2E        | Pending without onboarded `E2E_USER_*`                             |
| LibreOffice / Office visual | Pending — `soffice` unavailable (Phase 6/7 visual gates unchanged) |

## Phase 9 boundary

Not implemented: PDF export, GSAP polish, dark mode, marketing-page completion, signature images, supervisor approval, submission tracking, org accounts, additional government templates, Office template editing.
