# Auri Implementation Status

Last updated: 2026-08-11

## Current phase

**Phase 7 complete (XLSX DTR runtime template and export).** Phase 8 has not started.

## Completed

### Phase 0 — Repository and template audit

- [x] Source templates, audit docs, manifests, `pnpm templates:audit`

### Phase 1 — Next.js and design foundation

- [x] App Router shells, tokens, tooling, motion, route placeholders

### Phase 2 — Clerk Auth + Drizzle data layer

- [x] Clerk Auth (`@clerk/nextjs`), Proxy (`clerkMiddleware`), sign-up/in/out
- [x] Protected `/app/*` + `/onboarding` + auth-entry redirects
- [x] Drizzle ORM + `postgres` driver; `src/db/schema` canonical for eight §8 tables
- [x] Committed `drizzle/` migrations (portable Postgres) including `profiles.clerk_user_id`
- [x] Supabase Storage overlays under `supabase/overlays/` (Auth FK/RLS overlays stale for Clerk)
- [x] Server-only DAL: `requireAuthenticatedUser` (Clerk → profile UUID), ownership guards
- [x] Local `db:inspect` → `db:migrate` → `db:check` → `db:smoke` verified

### Phase 3 — Onboarding and settings

- [x] Resumable `/onboarding` wizard (welcome → profile → schedule → signatories → templates → ready)
- [x] Settings: `/app/settings/profile`, `schedule`, `signatories`, `templates`
- [x] Zod schemas + server-only DAL + auth gates + snapshot builders

### Phase 4 — Report periods and daily editor

- [x] Report CRUD, daily editor, validation, finalize/reopen, `pnpm reports:smoke`
- [x] Docs: `docs/PHASE4_REPORTS.md`

### Phase 5 — Accomplishment presets

- [x] Presets CRUD/apply/seed, `pnpm presets:smoke`
- [x] Docs: `docs/PHASE5_PRESETS.md`

### Phase 6 — DOCX runtime template and export

- [x] Runtime DOCX + `DocxExportService` + Clerk-protected DOCX export
- [x] Docs: `docs/PHASE6_DOCX_EXPORT.md`
- [x] Visual LibreOffice gate: blocked/pending when `soffice` unavailable

### Phase 7 — XLSX DTR export

- [x] Scrubbed runtime `dtr-csc-form-48-v1.xlsx` + manifest (`pnpm xlsx:prepare` / `xlsx:audit`)
- [x] Source SHA-256 immutability gate; OOXML batch patcher (`jszip` + `@xmldom/xmldom`)
- [x] Central cell-map constants; dual-copy writer; DTR formatters; structural validators
- [x] `XlsxExportService` + `TemplateService.loadDtrTemplateBytes`
- [x] Trusted `pnpm templates:upload:xlsx` (Storage when configured; local DB activation fallback)
- [x] Export route supports exclusive `docx` **or** `xlsx` (no zip / mixed / Phase 8 persistence)
- [x] Unit + integration fixtures; docs: `docs/PHASE7_XLSX_EXPORT.md`
- [x] Visual LibreOffice gate: blocked/pending when `soffice` unavailable

## Quality gates (Phase 7)

| Check                             | Result                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm format:check`               | Fail — pre-existing only: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` (untouched) |
| `pnpm lint`                       | Pass (0 errors; pre-existing `.agents` template warning only)                          |
| `pnpm typecheck`                  | Pass                                                                                   |
| `pnpm test`                       | Pass (165 tests)                                                                       |
| `pnpm build`                      | Pass                                                                                   |
| `pnpm templates:audit`            | Pass                                                                                   |
| `pnpm docx:audit` / `docx:smoke`  | Pass                                                                                   |
| `pnpm xlsx:prepare` / audit/smoke | Pass (deterministic runtime SHA `a08195c6…eba6`)                                       |
| `pnpm templates:upload:xlsx`      | Pass — local DB activation; Storage skipped without service role                       |
| `pnpm auth/db/reports/presets`    | Pass (`auth:check`, `db:check`, `db:smoke`, `reports:smoke`, `presets:smoke`)          |
| `pnpm test:e2e`                   | Skipped — Clerk `E2E_USER_*` not configured for an onboarded test account              |
| Visual LibreOffice (DOCX + XLSX)  | Blocked/pending — `soffice` not installed on this machine                              |
| Live Supabase Storage upload      | Pending — service-role credentials unavailable                                         |

## Schema sources

| Layer                               | Location                      | Environments                            |
| ----------------------------------- | ----------------------------- | --------------------------------------- |
| Portable app schema                 | `src/db/schema/` → `drizzle/` | Local Postgres + Supabase Postgres      |
| Storage buckets (Clerk-aware notes) | `supabase/overlays/`          | Production Supabase; see overlay README |
| Historical pre-Drizzle SQL          | `supabase/archive/`           | Reference only                          |

Phase 5–7: no new migrations (`template_versions` already supports `dtr` / `xlsx`).

## Environment variables

See `.env.example` and `docs/DATABASE.md`.

Optional for Playwright live Auth: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`.

Never commit `.env.local` or real passwords/keys.

## Manual setup still required

1. Confirm Clerk publishable + secret keys and redirect URLs.
2. Production: Drizzle migrate with `DIRECT_URL`; do **not** apply Auth FK / `auth.uid()` RLS overlays as-is under Clerk.
3. Optional: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for `pnpm templates:upload:docx` / `templates:upload:xlsx`.
4. Optional: `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` for Playwright (onboarded Clerk test user only).

## Assumptions

1. Clerk is the canonical identity provider; Supabase provides Postgres + private Storage.
2. DAL ownership scoping is mandatory; `auth.uid()` policies are not the primary boundary.
3. Phase 6/7 return DOCX/XLSX buffers without persisting generated-report Storage history (Phase 8).
4. DTR period label uses audited `AUGUST 1-15`; DOCX keeps `August 1-15, 2026`.
5. Zero undertime leaves daily hour/minute cells blank while preserving `F45`/`N45`.

## Next work

1. Phase 8: preview, generation review, ZIP package, generated-report Storage, `report_exports` history — not started.
