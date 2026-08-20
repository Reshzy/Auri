---
target: the landing page
total_score: 19
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-08-20T13-18-04Z
slug: src-app-marketing-page-tsx
---
# Critique — Auri landing page

**Target:** `src/app/(marketing)/page.tsx` → `src/features/marketing/landing.tsx` (`http://localhost:3000/`)
**Mode:** Persuade

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Mock badge `Saved · 14:02` is the only status; nav never marks the current section; **Create your report** does not say it goes to `/sign-up`. |
| 2 | Match System / Real World | 3 | COS clock language (`AM in`/`PM out`, first half) is right; hero **DTR** is unexplained; **Repeat the work that already happened** is not how anyone talks. |
| 3 | User Control and Freedom | 3 | **Skip to content** works; hash exits exist; no trap. Keyboard then skips the entire middle of the page. |
| 4 | Consistency and Standards | 2 | Same action, three labels: header **Get started**, hero/close **Create your report**, footer **Create account**. |
| 5 | Error Prevention | 2 | **Create your report** promises a report, delivers signup. Mock copy says the next action is always obvious; the mock has no next action. |
| 6 | Recognition Rather Than Recall | 3 | AM/PM chips and output names are labeled; visitor must scroll to learn Outputs/Presets/Trust — nav only **Product** and **How it works**. |
| 7 | Flexibility and Efficiency | n/a | Persuade landing; no expert path to score. |
| 8 | Aesthetic and Minimalist Design | 2 | Warm and quiet, then a treadmill of equal-weight `text-2xl` sections. Hero emptiness is waste, not restraint. Closing repeats the H1. |
| 9 | Error Recovery | 2 | No failure UI. **Your files stay yours** warns “not a claim of pixel-perfect print output” with no picture of what “good” looks like. |
| 10 | Help and Documentation | n/a | Persuade landing; **See how it works** is the explainer, not a help system. |
| **Total** | | **19/32** | **Acceptable (59%)** |

n/a: 7, 10.

## Design Specificity Verdict

**Start here.** Category-interchangeable SaaS landing wearing Auri’s orange. Copy and one mock are product-specific; composition is a stock template (left hero, empty right, 3-step cards, 2 feature cards, limp trust, tagline reprise). Swap the words and this could sell any workspace that exports files.

**LLM assessment:** Auri-specific: abstract orange **A** mark; paper ground + orange aurora; tagline **Work, without the paperwork.**; hero body naming DTR + office templates; `MarketingEditorMock` (`Daily editor`, `First half · current period`, `Saved · 14:02`, AM in/out 07:00–18:00, anonymous bullets); **One input. Two files.** naming DOCX + CSC Form No. 48 XLSX; Presets / Copy previous workday; privacy line in **Your files stay yours**. Generic: leftover 50% of the hero; sticky **Get started**; `rounded-3xl` card grid; **Record → Review → Generate** as unlabeled SaaS stepper; no paper/Form 48 artifact in the first viewport.

**Deterministic scan:** CLI detector exit 0, **0 findings** on `src/features/marketing` and `src/app/(marketing)/page.tsx`. The detector did not catch competing CTAs, empty hero composition, inert mock affordances, or missing official-form evidence — those are IA/persuasion defects, not the mechanical antipatterns it scans for. No false positives (nothing to flag).

**Visual overlays:** No reliable user-visible overlay. Fallback signal: mutation unavailable — agent-browser `eval` threw `SyntaxError: Unexpected token ':'` before `detect.js` could run. Live-server was started on port 8400 and stopped. Console had no `impeccable` messages.

## Overall Impression

The landing is warm, honest, and on-brand — and still reads like a calm SaaS template. The first viewport is slogan + aurora with two competing orange buttons; the thing that proves Auri (the daily editor, half-month, AM/PM, save chip) sits below the fold. The two official files exist only as list items. Biggest opportunity: put the product in the first screen and make one verb for sign-up.

## What's Working

- **Work, without the paperwork.** on paper-orange with the abstract **A** mark. Voice and binding color hold. No document-clipart.
- **MarketingEditorMock** is the only authored object: `First half · current period`, `Saved · 14:02`, 07:00/12:00/13:00/18:00, anonymous office bullets. Matches product truth without leaking workplace identity.
- **Skip to content** is real (first Tab, visible orange pill). `:focus-visible` orange ring; `prefers-reduced-motion` exists; mock copy stays fictional.

## Priority Issues

**[P1] Hero is a slogan with a vacant lot**
- **What:** First viewport at 1440 is left-aligned type + two buttons. Right half is cream blur. `MarketingEditorMock` lives in `#product`, below the fold. At 390 the aurora burns a tall empty band before the H1.
- **Why it matters:** Persuade is won or lost here. A COS employee cannot see the daily editor or the two files. Sticky **Get started** outranks the real product.
- **Fix:** Put the mock (or mock + two output sheets) in the hero at desktop. Cut hero min-height so mobile hits headline + **Create your report** without scrolling through glow.
- **Suggested command:** `$impeccable layout`

**[P1] Three names for one signup**
- **What:** Header **Get started** (`SignUpButton`, `size="sm"`, orange, sticky) vs hero/close **Create your report** (`/sign-up`) vs footer **Create account**. **See how it works** jumps to `#how-it-works` and skips `#product`.
- **Why it matters:** Spec primary CTA is **Create your report**. The louder chrome control is **Get started**. A first-timer cannot tell which is the action.
- **Fix:** One signup label everywhere: **Create your report**. Header: ghost **Sign in** + that primary. Footer: drop **Create account** or match the label. Point **See how it works** at `#product`.
- **Suggested command:** `$impeccable clarify`

**[P1] The two files are copy, not evidence**
- **What:** **One input. Two files.** is a heading + two `<li>`s (Accomplishment report DOCX / Daily Time Record XLSX — CSC Form No. 48). No paper, no sheet, no pair appearing from one day.
- **Why it matters:** This is the product. Neighboring tools cannot copy “fill the office’s templates.” The page never shows that. The trust section then undercuts with a print caveat and no picture of “good.”
- **Fix:** One composed artifact: day on the left, Form 48 + Word report on the right (abstract/official, no employee names). Repeat a thumbnail in the close. Keep the print honesty as a caption on that picture, not a gray paragraph.
- **Suggested command:** `$impeccable bolder`

**[P2] Section treadmill after the mock**
- **What:** `#how-it-works`, `#outputs`, `#presets`, `#trust`, `#get-started` share `text-2xl` headings, `py-16`, `rounded-3xl` cards. Close H2 repeats the H1.
- **Why it matters:** After **A calm place to record the day**, nothing new peaks. Presets/copy-previous are real advantages that look like leftover feature tiles.
- **Fix:** Collapse how-it-works into the hero/mock. Make outputs the second peak (visual). Merge presets into the mock as chrome on the card. Replace the close H2 with a period-specific line, not the tagline again.
- **Suggested command:** `$impeccable distill`

**[P2] First-viewport jargon + missing COS period frame**
- **What:** Hero: “Auri prepares your **DTR** and accomplishment report.” Eyebrow: **YOUR REPORTING ROUTINE, SIMPLIFIED.** Mock: **First half · current period**. CSC Form No. 48 appears only later. Compressed week is never said.
- **Why it matters:** A first-timer stalls on DTR. The actual user does not see “this half-month, both files, from days you already logged.”
- **Fix:** First mention **Daily Time Record (DTR)**. Eyebrow or subhead: half-month period → Word + Excel your office already uses. Keep workplace names out.
- **Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Jordan (First-Timer):** Two orange actions (**Get started** vs **Create your report**). Hero **DTR** with no expansion. **Create your report** goes to `/sign-up`, not a report. Empty hero: product is not visible in 5 seconds. **See how it works** skips the mock.

**Riley (Stress Tester):** Mock looks like UI, is inert (no Generate/Save) while copy says “the next action is always obvious.” Fake status `Saved · 14:02`. Trust copy contradicts the polished mock. Desktop day rail vs mobile (`hidden md:grid`) — two product stories. Keyboard: skip-link → header → hero → jump to closing CTA; entire middle is a dead zone.

**Casey (Distracted Mobile):** **Get started** + hamburger in the top-right; **Sign in** hidden until **Open menu**. Primary hero CTA is mid-screen, not thumb zone; no sticky bottom **Create your report**. First screen is glow + H1; mock is a short form fragment with no day list. Footer packs four destinations.

**Rodge (COS employee, this period’s two files):** Mock times match 07:00–18:00, but the page never says compressed week or “this period’s DTR + AR.” Both files are a list, not a pair he can recognize from print day. Close: “Start with your profile and schedule” — he came to finish this half-month, not onboard. Correctly no Municipality leak — also no “for COS employees filing CSC Form 48.”

## Cognitive Load

Failed: single focus, visual hierarchy, one thing at a time, minimal choices. Passed: chunking, grouping, working memory, progressive disclosure.

**4 failures = high.**

First viewport exceeds four visible options: **Product**, **How it works**, **Sign in**, **Get started**, **Create your report**, **See how it works** (plus logo).

## Emotional Journey

Peak in the first three seconds: aurora, tagline, orange **Create your report**. Immediate valley: blank right half. Mini-peak below the fold: mock + save chip. Then a flatline of equal-weight sections. Trust valley: print disclaimer plants doubt without showing the files. End repeats the H1 plus setup tax. Peak-end fails: the memorable line is at the open; the close does not show both files in hand.

## Minor Observations

- `docs/DESIGN.md` still describes a rounded orange tile + paper orb; `auri-mark.tsx` uses `/logo.png` + wordmark **Auri**.
- Mock day rail: selected **Tue 4** optically lines up with Accomplishments, not the time chips.
- Sticky `size="sm"` **Get started** is visually louder than hero `size="lg"` **Create your report**.
- `#presets` heading **Repeat the work that already happened** is a riddle; the cards are clear.
- `#trust` restates `#outputs` then adds the print caveat — redundant, then anxious.
- Logo `alt="Auri logo"` plus adjacent wordmark **Auri** is announced twice.
- Keyboard dead zone from hero through all middle sections to the closing CTA.

## Questions to Consider

- If the first viewport does not contain the daily editor and the two official sheets, what exactly is Auri selling in the first five seconds?
- Why does the chrome shout **Get started** when the product promise is **Create your report**?
- Would a COS employee trust a picture of CSC Form 48 (anonymous) more than another trio of rounded cards titled Record / Review / Generate?
- What if the close was “This half-month’s DTR and accomplishment report, from the days you already lived” instead of repeating the tagline?
