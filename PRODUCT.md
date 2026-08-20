# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: Rodge Andru P. Viloria, a contract-of-service (COS) employee at the Municipality of Sanchez Mira, Vice Mayor’s Office. Each reporting period he prepares a Daily Time Record and an accomplishment report, often on a compressed weekday schedule, repeating similar accomplishment language across days. He works mainly on a desktop or laptop and may enter information from a phone.

Other signed-in accounts must stay isolated. They are not the design center for v1.

## Product Purpose

Auri turns one set of daily attendance and accomplishment entries into two official files: a Daily Time Record based on CSC Form No. 48 (XLSX) and an Accomplishment Report (DOCX). The user records the work once, reviews it in the app, and generates both files without re-encoding Office templates every half-month.

Success: after daily entries exist, a complete half-month period with both valid output files can be prepared in under five minutes. Supporting success: no duplicate encoding between the two documents; no unresolved template tokens; both files open without a repair warning in current Microsoft Word and Excel; DTR left and right copies stay identical; drafts auto-save and recover after refresh or connection loss.

Product promise: Record the work once. Let Auri handle the paperwork.

## Positioning

Auri fills versioned copies of the office’s existing official templates. It does not replace those forms with a new layout, and it is not an HR attendance platform, payroll system, biometric time clock, or approval workflow.

Neighboring products that redesign the DTR or accomplishment report, or that require the same day to be typed twice in Word and Excel, cannot truthfully copy this.

## Operating Context

Typical v1 flow: sign in → onboarding (employee, office, signatories, schedule) → create first-half (days 1–15) or second-half (day 16–last day) report for the current month → enter AM/PM times and accomplishments → review validation and a semantic web preview → generate DOCX and XLSX together → open the files in Word/Excel and print.

Timezone and date conventions: `Asia/Manila`, locale `en-PH`. UI language: English.

App routes: Overview, Reports, Presets, Settings (profile, schedule, signatories, templates).

Auth is Clerk; data is isolated per personal account. Hosting and storage assumptions in-repo: Vercel + Supabase Postgres/Storage.

First-workplace defaults (editable, not hard-coded identity):

- Employee: Rodge Andru P. Viloria, COS Employee
- Organization: Municipality of Sanchez Mira
- Office: Vice Mayor’s Office
- Common schedule: compressed four-day week (Mon–Thu 07:00–12:00 / 13:00–18:00; Fri–Sun off)
- Signatory slots: COS employee; Secretary of the Sangguniang Bayan (Joel A. Puzon); HRMO I (Lani P. Langaman); Vice Mayor (Connie Marie O. Sacramed)
- Starter accomplishment presets for that office’s recurring work (visitors, Vice Mayor support, official documents, digital content, flag ceremony)

Preview copy that must stay true: the web preview verifies content; the downloaded Word and Excel templates are the official print layouts. Official report previews stay paper-white. Source templates stay immutable; runtime templates are derived and hashed.

## Capabilities and Constraints

Shipped v1 capabilities: Clerk auth; resumable onboarding; profile, schedule, signatories, and template settings; half-month report periods; daily editor with presets, copy-previous-workday, auto time/undertime, finalize/reopen, visible save/validation/export states; semantic DOCX/XLSX preview; paired generation plus ZIP; versioned per-user private Storage for generated files.

v1 constraints that still hold:

- Fill versioned runtime copies of the supplied templates; never overwrite `templates/source/`; never invent a new official layout in application code.
- Typed signatory names only; no signature-image upload.
- PDF generation, in-browser Word/Excel editing, emailing reports, org/team accounts, supervisor approval, template-mapping UI, and AI-generated accomplishments are deferred.
- Do not claim that a generated file is legally signed, submitted, government-approved, or error-free.
- Personal-use experience with secure multi-user isolation; no admin panel in v1.
- Dark mode remains deferred until a full semantic dark token set can keep official report previews paper-white.

Explicit non-goals: biometric capture, location tracking, payroll, leave credits, organization-wide employee management, arbitrary user-uploaded template mapping, server-side LibreOffice conversion on Vercel.

Undecided: remote production launch (Clerk, Supabase Storage, Vercel, Office visual gates) is still a manual operations checklist, not a product-scope change. Public launch timing, pricing, and any later expansion beyond these office templates remain open.

## Brand Commitments

Name: Auri. Tagline: **Work, without the paperwork.** Supporting lines in product copy: “Your reporting routine, simplified.” / “Create your Daily Time Record and accomplishment report from one simple workspace.” Primary CTA: “Create your report.”

Voice and personality: warm, capable, calm, and quietly fast. Major brand language is abstract (flow, rhythm, glow, momentum). The mark and major brand moments must not depend on literal folders, pens, clocks, or document logos.

Binding color constraint from the product spec: orange. Do not expand it here.

The product UI may be modern; exported forms must retain their official design.

Assets: `src/components/brand/auri-mark.tsx`, `public/logo.png`. Copy constants live in `src/lib/brand.ts`.

Public marketing, Open Graph, and analytics must not include employee names, report contents, or fixture data from the first workplace.

## Evidence on Hand

Real artifacts:

- Product contract: `AURI_CURSOR_MASTER_SPEC.md`
- Source Office files: `templates/source/` (`ACCOMPLISHMENT - RODGE.docx`, `DTR RODGE.xlsx`; sample heading Municipality of Sanchez Mira / Vice Mayor’s Office)
- Runtime templates and hashes: `templates/runtime/`, `templates/manifests/`, `docs/TEMPLATE_AUDIT.md`
- Incumbent interface and design notes: the shipped Next.js app and `docs/DESIGN.md`

Do not fabricate testimonials, case studies, press, customer counts, independent benchmarks, or legal/approval claims. Marketing mock data must stay anonymous. Do not put employee names, report contents, or fixture data in Open Graph images, analytics, or the public landing mock.

## Product Principles

1. Record once; the official paperwork is derived, never re-typed into a second form.
2. Official files stay official; the app can feel modern without changing print layouts.
3. Trust is visible: save, validation, period, template version, and export state stay on screen.
4. Repeated work becomes defaults, presets, and copy actions so a half-month finishes in minutes.
5. Private workplace facts stay inside the signed-in product; public surfaces never leak them.

## Accessibility & Inclusion

Target WCAG 2.2 AA (`docs/ACCESSIBILITY.md`). Keyboard-complete navigation for the app shell, dialogs, onboarding, and daily editor. Status is never color-only. `prefers-reduced-motion` must show content immediately. Screen-reader announcements for save and generation. Touch targets on marketing mobile nav, app bottom nav, and onboarding chips. Animation failure must not hide landing copy, CTAs, onboarding, or editor fields.
