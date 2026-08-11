# Phase 5 — Accomplishment presets

## Scope

Implemented:

- User-owned preset CRUD at `/app/presets`
- Soft deactivation (`is_active = false`) instead of hard delete
- Idempotent starter-preset seeding (explicit empty-state action)
- Searchable multi-select picker in the Phase 4 daily editor
- Server-authoritative apply with duplicate prevention and use-count tracking
- Dashboard quick action to manage presets
- Unit, live Postgres integration, smoke, and optional Playwright coverage

Not started (later phases):

- DOCX/XLSX generation, semantic preview, export history (Phases 6–8)
- Organization-wide / shared preset libraries
- AI-generated accomplishment text

## Ownership and authorization

- Presets always belong to the authenticated Supabase user UUID from `getUser()`.
- Browser-supplied `user_id` / `owner_id` fields are rejected.
- DAL modules under `src/db/dal/presets.ts` are `server-only` and scope every query by `user_id`.
- Production RLS on `accomplishment_presets` remains defense in depth; direct Drizzle access still requires DAL checks.

## Validation

Shared schema: `src/lib/validation/presets.ts` (`presetSchema`).

| Field      | Rules                                                               |
| ---------- | ------------------------------------------------------------------- |
| `label`    | Required, trimmed, max 80; original casing preserved                |
| `content`  | Required, trimmed, max 500; original casing preserved               |
| `category` | Optional; empty → `null`; max 60                                    |
| `shortcut` | Optional; empty → `null`; stored lowercase; max 16; unique per user |

Ownership and usage fields (`user_id`, `use_count`, `last_used_at`) cannot be supplied by the browser.

Shortcut conflicts return: `That shortcut is already in use.` (never raw PostgreSQL errors).

## Starter presets

Exact content from master spec §16:

1. Assisted visitors at the Office of the Vice Mayor
2. Assisted the Vice Mayor in activities and programs
3. Prepared, formatted, and printed official documents
4. Edited photos and digital content for publications and presentations
5. Attended the flag ceremony

Behavior:

- Offered via **Add starter presets** on the empty `/app/presets` page (not silent auto-seed).
- Seeds only for the authenticated user.
- Idempotent: matches existing rows by normalized content (active or inactive).
- Does not overwrite edited presets.
- Does not reactivate intentionally deactivated starter content.

## Search and ordering

Default list (no query):

1. Active only
2. Highest `use_count`
3. Most recent `last_used_at`
4. Alphabetical label, then `created_at`

Search matches label, content, category, and shortcut (case-insensitive), and remains user-scoped.

## Shortcut semantics (v1)

- Optional short codes for picker search and exact match.
- Stored in lowercase canonical form for case-insensitive uniqueness.
- Keyboard interaction is scoped to the open picker only:
  - type to filter
  - arrows to move
  - Enter toggles the active/exact-shortcut match
  - Escape closes
- No document-level key hijacking; time inputs and browser shortcuts remain unaffected.
- Shortcuts display as badges in the management list and picker.

## Applying presets

`applyOwnPresetsToDailyEntry` (transaction):

1. Authenticate and derive user UUID.
2. Load report + entry with ownership scope; reject finalized/archived.
3. Lock the daily entry row (`FOR UPDATE`).
4. Load selected presets as active + owned; reject missing/inactive/foreign.
5. Preserve selection order; append non-duplicate content to `accomplishments text[]`.
6. Recalculate completeness; persist entry.
7. Increment `use_count` / set `last_used_at` only for presets actually inserted.
8. Return canonical accomplishments, applied/skipped ids, and usage data.

Duplicate detection compares trimmed, whitespace-collapsed, case-insensitive content. Storage keeps original casing. Repeated requests / retries do not re-append or re-increment.

Preset IDs are **not** stored inside `daily_entries.accomplishments`. Inserted text is independently editable, reorderable, and removable. Later preset edits do not rewrite existing reports.

## Daily editor integration

- Picker lives above the accomplishments list in `DailyEditor`.
- Local unsaved edits are flushed before apply.
- Uses existing save-state / `sessionStorage` failed-draft recovery / revision guards.
- Empty picker state links to `/app/presets`.
- Picker hidden when the report is read-only; server still enforces.

## Testing

| Layer       | Location / command                                                           |
| ----------- | ---------------------------------------------------------------------------- |
| Unit        | `src/lib/presets/*.test.ts`, `src/lib/validation/presets.test.ts`            |
| Integration | `tests/integration/phase5-presets.test.ts` (live Postgres, disposable users) |
| Smoke       | `pnpm presets:smoke` / `pnpm phase5:check`                                   |
| E2E         | `tests/e2e/phase5-presets.spec.ts` (skipped without `E2E_USER_*`)            |

Live Auth E2E requires hosted Supabase public keys plus an onboarded `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`. Missing credentials skip the suite; no Auth bypass is provided.

## Schema note

Phase 5 uses the existing `accomplishment_presets` table from core schema. No additive migration was required. Query ordering uses `ORDER BY use_count DESC` (index direction ASC vs DESC is an optimization nuance only).
