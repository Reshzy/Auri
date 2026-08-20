---
target: the landing page
total_score: 18
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-08-20T12-30-02Z
slug: src-app-marketing-page-tsx
---
# Critique — Auri landing page

**Target:** `src/app/(marketing)/page.tsx` → `src/features/marketing/landing.tsx` (`http://localhost:3000/`)
**Mode:** Persuade

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Sticky header never marks the current section. Mock `Saved · 14:02` is a prop, not live status. |
| 2 | Match System / Real World | 3 | AM/PM, half-month, CSC Form 48 fit the job. Hero says **DTR** before it is expanded; **Presets** is product jargon. |
| 3 | User Control and Freedom | 3 | Skip link, logo home, hash exits, mobile Close menu. Clerk **Get started** / **Sign in** are one-way redirects with no in-page cancel. |
| 4 | Consistency and Standards | 2 | Same action is **Get started** (header), **Create your report** (hero + close), **Create account** (footer). |
| 5 | Error Prevention | 2 | Day rail looks clickable and is not. Two orange primaries invite the wrong click. Print caveat is the real guardrail. |
| 6 | Recognition Rather Than Recall | 3 | Offer is on-page. Nav only lists Product and How it works — Outputs, Presets, Trust must be found by scrolling. |
| 7 | Flexibility and Efficiency | n/a | Persuade landing; no expert path to score. |
| 8 | Aesthetic and Minimalist Design | 3 | Warm, token-true. After the hero, every section is the same rounded-card recipe; the 1440px hero right half is unused. |
| 9 | Error Recovery | n/a | No form, error, or recovery UI on this route. |
| 10 | Help and Documentation | n/a | Persuade surface; `#how-it-works` is the explanation, not a help system. |
| **Total** | | **18/28** | **Acceptable (64%)** |

n/a: 7, 9, 10.

## Design Specificity Verdict

**Partially authored. Structurally interchangeable.**

**LLM assessment:** Warm paper, abstract orange mark, tagline, and fictional editor mock are Auri. The skeleton is category-default: left-aligned hero with empty aurora on the right; three identical step cards; two identical feature cards; a disclaimer trust block; tagline repeated as the closing H2. The product *is* official paper (CSC Form 48 and a Word accomplishment layout) and that paper never appears. The one specific artifact — `MarketingEditorMock` — sits below the fold.

**Deterministic scan:** CLI `detect.mjs` on marketing markup exited **0** with **0 findings**. In-page detector (computed styles) reported **13 findings / 11 visible overlays**: `low-contrast` ×5, `all-caps-body` ×1, `overused-font` ×1, `nested-cards` ×6. False positives: Geist (documented in `docs/DESIGN.md`), uppercase eyebrow (short kicker, not body), nested cards inside the fictional editor mock. Real miss the LLM review did not catch: white on `#ea580c` at **3.6:1** on primary CTAs (header Get started, Create your report, selected day, closing CTA) — below WCAG 2.2 AA 4.5:1. Eyebrow `#c2410c` on `#fee9da` at **4.4:1** is 0.1 below AA.

**Visual overlays:** Injection succeeded in a headless Playwright `[Human]` context (`detect.js` from live-server :8400). Overlay is **not** currently open in a user-facing tab (helper was stopped after capture). Captures: `%TEMP%\auri-critique-b\overlay-desktop-1440.png` and `overlay-mobile-390.png`.

## Overall Impression

The landing is warm, honest, and on-brand — and still reads like a calm SaaS template. The first viewport is slogan + aurora with two competing orange buttons; the thing that proves Auri (the daily editor, half-month, AM/PM, save chip) is one scroll down. Biggest opportunity: put the product in the first screen and make one verb for sign-up, with contrast that actually meets AA.

## What's Working

1. **Brand discipline.** Abstract `AuriMark`; mock copy is fictional; no employee, municipality, or signatory leak on the public page.
2. **Editor mock.** Half-month, tabular times, selected **Tue 4**, 07:00–18:00 compressed day — the only composition that could not be another tool.
3. **Honest product frame.** Fills office templates; files stay editable; no signed / submitted / government-approved claim.

## Priority Issues

**[P1] Three names for one action**
- **What:** Header **Get started**, hero/close **Create your report**, footer **Create account**.
- **Why it matters:** First-timers treat labels literally; three strings for `/sign-up` looks untrustworthy.
- **Fix:** One primary verb everywhere — **Create your report**. Keep **Sign in**.
- **Suggested command:** `$impeccable clarify`

**[P1] Hero is empty; the product lives below the fold**
- **What:** At ~1440px the first viewport is left copy + unused aurora. `MarketingEditorMock` is in `#product`. On 390px the day rail is `hidden md:grid`.
- **Why it matters:** Persuade is won in the first screen. Rodge needs to recognize a DTR day, not a slogan.
- **Fix:** Put a cropped editor or anonymous paper frame in the hero; keep a day cue on mobile.
- **Suggested command:** `$impeccable layout`

**[P1] Primary CTAs fail WCAG contrast**
- **What:** Detector measured white on `#ea580c` at **3.6:1** on Get started, Create your report, selected-day chip, and the closing CTA. Product target is WCAG 2.2 AA (4.5:1).
- **Why it matters:** The only actions that convert fail the accessibility bar the product already committed to.
- **Fix:** Darken orange-600 button text pairing (ink on orange-300, or white on orange-700) until AA; re-check the selected-day chip.
- **Suggested command:** `$impeccable colorize`

**[P2] Trust is a disclaimer valley before the close**
- **What:** `#trust` is two muted paragraphs; “they are not a claim of pixel-perfect print output” is the last idea before `#get-started`.
- **Why it matters:** High-stakes moment (official files, privacy) should reassure, then qualify.
- **Fix:** Lead with “your Office templates, private to your account”; preview-vs-print as one secondary line.
- **Suggested command:** `$impeccable clarify`

**[P2] Mobile chrome fights the thumb**
- **What:** **Get started** is `size="sm"` (~36px vs 44px) in the top-right. Open `#marketing-mobile-nav` lists Product / How it works / Sign in while two orange CTAs already compete. First Tab on 390px landed on Create your report, not Skip to content.
- **Why it matters:** Distracted phone use during a break.
- **Fix:** 44px primary; one orange CTA in the header; include Create your report in the drawer; confirm skip-link on small viewports.
- **Suggested command:** `$impeccable adapt`

## Persona Red Flags

**Jordan (First-Timer):** Hero body uses **DTR** with no expansion. Nav **Product** does not match H2 **A calm place to record the day**. Close asks to start with profile and schedule without saying why. **Get started** vs **Create your report** — which is the first step?

**Riley (Stress Tester):** **Mon 3 / Tue 4 / Wed 5** look like controls and are not. **Saved · 14:02** is decorative. Trust promises templates, then warns previews are not print-accurate. Three CTA strings to sign-up.

**Casey (Distracted Mobile):** Two orange buttons in the first screen. Get started 36px tall, top of screen. Drawer omits Create your report. Mock drops the day list. Skip link not observed on first Tab at 390px.

**Rodge (COS, compressed week):** The mock’s 07:00–18:00 day is recognizable, but the hero never says half-month, five minutes, or “fills the forms you already print.” CSC Form No. 48 is a footnote in Outputs. Presets / Copy previous workday are the real time-savers and look like leftover tiles. Close repeats the tagline instead of “both files, current half-month, then print.”

## Cognitive Load

3 checklist failures (single focus, visual hierarchy, working memory) → **moderate**. No decision point exceeds 4 visible options.

## Emotional Journey

Calm open with unused right side. Peak at the editor mock. Valley through identical card grids. Lift at “One input. Two files.” Deep valley at `#trust` (print disclaimer) immediately before commit. Close replays the tagline instead of the five-minute success metric. Peak-end fails.

## Minor Observations

- Closing H2 duplicates the hero H1.
- Sticky header + two-link nav under-represents a six-section page.
- `#how-it-works` heading has arrows; the cards do not connect.
- Mid-page `#how-it-works` / `#presets` / `#outputs` share one rounded-card recipe; Outputs never shows paper.
- Reduced-motion: copy visible, transforms none — content does not depend on GSAP.
- Detector `all-caps-body` on the 35-character eyebrow is a false positive for a kicker.

## Questions to Consider

- If the editor mock is the only specific object, why is it not the hero?
- Would Rodge bet five minutes of a compressed Thursday on a page that never shows the two files?
- If legal honesty matters, why is the last beat before the CTA a print disclaimer?
- How many orange buttons does a calm product need in one viewport?
- What would this page look like if it were designed around CSC Form 48 paper, not a three-step SaaS skeleton?
