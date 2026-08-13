# Phase 9 — Marketing and motion polish

Last updated: 2026-08-13

Phase 9 completes the public landing page, light-theme visual cohesion, selective GSAP, missing product states, and identity metadata. Phase 6–8 export architecture is unchanged. Phase 10 has not started.

## Landing-page structure

Public route: `/` in [`src/app/(marketing)/page.tsx`](<src/app/(marketing)/page.tsx>), composed by [`src/features/marketing/landing.tsx`](src/features/marketing/landing.tsx).

1. Navigation — logo, Product, How it works, Sign in, Get started; compact mobile menu
2. Hero — approved eyebrow, H1 tagline, body, Create your report, See how it works
3. Product visual (`#product`) — static editor composition with fictional generic copy
4. Record → Review → Generate (`#how-it-works`)
5. One input / two outputs (`#outputs`) — DOCX accomplishment report and XLSX DTR
6. Presets and copy-workflow (`#presets`)
7. Trust (`#trust`) — editable Office templates, private files, no overclaims
8. Final CTA (`#get-started`)
9. Minimal footer with the same section links

Approved copy is centralized in [`src/lib/brand.ts`](src/lib/brand.ts). The marketing mock never uses onboarding sample names.

## Final brand treatment

- Warm paper (`#fffaf5`) and orange (`#ea580c`) surfaces
- Abstract mark (rounded orange tile + paper orb); no folders, pens, clocks, or document logos
- Tagline: **Work, without the paperwork.**
- Tabular numerals for time data
- One obvious primary action per screen
- Official report previews remain paper-white (`bg-white`)

## Motion inventory

GSAP is isolated to Client Components via `useGSAP()`. Layouts and non-animated routes do not import `gsap`.

| Location           | Component                  | Behavior                                                    |
| ------------------ | -------------------------- | ----------------------------------------------------------- |
| Landing hero       | `HeroAurora`, `HeroReveal` | Subtle orb drift (paused off-screen); short readable settle |
| Landing sections   | `SectionReveal`            | In-view settle; content visible before JS                   |
| Dashboard          | `FirstVisitStagger`        | Once per session via `sessionStorage`                       |
| Onboarding         | `OnboardingStepMotion`     | Short step settle; progress always visible                  |
| Preview paper      | `PaperEntrance`            | One-shot paper settle                                       |
| Generation success | `GenerationSuccessMotion`  | Brief `power2.out` emphasis                                 |

Not added: scroll hijacking, page transitions, form-control animation, bounce/elastic/spin, custom cursor, continuous high-CPU motion.

## Reduced-motion behavior

- CSS globally shortens animation/transition duration
- `prefersReducedMotion()` skips GSAP tweens
- Critical copy and CTAs ship at full opacity in the initial layout
- No `opacity: 0` CSS waiting on JavaScript
- Harmless short opacity is allowed; transforms and looping aurora are disabled

## State audit

Shared primitives: `EmptyState`, `Alert`, `Skeleton` / `PageSkeleton`, `UnavailableState`.

| Surface                     | State                                                     |
| --------------------------- | --------------------------------------------------------- |
| App routes                  | `loading.tsx` skeleton                                    |
| Root / app                  | `error.tsx` retry; branded `not-found.tsx`                |
| Database unconfigured       | `DatabaseUnavailable`                                     |
| Reports / presets / exports | Shared empty states with a next action                    |
| Templates                   | Warning when missing; success when both available         |
| Generation                  | Safe messages via `toSafeExportUserMessage`; no raw codes |
| Settings mutations          | `toSafeErrorMessage` instead of `error.message`           |
| Save badge                  | Existing unsaved/saving/saved/failed + retry; `aria-live` |
| Export delete               | Dialog with title, description, confirm/cancel            |

## Metadata and assets

- `metadataBase` from `NEXT_PUBLIC_SITE_URL` (localhost fallback)
- Title template `%s — Auri`; default `Auri — Work, without the paperwork.`
- Theme color `#fffaf5`
- `src/app/icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` (abstract mark + tagline, no employee/report data)
- `src/app/manifest.ts`

## Responsive review

Automated: Playwright at 390×844 for marketing mobile nav.

Manual (when a browser is available): landing, sign-in/up, onboarding, dashboard, reports, editor, preview, presets, settings, generation review, export history. Mobile editor keeps the day selector; DTR preview is a stacked list, not a spreadsheet. Accomplishment preview tables may scroll inside the paper frame only.

## Accessibility review

- Skip link on the marketing shell
- Visible `:focus-visible` rings
- Landmarks: header, main, footer, labeled nav
- Dialogs use Radix focus trap with title/description
- Touch targets ≥ 44px on marketing mobile nav and onboarding steps
- Status messages use `role="alert"` / `aria-live`
- Contrast: ink `#17130f` on paper `#fffaf5`; orange-600 on white for primary buttons

## Performance and layout-shift findings

- Hero/section content is in the first HTML payload
- GSAP is not imported from root or app layouts
- Aurora pauses when off-screen
- No CSS-hidden animated content, so failed JS still shows the landing
- Remaining risk: first-load Clerk widgets on auth routes; document binaries stay server-only

## Dark-mode decision

**Deferred.** Light tokens are now consistent (`--auri-bg` aliased to paper), but Clerk still uses a dedicated appearance overlay, previews must stay paper-white, and there is no complete `.dark` token set. Shipping a second theme would compromise Phase 9 quality gates.

## Test results

Automated:

- `pnpm format:check`, `lint`, `typecheck`, `test` (202), `build` — pass
- `pnpm db:check`, `db:smoke`, `reports:smoke`, `presets:smoke`, `exports:smoke` — pass
- `pnpm templates:audit`, `docx:audit`, `xlsx:audit` — pass
- `pnpm test:e2e` — 7 public Phase 9 tests pass (landing, reduced motion, mobile nav, 404, title, OG image, manifest). 4 Clerk-authenticated tests skipped (`E2E_USER_*` not configured).

Manual browser review of authenticated app routes was not completed in this environment (no Clerk E2E user). Playwright covered the public landing at 390×844 and default desktop viewport.

## Remaining external gates

- Live Supabase Storage
- Clerk-authenticated Playwright E2E (`E2E_USER_*`)
- LibreOffice / Microsoft Office visual and repair-warning checks

## Phase 10 boundary

Not started: CI / GitHub Actions, production Supabase configuration, Storage policy deployment, Vercel, backup/restore, PDF export, launch checklist.
