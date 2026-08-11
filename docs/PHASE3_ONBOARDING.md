# Phase 3 — Onboarding and settings

## What shipped

- Resumable onboarding at `/onboarding` (six steps per master spec §11.2).
- Settings pages: profile, work schedule, signatories, templates.
- Server-only DAL + Zod validation; session-scoped mutations only.
- Snapshot builders for later report creation (Phase 4).

## Operator checklist

1. Local Postgres verified (`pnpm db:inspect` / `migrate` / `smoke`).
2. Hosted Supabase Auth configured (`NEXT_PUBLIC_SUPABASE_*`, site URL, redirect URLs including `/auth/callback` and `/onboarding` as needed).
3. Sign in with a real account → complete onboarding → confirm `/app` access.
4. Confirm settings updates persist and remain user-scoped.

## Automated vs live tests

| Kind              | Command / action                      | Notes                                                   |
| ----------------- | ------------------------------------- | ------------------------------------------------------- |
| Unit / mocked DAL | `pnpm test`                           | Progress inference, Zod, ownership, ensureProfile mocks |
| Quality gates     | `pnpm format:check` … `pnpm db:check` | Required every phase                                    |
| Live Auth E2E     | Manual browser against local DB       | Only with real credentials; not invented                |

## Out of scope

Report periods, daily editor, presets, document generation (Phase 4+).
