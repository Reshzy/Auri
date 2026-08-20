# Phase 7 — XLSX DTR export

Last updated: 2026-08-11

## Clerk identity boundary

| Step       | Behavior                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Session    | Clerk `auth()` / `currentUser()` on the server                                                      |
| Mapping    | `ensureProfileForClerkUser(clerkUserId)` → `profiles.id` (UUID) via unique `profiles.clerk_user_id` |
| Ownership  | All tenant FKs use `profiles.id`. Clerk `user_…` strings are never written into UUID columns        |
| Client ids | Export JSON ownership fields are rejected                                                           |
| Reports    | Loaded with `getOwnReportWithEntries(ownerUuid, reportId)`                                          |

PostgreSQL is accessed through authenticated server-side Drizzle. Explicit DAL authorization is mandatory. Supabase Auth `auth.uid()` overlays are stale under Clerk and must not be treated as the primary boundary. Supabase remains Postgres + private Storage.

## Source and runtime hashes

| Artifact           | Path                                        | SHA-256                                                            |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------ |
| Source (immutable) | `templates/source/DTR RODGE.xlsx`           | `26a88e371c9df57ab3a2535493d81af70cf5f788cead3695dcc67de0b12da80c` |
| Runtime            | `templates/runtime/dtr-csc-form-48-v1.xlsx` | `20ef7627254232a1d9e055f708b715cae49e29a463def5a6e18a99c2f5700b0c` |

Never overwrite, resave, or patch the source workbook. Preparation fails closed if the source hash mismatches.

## Runtime preparation

```bash
pnpm xlsx:prepare
pnpm xlsx:audit
```

1. Verify source SHA-256.
2. Byte-copy the XLSX ZIP package.
3. Clear owned sample cells `A6` / `D8` (preserve style IDs).
4. Clear stale cached values on mirror formulas `I6`, `L8`, `A53`, `I53` while preserving formulas.
5. Blank shared-string entries for sample identity/period **without** reordering indices.
6. Preserve `F45`/`N45` `SUM(...)`, merges, page setup, drawings/VML, printer settings, Sheet2/Sheet3.
7. Write runtime file + update manifest (cell maps, formulas, merges, drawing parts, prepare tool version).

## Cell map (canonical)

| Meaning                 | Left                 | Right                                 |
| ----------------------- | -------------------- | ------------------------------------- |
| Employee name           | `A6` (written)       | `I6` `=A6` (formula preserved)        |
| Period label            | `D8` (written)       | `L8` `=D8` (formula preserved)        |
| Day / times / undertime | `A:G` rows 14–44     | `I:O` rows 14–44 (written both sides) |
| Total undertime hours   | `F45` `SUM(F14:F44)` | `N45` `SUM(N14:N44)`                  |
| Signature name          | `A53` `=A6`          | `I53` `=A6`                           |

Day → row: `worksheetRow = calendarDay + 13`.

## Dual-copy, time, non-workday, undertime

- Ordinary day cells are written on **both** copies.
- Mirror-formula cells are not overwritten; caches are cleared so sample PII cannot linger.
- DTR period label: `AUGUST 1-15` (uppercase, no year) — distinct from DOCX `August 1-15, 2026`.
- Employee presentation on DTR: uppercase in the DTR formatter only; canonical payload keeps stored casing.
- Times: 12-hour without AM/PM, no leading hour zero (`7:00`, `12:00`, `1:00`). No timezone conversion.
- Non-workdays (`scheduled_off`, `holiday`, `leave`, `absent`): blank time and undertime cells (no DOCX labels).
- Final undertime: `override ?? calculated`; split into hours/minutes; **zero undertime leaves day cells blank**.
- `F45` / `N45` formulas are never redesigned.

## OOXML patcher

- `jszip` + `@xmldom/xmldom`
- Batch cell operations preserve `r`, `s`, column order, and unmapped entry bytes
- Safe ZIP path rejection; size limits
- Never evaluates workbook formulas or user content as markup

## Template upload / activation

```bash
pnpm templates:upload:xlsx
```

- Verifies local runtime SHA-256
- Uploads to private `templates` bucket at `dtr/v1/dtr-csc-form-48-v1.xlsx` when Storage credentials exist
- Reconciles `template_versions` (`template_key=dtr`, `file_type=xlsx`); idempotent same hash; refuses different bytes
- Activates only the DTR key (accomplishment active row untouched)
- Without Storage env: clear skip of remote upload; optional local DB activation via `DATABASE_URL`
- Never accepts browser uploads; service-role key never enters the client

Local runtime fallback for generation is documented for development/tests (and intentional bundled-template deploys). Production must fail closed with `TEMPLATE_NOT_FOUND` when the configured Storage object is unavailable and local fallback is disabled.

## Export endpoint

```http
POST /api/reports/{reportId}/exports
Content-Type: application/json

{ "formats": ["xlsx"], "acknowledgedWarnings": [] }
```

Phase 8 accepts unique subsets of `docx`, `xlsx`, and `zip` (ZIP requires both members). See `docs/PHASE8_EXPORT_HISTORY.md`.

- Fresh `validateReport`; warnings require acknowledgement
- Snapshots are not refreshed during export
- Generation returns JSON metadata; download MIME for XLSX remains `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Filename: `Auri_{Sanitized-Employee-Name}_{YYYY-MM-DD}_to_{YYYY-MM-DD}_DTR.xlsx`
- `Cache-Control: private, no-store`
- Safe errors: `TEMPLATE_NOT_FOUND`, `TEMPLATE_HASH_MISMATCH`, `REPORT_INCOMPLETE`, `XLSX_GENERATION_FAILED`, etc.
- **Does not** include PDF generation or a template designer

Phase 8 persistence, ZIP, preview, and history: see `docs/PHASE8_EXPORT_HISTORY.md`.

## Structural vs visual validation

Structural ZIP/XML checks are automated (`pnpm xlsx:audit`, unit/integration tests, smoke).

Visual one-page legal landscape / Excel repair-warning gate requires LibreOffice/`soffice` or Microsoft Excel. If unavailable, the visual gate is **blocked/pending** and must not be claimed from ZIP inspection alone. Generated fixtures under `fixtures/xlsx/generated/` are gitignored.

## Phase 8 boundary

Implemented in Phase 8 (see `docs/PHASE8_EXPORT_HISTORY.md`):

- ZIP packaging / multi-format generation
- Semantic preview UI / generation-review UI
- Generated-report Storage persistence
- `report_exports` history, current/outdated states, protected historical downloads

Still not implemented: PDF generation / template designer.

## Remaining environment-dependent checks

These remain pending when credentials/tools are absent (do not claim passed):

- Live Supabase Storage upload (needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
- Clerk-authenticated Playwright E2E (needs onboarded `E2E_USER_*`)
- LibreOffice visual / Office repair-warning review
