---
target: the landing page
total_score: 18
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-08-20T13-50-50Z
slug: src-app-marketing-page-tsx
---
# Critique — Auri landing page

**Target:** `src/app/(marketing)/page.tsx` → `src/features/marketing/landing.tsx` (`http://localhost:3000/`)
**Mode:** Persuade

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Decorative **Saved · 14:02** only. **Create your report** does not disclose it opens sign-up. |
| 2 | Match System / Real World | 2 | Copy is COS-fluent. The two “files” are generic white cards, not Form 48 or a Word layout. |
| 3 | User Control and Freedom | 3 | **Skip to content** appears on first Tab. **Product** → `/#product` is a self-hash. |
| 4 | Consistency and Standards | 2 | Four **Create your report** controls (header/footer Clerk vs hero/close `/sign-up`). |
| 5 | Error Prevention | 2 | Mock is correctly inert. CTA still implies generating a report, not creating an account. |
| 6 | Recognition Rather Than Recall | 2 | **Presets · Copy previous workday** looks like controls and is not. **DTR** / **CSC Form No. 48** / **First half** assume the ritual. |
| 7 | Flexibility and Efficiency | n/a | Persuade landing; no expert path to score. |
| 8 | Aesthetic and Minimalist Design | 3 | Paper/orange world is calm and owned. Twin filled CTAs and a sentence used as H2 keep it from a 4. |
| 9 | Error Recovery | 2 | No failure copy on this surface. Print-layout caption plants doubt without showing “good.” |
| 10 | Help and Documentation | n/a | Persuade marketing; no docs expected on this surface. |
| **Total** | | **18/32** | **Acceptable (56%)** |

n/a: 7, 10.

## Design Specificity Verdict

**Start here.** Partly authored. Copy and tokens are Auri; the composition is still interchangeable SaaS (hero split + dashboard chrome + closing CTA). Swap the times for any attendance tool and the page still reads.

**LLM assessment:** Auri-specific: tagline, paper ground, orange-700 CTA, half-month / DTR / CSC Form No. 48 language, 07:00–18:00 compressed day, anonymous bullets, no workplace leak. Not Auri: `MarketingEditorMock` as generic daily-editor chrome; `MarketingOutputPair` as two tilted white cards rather than recognizable Form 48 left/right copies and a Word accomplishment page. The product is in the first viewport now — the proof still looks like app UI, not official paper.

**Deterministic scan:** CLI detector exit 0, **0 findings** on `src/features/marketing` and `src/app/(marketing)/page.tsx`. The detector did not catch twin CTAs, generic file cards, or mobile fold. Those are persuasion/IA defects, not mechanical antipatterns. No false positives.

**Visual overlays:** No reliable user-visible overlay. Fallback signal: mutation unavailable — agent-browser `eval` failed on PowerShell quote escaping (`SyntaxError: Invalid or unexpected token`). Live-server started on port 8400 and was stopped. Console had no `impeccable` messages.

## Overall Impression

The first screen finally contains the product. The page is calmer and shorter. It still does not prove the only claim that cannot be copied: Auri fills the office’s official templates. Biggest remaining opportunity: make the two files look like CSC Form 48 and a Word report, and leave one **Create your report** in the first viewport.

## What's Working

- **Work, without the paperwork.** on paper-orange with a single hero verb. Voice and binding color hold.
- Product truth without leaking Rodge: anonymous bullets, compressed 07:00–18:00 day, **XLSX · CSC Form No. 48** / **DOCX · Word layout**, **Left and right copies match.**
- Skip link is first in the tree; first Tab reveals a visible orange pill. Mock is `aria-hidden`; figcaption carries the description.

## Priority Issues

**[P1] Official-form proof is a restyled dashboard**
- **What:** `MarketingOutputPair` is two generic cards. DTR repeats the same four times. AR repeats the same two bullets. Neither resembles CSC Form 48 nor a Word report.
- **Why it matters:** Auri’s only non-copyable claim is filling the office’s official templates. The picture argues the opposite.
- **Fix:** Show recognizable paper-white Form 48 (left/right copies) and a Word-like accomplishment page. Keep them fictional. Stop restyling them as app chrome.
- **Suggested command:** `$impeccable bolder`

**[P1] Twin primary CTAs + a self-nav**
- **What:** First viewport: header **Create your report**, hero **Create your report**, **Product** → `/#product`, **Sign in**. Close and footer add two more identical CTAs.
- **Why it matters:** Persuade needs one decision. This offers the same decision four times and a nav item that goes nowhere.
- **Fix:** One filled **Create your report** in the hero. Header: mark + **Sign in**. Kill **Product** or point it at a real below-fold section. Disclose that the CTA opens sign-up.
- **Suggested command:** `$impeccable distill`

**[P1] Mobile hides the two-file payoff**
- **What:** At 390×844 the first screen is H1, body, CTA, then a clipped editor. **Daily Time Record** / **Accomplishment report** sit below the fold. Header is mark + hamburger; menu items are equal ghost text.
- **Why it matters:** A distracted phone user never sees both files without scrolling. Thumb-zone primary action is missing from the bar.
- **Fix:** Mobile hero: copy + CTA + the output pair. Shrink or defer the editor. Make drawer **Create your report** the filled action.
- **Suggested command:** `$impeccable adapt`

**[P2] Close section is a weaker restatement**
- **What:** Long H2 about days already logged + profile/schedule setup. Sticky header can cover leftover hero CTA when scrolling to `#get-started`. “Days you already logged” is false for a first-timer.
- **Why it matters:** Peak-end fails. The last beat should feel like both files in hand, not a second pitch.
- **Fix:** Short close: both files, this half-month, one generate. Offset sticky overlap.
- **Suggested command:** `$impeccable clarify`

**[P2] Dead labels and domain jargon without teaching**
- **What:** **Presets · Copy previous workday** looks like controls and is not. **First half · current period**, **DTR**, **CSC Form No. 48** are unexplained.
- **Why it matters:** A first-timer must already know the reporting ritual. A stress tester clicks ghosts and learns nothing.
- **Fix:** Either make those lines clearly demo chrome, or replace with one plain sentence: one day fills both official files.
- **Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Jordan (First-Timer):** **Create your report** opens `/sign-up`. **DTR**, **CSC Form No. 48**, **First half · current period** with no gloss. **Product** is the only nav item and is the current view. Close assumes days already logged.

**Riley (Stress Tester):** **Tue 4**, time tiles, **Saved · 14:02** look live; mock is inert. **Product** hash is a no-op. Caption admits print can differ while the picture is not official paper. Same label, two mechanisms (Clerk button vs `/sign-up` link).

**Casey (Distracted Mobile):** Hamburger top-right; no header CTA. Two-file cards below the fold. Editor clipped. Menu rows are equal ghost text. Footer **Create your report** is a text button, not the filled pill.

**Rodge (COS, this period’s two files):** Times 07:00–18:00 match his day. He cannot see that Excel will still be Form 48 and Word will still be the office AR. **Left and right copies match.** is a caption, not a visible dual form. **Generate both files together** is the line he needs, and it sits in the close, not the hero.

## Cognitive Load

Failed: single focus, visual hierarchy, one thing at a time, working memory, progressive disclosure.  
**5 failures = high.** Four first-viewport actions sit on the working-memory limit. Four identical primary CTAs across the page is the real overload.

## Emotional Journey

Peak at arrival (tagline + paper). Proof almost lands, then the print-layout caption plants doubt. The close restates the hero. Peak-end fails: the last beat is a weaker echo, not a period-complete moment.

## Minor Observations

- `logo.png` includes document-like bars; commented-out tile+orb remains in `auri-mark.tsx`.
- Wordmark **Auri** beside an **A** mark is announced twice in the header link (link name vs visible wordmark).
- Output cards use 10–11px type; rotation is almost invisible at 1440.
- Marketing overrides buttons to orange-700; default `Button` is still orange-600.
- Hero body packs DTR + AR + Word + Excel + half-month into one sentence.

## Questions to Consider

- If the hero showed a recognizable CSC Form 48 sheet and a Word accomplishment page, would the daily editor still need to occupy the first viewport?
- Why does a two-section page have a **Product** nav item?
- Should **Create your report** appear before the visitor knows the next screen is sign-up?
