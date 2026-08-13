# Auri design system

Light theme only. Official report previews stay paper-white in every context.

## Brand

Auri should feel warm, capable, calm, and quietly fast. Major brand language is abstract: flow, rhythm, glow, momentum. Do not use literal folders, pens, clocks, or document logos in the mark.

Tagline: **Work, without the paperwork.**

Mark: rounded orange tile with a paper orb and a soft highlight ([`src/components/brand/auri-mark.tsx`](src/components/brand/auri-mark.tsx)).

## Tokens

Defined in [`src/app/globals.css`](src/app/globals.css):

- Orange: 50 / 100 / 300 / 500 / 600 / 700
- Ink `#17130f`, muted `#6f6258`
- Paper `#fffaf5`, surface `#ffffff`, bg (alias of paper), border `#eadfd5`
- Success `#15803d`, warning `#b45309`, danger `#b91c1c`

Use semantic token classes (`bg-auri-surface`, `text-auri-ink`) rather than raw hex in product UI. Preview paper uses `bg-white` on purpose.

## Typography

Geist Sans for UI. Tabular numerals for clocks and totals. Body 14–16px. Sentence-case labels. Marketing headings may be compact; application headings prioritize clarity.

## Components

Restyle Radix/shadcn primitives to Auri: button, input, dialog, tabs, plus `Alert`, `EmptyState`, `Skeleton`, paper preview frame. One primary action per screen. Save, validation, report, and export states must stay visible.

## Motion

See [`docs/PHASE9_MARKETING_MOTION.md`](docs/PHASE9_MARKETING_MOTION.md). Use `@gsap/react` `useGSAP()` only in isolated Client Components. Content must not depend on GSAP to exist.

## Dark mode

Deferred until the light interface is complete and a full semantic dark token set can keep previews paper-white and WCAG 2.2 AA.
