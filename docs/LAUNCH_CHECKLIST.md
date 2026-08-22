# Auri v1 launch checklist

Last updated: 2026-08-13

Every gate is one of: **Passed**, **Failed**, **Blocked**, **Pending manual verification**, **Not applicable**.

## Engineering

| Gate                                                                  | Status                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Clean-clone CI workflow exists and is least-privilege                 | Passed                                                                      |
| GitHub Actions quality job green on this commit                       | Pending manual verification (must push; no Actions run in this session)     |
| `pnpm install --frozen-lockfile`                                      | Passed                                                                      |
| `pnpm format:check`                                                   | Passed                                                                      |
| `pnpm lint`                                                           | Passed                                                                      |
| `pnpm typecheck`                                                      | Passed                                                                      |
| `pnpm test`                                                           | Passed (212 tests, local Postgres integration included)                     |
| `pnpm build`                                                          | Passed                                                                      |
| `pnpm templates:audit` / `docx:audit` / `xlsx:audit`                  | Passed                                                                      |
| `pnpm auth:check` / `db:check` / `security:check`                     | Passed                                                                      |
| `pnpm db:smoke` / `reports:smoke` / `presets:smoke` / `exports:smoke` | Passed                                                                      |
| `pnpm test:e2e` public                                                | Passed (10 tests)                                                           |
| Disposable Postgres migrate from zero                                 | Pending manual verification (Docker absent locally; covered by CI workflow) |
| No high-severity exploitable dependency knowingly ignored             | Passed (`pnpm audit:deps` — no known high production vulnerabilities)       |
| Secrets absent from git and example env files                         | Passed (`pnpm security:check`)                                              |

## Production data and auth

| Gate                                                          | Status                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| Production Supabase project identified                        | Pending manual verification                                |
| Production migrations applied and journal verified            | Pending manual verification                                |
| Server-auth RLS + revoke anon/authenticated                   | Pending manual verification                                |
| Unauthenticated Data API cannot read private tables           | Pending manual verification                                |
| Private `templates` and `generated-reports` buckets           | Pending manual verification                                |
| Trusted runtime templates uploaded; SHA-256 matches manifests | Pending manual verification                                |
| Cross-user DAL isolation (automated integration)              | Passed (Phase 8 live Postgres integration on local `Auri`) |
| Cross-user live Storage isolation                             | Pending manual verification                                |
| Production Auth Site URL, redirects, and OAuth providers      | Pending manual verification                                |
| Authenticated critical Playwright                             | Pending manual verification (`E2E_USER_*` absent)          |
| Second-account isolation Playwright                           | Pending manual verification (`E2E_USER_B_*` absent)        |

## Deployment and Office

| Gate                                                            | Status                                                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Vercel project linked; preview vs production env split          | Pending manual verification                                                                                |
| Vercel production smoke (sign-in + generate + private download) | Pending manual verification                                                                                |
| DOCX one legal landscape page (15- and 16-row)                  | Pending manual verification                                                                                |
| XLSX two matching DTR copies on one legal landscape page        | Pending manual verification                                                                                |
| Files open without Word/Excel repair warnings                   | Pending manual verification                                                                                |
| LibreOffice-only visual review                                  | Blocked (soffice not installed). Even if added later, Microsoft Office still requires manual confirmation. |
| Backup/restore notes published                                  | Passed (`docs/OPERATIONS.md`)                                                                              |

## Classification rule

Auri may be marked **READY FOR LAUNCH** only when all of the following are Passed: clean-clone CI green, production migrations verified, private buckets and templates verified, production Auth works, cross-user isolation verified, authenticated critical E2E passed, Office open/print review passed, Vercel production smoke passed, and no unresolved high-severity security issue remains.

Until those remote/manual gates run, the honest classification is **READY AFTER LISTED MANUAL GATES**.
