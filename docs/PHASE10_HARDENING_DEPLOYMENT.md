# Phase 10 — Hardening, CI, production readiness, and deployment

Last updated: 2026-08-13

Phase 10 is the final Auri v1 engineering phase. It does **not** add product features. Phases 0–9 behavior is preserved.

Supabase Auth is the authentication provider:

```text
Verified Supabase Auth session
→ profiles.auth_user_id
→ profiles.id UUID
→ explicit DAL ownership checks
```

Supabase remains production PostgreSQL and private Storage. Service-role keys are trusted server/setup access only.

## What shipped in code

- GitHub Actions CI from a clean checkout (`quality`, public Playwright, gated authenticated Playwright, gated Storage smoke)
- Disposable PostgreSQL in CI; migrations from zero plus `0003_mighty_chamber` incremental replay
- Server-auth Supabase overlays under `supabase/overlays/server-auth/`
- Security headers, secret scan, dependency audit script
- Private bucket setup for `templates` and `generated-reports`
- Deployment, operations, testing, environment, and launch-checklist documentation
- Visual-review fixtures under `tests/fixtures/reports/`
- Public vs authenticated Playwright projects (authenticated traces off)

## What was not started

No post-v1 work: PDF export, dark mode, org accounts, approvals, signature images, template UI, holiday import, PWA, CSV import, AI rewriting, submission tracking, extra government templates.

## Gate status

| Gate                                                        | Result                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Clean-clone CI workflow added                               | Passed (workflow present; first GitHub run pending until pushed)                                     |
| Local `pnpm format:check` / lint / typecheck / test / build | Passed                                                                                               |
| Disposable PostgreSQL from-zero migrate                     | Pending manual verification locally (Docker absent). CI job applies from zero.                       |
| `0003_mighty_chamber` incremental replay                    | Pending on CI disposable DB. Local schema check Passed.                                              |
| `pnpm security:check`                                       | Passed                                                                                               |
| `pnpm audit:deps`                                           | Passed — no known high production vulnerabilities                                                    |
| Production Supabase migrate                                 | Pending manual verification — no production project/credentials in this environment                  |
| Server-auth RLS overlays applied in production              | Pending manual verification                                                                          |
| Unauthenticated Data API cannot read private tables         | Pending manual verification (requires live project)                                                  |
| Private production buckets + template upload                | Pending manual verification — `SUPABASE_URL` / service role absent                                   |
| Cross-user Storage/DAL isolation (live)                     | Integration tests cover DAL isolation with disposable Postgres. Live Storage two-user check pending. |
| Production Supabase Auth (Site URL, redirects, OAuth)       | Pending manual verification — Dashboard providers and production Site URL not confirmed              |
| Authenticated Playwright critical path                      | Pending manual verification — `E2E_USER_*` absent                                                    |
| Vercel preview/production deploy                            | Pending manual verification — project not linked; no Vercel token                                    |
| Office visual / repair-warning review                       | Pending manual verification — LibreOffice and Microsoft Office absent                                |
| High-severity exploitable dependency                        | Passed (`pnpm audit:deps`)                                                                           |

## Launch classification

See `docs/LAUNCH_CHECKLIST.md` and `docs/IMPLEMENTATION_STATUS.md`. Auri cannot be `READY FOR LAUNCH` until production migrate, private buckets, production Auth, authenticated E2E, Office review, Vercel smoke, and CI-on-GitHub are actually run.
