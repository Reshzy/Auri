# Auri

**Work, without the paperwork.**

Auri turns one set of daily attendance and accomplishment entries into:

- a Daily Time Record (CSC Form No. 48) in XLSX; and
- an Accomplishment Report in DOCX.

## Status

Phase 0 (template audit) and Phase 1 (Next.js design foundation) are complete.
See `docs/IMPLEMENTATION_STATUS.md` and `docs/IMPLEMENTATION_PLAN.md`.

## Develop

```bash
pnpm install
pnpm dev
```

## Quality gates

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm templates:audit
```

Or:

```bash
pnpm check
```

## Spec and templates

- Product contract: `AURI_CURSOR_MASTER_SPEC.md`
- Template audit: `docs/TEMPLATE_AUDIT.md`
- Source templates: `templates/source/`
