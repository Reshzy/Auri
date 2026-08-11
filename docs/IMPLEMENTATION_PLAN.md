# Auri Phase-by-Phase Implementation Plan

Mapped directly to `AURI_CURSOR_MASTER_SPEC.md` §16.  
Each phase must satisfy its acceptance criteria and quality gates before the next phase starts.

## Quality gate (every phase)

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Plus targeted Playwright when a critical user flow changes.

---

## Phase 0 — Repository and template audit

**Spec:** §16 Phase 0, §3  
**Status:** Complete

| Deliverable              | Plan                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Git repository           | Already initialized; keep `main`/`develop` workflow                                           |
| Source templates         | Store under `templates/source/` with recorded SHA-256                                         |
| `docs/TEMPLATE_AUDIT.md` | Verify worksheets, DOCX tables, cells, formulas, merges, print, page size, duplicates, hashes |
| Local render             | Prefer LibreOffice PDF; if unavailable, document structural-only audit                        |
| Manifest schema          | `templates/manifests/*.json`                                                                  |
| Runtime plan             | Single-report DOCX + byte-preserved DTR XLSX                                                  |
| Exact mappings           | Capture in audit + later constants modules                                                    |

**Exit:** Original sources unchanged; conflicts documented; ready for app scaffold.

---

## Phase 1 — Next.js and design foundation

**Spec:** §16 Phase 1, §4.2–4.3, §5, §6.1–6.5, §15.4  
**Status:** Complete — pending human review before Phase 2

| Deliverable             | Plan                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| Next.js App Router + TS | `pnpm` project at repo root, strict TS                           |
| Tailwind + tokens       | CSS variables from §5.3; Geist/modern grotesk                    |
| Tooling                 | eslint, prettier, vitest, typecheck, `pnpm check`                |
| UI primitives           | Local Radix/shadcn-derived button, input, etc. restyled for Auri |
| Route groups            | `(marketing)`, `(auth)`, `(app)/app`                             |
| Shells                  | Marketing nav, auth layout, app sidebar/mobile nav               |
| Motion                  | GSAP/`@gsap/react` isolated; `prefers-reduced-motion` utility    |
| No starter junk         | Replace default Next content with Auri branding                  |

**Exit:** Typed, linted, branded shells navigate on desktop/mobile; stop for review before Phase 2.

---

## Phase 2 — Supabase foundation and authentication

**Spec:** §8, §6.4, §11.1, §12.2  
**Status:** Revised complete (code) — Drizzle owns portable schema; Supabase Auth/Storage overlays for production; fix local Postgres password then `db:migrate` / `db:smoke`

- Hosted Supabase Auth + SSR clients / Proxy / protected `/app`
- Drizzle schema + `drizzle/` migrations for all §8.1 tables (local Postgres + Supabase Postgres)
- Production overlays: auth.users FK, profile trigger, RLS, Storage (`supabase/overlays/`)
- Server DAL + idempotent `ensureProfile` for local profile provisioning
- See `docs/DATABASE.md`

**Exit:** Multi-user isolation tests pass; no service key in client; DAL scopes by session UUID.

---

## Phase 3 — Onboarding and settings

**Spec:** §7.2–7.4, §11.2, §4.2 settings routes  
**Status:** Complete

| Deliverable           | Plan                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Resumable onboarding  | `/onboarding` six-step wizard; progress inferred from profile/schedule/signatories/templates |
| Profile/office        | Onboarding + `/app/settings/profile`                                                         |
| Schedule builder      | Compressed + standard presets; seven-day Zod validation; active schedule FK integrity        |
| Four signatories      | Onboarding + `/app/settings/signatories`                                                     |
| Template availability | DB active rows and/or Phase 0 manifest+source check                                          |
| Snapshot builders     | Server-only builders for report snapshots (used by Phase 4; no report create in Phase 3)     |
| Settings pages        | Profile, schedule, signatories, templates under `/app/settings/*`                            |

**Exit:** Sample employee/office/schedule/signatories enterable without code changes.

---

## Phase 4 — Report periods and daily editor

**Spec:** §7.5–7.8, §9.1–9.3, §4.5–4.6  
**Status:** Complete — see `docs/PHASE4_REPORTS.md`

- First/second-half creation with transactional daily rows
- Schedule classification + off labels
- Time normalize/validate; server-side worked/undertime minutes
- Autosave, copy previous workday, validation summary
- Finalize/reopen; draft snapshot refresh (`snapshots_refreshed_at`)
- Routes `/app/reports*`, dashboard current-period wiring
- `pnpm reports:smoke` / `phase4:check`; Playwright skipped without Auth credentials

**Exit:** Aug 1–15 2026 fixture + unit tests for time math — met.

---

## Phase 5 — Accomplishment presets

**Spec:** §16 Phase 5, §7.9

- [x] CRUD, search/combobox, shortcuts, use-count ordering
- [x] Multi-select into day entry; reorder/remove
- [x] Seed suggested presets from sample report language
- [x] Server-authoritative apply + duplicate prevention + soft deactivate
- [x] `pnpm presets:smoke` / `phase5:check`; docs `PHASE5_PRESETS.md`

**Exit:** Preset application preserves order and editability — met.

---

## Phase 6 — DOCX runtime template and export

**Spec:** §3.1, §10.4, audit runtime plan

- `prepare-accomplishment-template.ts` → one-page 16-row tagged DOCX
- Manifest hash activation
- Mapper + structural validators
- Private template upload path
- DOCX export endpoint

**Exit:** No unresolved tags; one report copy; opens without repair.

---

## Phase 7 — XLSX DTR export

**Spec:** §3.2, §10.5

- JSZip + XML DOM byte-preserving patcher
- Dual-copy writer; preserve formulas/merges/drawings/VML/print
- Structural validators + export endpoint

**Exit:** Left/right match; `F45`/`N45` formulas remain; one legal landscape page.

---

## Phase 8 — Preview, generation review, and history

**Spec:** §4.7–4.8, §10.1–10.2, §10.6–10.7

- Semantic previews (not pixel-Office claims)
- Generate review panel with warning acknowledgement
- ZIP package, Storage upload, signed/protected download
- Current vs outdated export states

**Exit:** Partial failures accurate; cross-user download blocked.

---

## Phase 9 — Marketing and motion polish

**Spec:** §15, §5.6

- Full landing page copy/sections
- Selective GSAP sequences + reduced-motion path
- Empty/error/skeleton polish; metadata/icons
- Dark mode only if light theme is complete

**Exit:** No animation-hidden content; branded non-generic UI.

---

## Phase 10 — Hardening, CI, and deployment

**Spec:** §13, §17–§20

- Full unit/integration/E2E suite
- GitHub Actions CI
- Production Supabase + Vercel config/docs
- Launch checklist and smoke test

**Exit:** Clean-clone CI green; two-account RLS verified; Office open/print review passed.

---

## Explicit deferrals (do not pull forward)

From §2 / §21: PDF worker, org accounts, approvals, signature images, template designer UI, holiday import, PWA, AI accomplishments, email sending, LibreOffice on Vercel.
