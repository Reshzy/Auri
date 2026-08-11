# Auri Implementation Status

Last updated: 2026-08-11

## Current phase

**Phase 2 complete (code).** Live Supabase credentials were not present in this environment; apply migrations and configure Auth redirects before treating acceptance criteria as fully verified in a running project.

**Phase 3 has not started.**

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

### Phase 2 — Supabase foundation and authentication

- [x] `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `server-only`
- [x] Env validation (`src/lib/env.ts`) + safe `.env.example` (no real secrets)
- [x] Browser / server / proxy / admin Supabase clients
- [x] Root `proxy.ts` session refresh + `/app/*` protection + auth-entry redirects
- [x] Sign-up, sign-in, forgot-password, reset-password, callback, sign-out
- [x] Migrations for all eight §8.1 tables + indexes/constraints
- [x] `handle_new_user` profile trigger
- [x] RLS on every user-owned table + template read-only for authenticated
- [x] Private `templates` and `generated-reports` storage buckets/policies
- [x] Hand-authored `database.types.ts` aligned to migrations
- [x] Automated tests + `pnpm auth:check`
- [x] Removed leftover `auri-web/` ignore/exclude references

## Quality gates (Phase 2)

| Check                  | Result                                |
| ---------------------- | ------------------------------------- |
| `pnpm format:check`    | Pass                                  |
| `pnpm lint`            | Pass                                  |
| `pnpm typecheck`       | Pass                                  |
| `pnpm test`            | Pass (20 tests)                       |
| `pnpm build`           | Pass                                  |
| `pnpm templates:audit` | Pass                                  |
| `pnpm auth:check`      | Pass (live credential checks skipped) |

## Migrations

| File                                                     | Purpose                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| `supabase/migrations/20260811000001_core_schema.sql`     | Eight core tables, constraints, indexes, `updated_at` triggers |
| `supabase/migrations/20260811000002_profile_trigger.sql` | `on_auth_user_created` → insert `profiles`                     |
| `supabase/migrations/20260811000003_rls_policies.sql`    | Enable RLS + least-privilege ownership policies                |
| `supabase/migrations/20260811000004_storage_buckets.sql` | Private buckets + generated-report path policies               |

### RLS summary

- **Owner tables** (`profiles`, `work_schedules`, `signatories`, `accomplishment_presets`, `report_periods`, `daily_entries`, `report_exports`): authenticated users only access rows where `auth.uid()` matches owner id/`user_id`.
- **profiles**: select/update own row; inserts via security-definer trigger only.
- **report_periods**: delete only when `status = 'draft'`; updates only when current status is `draft` or `ready`.
- **daily_entries**: writes gated by parent report editability.
- **template_versions**: authenticated `select` only; writes require service role.
- **storage `generated-reports`**: object path first folder must equal `auth.uid()`.
- **storage `templates`**: no authenticated policies (server/admin via service role).

## Environment variables

See `.env.example`:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `AURI_TEMPLATE_BUCKET` (default `templates`)
- `AURI_GENERATED_BUCKET` (default `generated-reports`)
- `AURI_DEFAULT_TIMEZONE` (default `Asia/Manila`)

Never commit `.env.local` or real keys.

## Manual Supabase setup still required

1. Create a Supabase project (or run `pnpm exec supabase start` with Docker).
2. Copy URL, publishable key, and service-role key into `.env.local`.
3. Apply migrations: `pnpm exec supabase db push` (linked project) or run SQL in the dashboard.
4. Auth → URL configuration: site URL = `NEXT_PUBLIC_SITE_URL`; allow redirects to `/auth/callback`.
5. Confirm email confirmation / recovery templates point at the callback URL.
6. Live verification with two users: isolation (A cannot read B), session refresh, protected redirects.

## Blockers / notes

- LibreOffice is not installed locally, so Phase 0 PDF/page-spill visual render was skipped. Structural OOXML audit is complete; visual gate deferred (Phase 6/7).
- Runtime templates are intentionally not generated yet (Phase 6/7). Manifests remain `active: false`.
- Canonical app lives at the repository root (`src/app/`). The unused `auri-web/` directory is gone; tooling no longer references it.
- Bootstrap DOCX/XLSX copies remain at the repository root and match `templates/source/` hashes.
- Live multi-user isolation and session persistence checks need real Supabase credentials (not available during this implementation run).

## Next work

1. Operator: apply Phase 2 migrations + configure Auth URLs with real credentials.
2. Phase 3: onboarding and settings (not started).

## Assumptions

1. Canonical immutable sources are `templates/source/*`; root copies are convenience duplicates until cleanup.
2. Right-side DTR name/period/signature already mirror via formulas (`I6`, `L8`, `A53`, `I53`); day time/undertime cells still need dual writes.
3. Source DOCX has 15 day rows; runtime must expand to 16 — deferred to template/export phases.
4. After sign-up with an immediate session, users go to `/app` (onboarding UI remains a Phase 3 shell).
5. `/reset-password` is added for recovery completion even though §4.3 lists only `/forgot-password`.
6. `database.types.ts` is hand-authored from migrations; regenerate with `supabase gen types` after linking a project if desired.
7. Package name is `auri` (lowercase) to satisfy npm naming rules.
