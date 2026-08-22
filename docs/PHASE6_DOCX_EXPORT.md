# Phase 6 — DOCX runtime template and export

Last updated: 2026-08-11

## Identity boundary

| Step       | Behavior                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Session    | Supabase Auth `getClaims()` on the server                                                        |
| Mapping    | `ensureProfileForAuthUser(authUserId)` → `profiles.id` (UUID) via unique `profiles.auth_user_id` |
| Ownership  | All tenant FKs use `profiles.id`. Auth user ids are never written into UUID columns              |
| Client ids | Export JSON ownership fields are rejected                                                        |
| Reports    | Loaded with `getOwnReportWithEntries(ownerUuid, reportId)`                                       |

PostgreSQL is accessed through authenticated server-side Drizzle. Explicit DAL authorization is mandatory. Supabase Auth `auth.uid()` overlays that assume `profiles.id = auth.users.id` must not be treated as the primary boundary.

## Runtime template preparation

```bash
pnpm docx:prepare
pnpm docx:audit
```

- Source: `templates/source/ACCOMPLISHMENT - RODGE.docx` (immutable; SHA-256 verified)
- Runtime: `templates/runtime/accomplishment-report-v1.docx`
- Manifest: `templates/manifests/accomplishment-report-v1.json`

Preparation removes the duplicate report copy, expands daily rows to 16, scrubs sample data, injects flat Docxtemplater tags, and records source/runtime hashes. Repeated prepares from the same tool version produce a stable runtime SHA-256 (ZIP entry dates fixed).

## Token mapping

`ReportMappingService` builds a canonical `ExportPayload` from immutable snapshots + ordered daily entries + server totals, then maps to the flat token contract (112 tokens). Unused rows are empty strings. Non-workdays use `-` for AM/PM/time spent and uppercase classification labels. Totals use `80 HRS` / `79 HRS 30 MINS` / `0 HRS`. Period labels use the audited form `August 1-15, 2026`.

## Template upload / activation

```bash
pnpm templates:upload:docx
```

- With `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: uploads to private `templates` bucket at `accomplishment/v1/accomplishment-report-v1.docx`, verifies hash, reconciles `template_versions`, keeps one active row.
- Without Storage env but with `DATABASE_URL`: activates a local `template_versions` row pointing at a `local/...` path (generation still uses the local runtime file fallback).
- Refuses silent overwrite when the same version has different bytes.
- Never accepts arbitrary browser uploads. Service-role key never enters the client bundle.

## DOCX generation pipeline

`DocxExportService` (Node-only):

1. Resolve trusted template (Storage preferred; local runtime fallback for tests/dev)
2. Enforce max size; verify SHA-256 vs `template_versions` / manifest
3. Map report → flat tokens
4. Render with Docxtemplater (strict missing tags)
5. Structural ZIP/XML validation
6. Return buffer + safe metadata (`fileName`, `sha256`, `sourceRevision`, `templateVersionId`)

Safe errors: `TEMPLATE_NOT_FOUND`, `TEMPLATE_HASH_MISMATCH`, `REPORT_INCOMPLETE`, `DOCX_GENERATION_FAILED`, etc., with opaque correlation ids. No XML fragments, stacks, or credentials in responses.

## Export endpoint

```http
POST /api/reports/{reportId}/exports
Content-Type: application/json

{ "formats": ["docx"], "acknowledgedWarnings": [] }
```

- Auth session → internal owner UUID
- Rejects `zip` / mixed formats in Phase 6/7; Phase 7 adds exclusive `xlsx`
- Fresh `validateReport`; blocking errors stop generation; warnings require acknowledgement
- Phase 6/7 returned a binary attachment. **Phase 8 returns JSON export metadata** and protected download URLs (`Cache-Control: private, no-store`)
- Filename: `Auri_{Sanitized-Employee-Name}_{YYYY-MM-DD}_to_{YYYY-MM-DD}_Accomplishment.docx`
- `Cache-Control: private, no-store`
- **Does not** persist generated files or insert incomplete `report_exports` rows (Phase 8)

Phase 7 extends the same endpoint for `{ "formats": ["xlsx"] }` — see `docs/PHASE7_XLSX_EXPORT.md`.

## Structural vs visual validation

Structural ZIP/XML checks are automated (`pnpm docx:audit`, unit/integration tests, smoke).

Visual one-page legal landscape gate requires LibreOffice/`soffice`. If unavailable on the machine, the visual gate is **blocked/pending** and must not be claimed from ZIP inspection alone. Generated fixtures under `fixtures/docx/generated/` are gitignored for local review.

## Privacy / logging

Scripts and services avoid logging document contents or personal report text. Only hashes, paths, and safe status codes are printed.

## Phase 8 boundary

Phase 8 adds generated-report Storage, `report_exports` history, protected downloads, current/outdated states, ZIP packaging, and export UI. See `docs/PHASE8_EXPORT_HISTORY.md`. Mapper/generator results are persisted after structural validation and private upload.

## Commands

```bash
pnpm docx:prepare
pnpm docx:audit
pnpm docx:smoke
pnpm templates:upload:docx
pnpm test
pnpm test:e2e   # skipped unless Auth + E2E_USER_* configured
```

## Remaining Auth E2E setup

Authenticated Playwright export E2E requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` for a real onboarded disposable account

Do not invent credentials. Skip messages must cite missing Auth configuration.
