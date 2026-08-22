# Phase 4 — Report periods and daily editor

## Scope

Implemented:

- First-half / second-half report creation with transactional daily entries
- Schedule-based day classification from immutable snapshots
- Report list, detail, and mobile-first daily editor
- Time normalization, worked minutes, undertime, manual override
- Autosave with failed-save recovery
- Copy previous workday, clear day, validation/readiness
- Finalize and deliberate reopen (export `is_current` invalidated)

Related Phase 5 (see `docs/PHASE5_PRESETS.md`):

- Accomplishment preset CRUD / picker is wired into the daily editor
- Apply is server-authoritative and respects the same finalized/archived guards

Not started (later phases):

- DOCX/XLSX generation, previews, ZIP, export history (Phases 6–8)

## Report creation transaction

`ReportPeriodService.create` → `createOwnReportPeriod`:

1. Authenticate via Supabase `getUser()` (never trust browser `user_id`).
2. Require completed onboarding, active schedule, four signatories.
3. Build profile/schedule/signatory snapshots.
4. Idempotently return an existing non-archived report for the same date range.
5. Insert `report_periods` + one `daily_entries` row per calendar date in a single DB transaction.
6. Classify each date from the schedule snapshot; label scheduled-off days and mark them complete when labeled.
7. Roll back the entire create if any entry insert fails.

## Snapshots and refresh

- Snapshots are copied at create time and are not silently rewritten when settings change.
- Draft/ready reports support **Refresh from current settings** (confirmation required).
- Refresh updates snapshot JSON and sets `report_periods.snapshots_refreshed_at`.
- “Settings changed since snapshot” warnings compare settings `updated_at` to `coalesce(snapshots_refreshed_at, created_at)`.

## Time and undertime

- Accept `700`, `7:00`, `07:00`, and Postgres `HH:MM:SS`; store canonical `HH:MM`.
- Arrival/departure are pairs; arrival &lt; departure; AM departure ≤ PM arrival.
- Worked minutes = sum of valid AM + PM session durations (no break inference).
- Undertime = late arrival + early departure contributions only (`max(0, …)`); overtime never cancels undertime.
- Store both `calculated_undertime_minutes` and `undertime_override_minutes`; override wins for display/export readiness.

## Autosave recovery

- Debounced save (~500ms) plus blur/Save now.
- Visible states: Unsaved / Saving… / Saved / Save failed (+ Retry).
- Failed drafts retained in `sessionStorage` keyed by `userId:reportId:entryId`.
- Stale responses ignored via client revision counters.
- Server recalculation is authoritative; client totals are preview only.

## Status transitions

| Status      | Meaning                                               |
| ----------- | ----------------------------------------------------- |
| `draft`     | Editable; readiness not met                           |
| `ready`     | Editable; no blocking validation errors               |
| `finalized` | Read-only until deliberate reopen; `finalized_at` set |
| `archived`  | Not editable; allows a new period for the same dates  |

Finalize requires a fresh server validation with zero blocking errors.  
Reopen clears `finalized_at`, returns draft/ready from validation, and sets related `report_exports.is_current = false` without deleting rows.

## DAL authorization

Every report/daily mutation:

- Uses verified Supabase user UUID
- Scopes by report id **and** user id
- Rejects client-supplied ownership fields
- Rejects edits when status is `finalized` or `archived`

RLS remains defense in depth for production Supabase; direct Drizzle connections still require DAL checks.

## Testing

| Suite              | Command                                    | Notes                                                                           |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------- |
| Unit + integration | `pnpm test`                                | Integration uses disposable local Postgres rows when `DATABASE_URL` is set      |
| Report smoke       | `pnpm reports:smoke` / `pnpm phase4:check` | Aug 1–15 2026 classification fixture                                            |
| Playwright         | `pnpm test:e2e`                            | **Skipped** unless Auth keys and `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` are set |

Live Auth browser E2E is not claimed when credentials are absent.
