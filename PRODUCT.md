# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a contract-of-service employee who prepares a Daily Time Record and an accomplishment report for each half-month period, using the Municipality of Sanchez Mira / Vice Mayor’s Office templates. The initial account is Rodge Andru P. Viloria. Desktop or laptop is the main surface; a phone may be used to enter the day’s times and accomplishments.

Auri is a personal-use product with secure multi-user isolation. It is not an HR attendance platform, payroll system, or organization-wide tool in v1.

## Product Purpose

Auri turns one set of daily attendance and accomplishment entries into two official files: a Daily Time Record (CSC Form No. 48) in XLSX, and an Accomplishment Report in DOCX. The user records the day once, reviews it in the app, and generates both files without re-encoding Office templates each pay period.

Success: after daily entries exist, a complete half-month period with both valid output files can be prepared in under five minutes. Supporting success: no duplicate encoding between the two documents, no unresolved template tokens, files that open without a repair warning in current Microsoft Word and Excel, identical left/right DTR copies, auto-saved recoverable drafts, and per-user isolation of periods and files.

## Positioning

Auri fills versioned copies of the supplied official Office templates. It does not invent a new form layout. Neighboring products that redesign the DTR or accomplishment report, or that require the same day to be typed twice in Word and Excel, cannot truthfully copy this.

## Operating Context

- Timezone `Asia/Manila`; Philippine date conventions; English locale.
- Reporting periods: first half (days 1–15) and second half (day 16–last day of the month).
- Commonly a configurable compressed work schedule; days are classified as workdays or scheduled off.
- Four typed signatories (no signature-image upload in v1).
- Workflow: sign in → onboarding (profile, office, schedule, signatories, templates) → create the current half-month → enter AM/PM times and accomplishments (presets and copy-previous when useful) → review validation and preview → generate both files → open in Word/Excel and print.
- App routes: Overview, Reports, Presets, Settings (profile, schedule, signatories, templates).
- Source templates stay immutable; runtime templates are derived and hashed. Official report previews stay paper-white.
- Auth is Clerk; data is isolated per personal account. Hosting and storage assumptions in-repo: Vercel + Supabase Postgres/Storage.

## Capabilities and Constraints

Confirmed:

- Daily editor with autosave, time normalization/validation, worked and undertime minutes, accomplishment presets, copy previous workday, finalize/reopen.
- Generate DOCX and XLSX together; store versioned exports; download individually or as a ZIP.
- Never overwrite files in `templates/source/`. Never regenerate official layouts from scratch in application code.
- Typed signatory names only. PDF generation, email sending, and in-browser Word/Excel editing are deferred.
- WCAG 2.2 AA is a product requirement (`docs/ACCESSIBILITY.md`).

v1 non-goals (do not imply these in copy or UI):

- biometric attendance, location tracking, payroll, leave credits, supervisor approval routing, organization-wide employee management;
- arbitrary user-uploaded DOCX/XLSX mapping or a generic template designer;
- AI-generated accomplishments;
- claims that a generated report is legally signed or submitted;
- an admin panel.

Undecided: public launch timing, pricing, and any later expansion beyond these office templates.

## Brand Commitments

- Name: **Auri**. Tagline: **Work, without the paperwork.**
- Promise: record the work once; let Auri handle the paperwork.
- Voice: warm, capable, calm, and quietly fast. Major brand language is abstract (flow, rhythm, glow, momentum). The mark must not depend on literal folders, pens, clocks, or document logos.
- Binding color constraint from the product spec: orange. Do not expand it here.
- The product UI may be modern; exported forms must retain their official design.
- Assets: `src/components/brand/auri-mark.tsx`, `public/logo.png`. Copy constants live in `src/lib/brand.ts`.

## Evidence on Hand

- Source templates: `templates/source/ACCOMPLISHMENT - RODGE.docx`, `templates/source/DTR RODGE.xlsx` (sample heading Municipality of Sanchez Mira / Vice Mayor’s Office). Manifests and hashes: `templates/manifests/`, `docs/TEMPLATE_AUDIT.md`.
- Product contract: `AURI_CURSOR_MASTER_SPEC.md`.
- No testimonials, press, case studies, or third-party customer names. Do not fabricate them.
- Do not put employee names, report contents, or fixture data in Open Graph images, analytics, or the public landing mock.

## Product Principles

1. **Record once.** The same day must never be encoded separately for DTR and accomplishment.
2. **Official output, app as workspace.** Familiar government forms stay the files; Auri is how they get filled.
3. **Trust through visibility.** Save state, validation, selected period, and template version stay on screen.
4. **Fast repetition.** Repeated accomplishments and schedules become presets, copy actions, and defaults.
5. **Personal and bounded.** Isolate each account; never claim a file is signed, approved, or submitted.

## Accessibility & Inclusion

WCAG 2.2 AA. Keyboard-complete critical flows (navigation, dialogs, onboarding, daily editor). Status is never color-only. `prefers-reduced-motion` must not hide content. Critical landing copy, CTAs, onboarding, and editor fields exist without animation.
