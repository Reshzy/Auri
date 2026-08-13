# Auri

**Work, without the paperwork.**

Auri turns one set of daily attendance and accomplishment entries into:

- a Daily Time Record (CSC Form No. 48) in XLSX; and
- an Accomplishment Report in DOCX.

## Status

Phases 0–9 are complete. Phase 10 (hardening, CI, production readiness) is implemented in-repo. Remote production gates remain manual — see `docs/LAUNCH_CHECKLIST.md` and `docs/IMPLEMENTATION_STATUS.md`.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Copy `.env.example` to `.env.local` and fill Clerk plus local Postgres. Details: `docs/ENVIRONMENT.md`, `docs/DATABASE.md`.

## Quality gates

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm templates:audit
pnpm docx:audit
pnpm xlsx:audit
pnpm auth:check
pnpm db:check
pnpm security:check
```

Or `pnpm check`. Playwright: `pnpm test:e2e` (public always; authenticated skipped without `E2E_USER_*`).

## Spec and docs

- Product contract: `AURI_CURSOR_MASTER_SPEC.md`
- Deployment: `docs/DEPLOYMENT.md`
- Operations: `docs/OPERATIONS.md`
- Testing: `docs/TESTING.md`
- Launch checklist: `docs/LAUNCH_CHECKLIST.md`
- Template audit: `docs/TEMPLATE_AUDIT.md`
- Source templates: `templates/source/`
