# Auri Implementation Status

Last updated: 2026-08-11

## Current phase

**Phase 0 + Phase 1 complete.** Stop for review before Phase 2.

## Completed

### Phase 0 — Repository and template audit

- [x] Read `AURI_CURSOR_MASTER_SPEC.md`
- [x] Inspect repository (greenfield: spec + two Office templates)
- [x] Place source templates under `templates/source/` (byte-identical copies)
- [x] Record SHA-256 hashes
- [x] Write `docs/TEMPLATE_AUDIT.md`
- [x] Write `docs/IMPLEMENTATION_PLAN.md` (phase map to §16)
- [x] Create manifest schema drafts under `templates/manifests/`
- [x] Document runtime derivation plan
- [x] Add `scripts/audit-templates.ts` + `pnpm templates:audit`

### Phase 1 — Next.js and design foundation

- [x] Next.js App Router + TypeScript + pnpm lockfile
- [x] Tailwind v4 + Auri color/type tokens
- [x] Lint / format / typecheck / test / build scripts (`pnpm check`)
- [x] Marketing, auth, and application shells with responsive navigation
- [x] Accessible UI primitives (button, input, label) + brand mark
- [x] GSAP hero aurora isolated in a Client Component
- [x] Reduced-motion CSS + `prefersReducedMotion()` helper
- [x] Route placeholders for required v1 navigation surfaces

## Quality gates (Phase 1)

| Check                  | Result             |
| ---------------------- | ------------------ |
| `pnpm format:check`    | Pass               |
| `pnpm lint`            | Pass               |
| `pnpm typecheck`       | Pass               |
| `pnpm test`            | Pass (1 unit test) |
| `pnpm build`           | Pass               |
| `pnpm templates:audit` | Pass               |

## Blockers / notes

- LibreOffice is not installed locally, so Phase 0 PDF/page-spill visual render was skipped. Structural OOXML audit is complete; visual gate deferred (Phase 6/7).
- Runtime templates are intentionally not generated yet (Phase 6/7). Manifests remain `active: false`.
- Leftover `auri-web/` bootstrap scaffold was removed; the live app remains at the repository root.
- Bootstrap DOCX/XLSX copies remain at the repository root and match `templates/source/` hashes.

## Next work

1. Human review of Phase 0 audit findings and Phase 1 foundation.
2. Phase 2: Supabase foundation, migrations, RLS, SSR auth clients, protected routes.

## Assumptions

1. Canonical immutable sources are `templates/source/*`; root copies are convenience duplicates until cleanup.
2. Right-side DTR name/period/signature already mirror via formulas (`I6`, `L8`, `A53`, `I53`); day time/undertime cells still need dual writes.
3. Source DOCX has 15 day rows; runtime must expand to 16.
4. Auth forms in Phase 1 are layout-only shells; no Supabase calls yet.
5. Package name is `auri` (lowercase) to satisfy npm naming rules.
