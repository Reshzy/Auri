# Accessibility

Target: WCAG 2.2 AA.

## Required behaviors

- Visible focus rings (`:focus-visible` uses `--auri-orange-600`)
- Full keyboard support for navigation, dialogs, onboarding steps, and the daily editor
- Semantic headings and landmarks (header, main, footer, labeled nav)
- Labels on every control
- Error summaries linked to invalid fields in the editor/validation panel
- Status is never color-only (text labels for saved/failed/current/outdated)
- 44px-friendly touch targets on marketing mobile nav, app bottom nav, and onboarding chips
- `prefers-reduced-motion`: show content immediately; disable transforms, parallax, and looping aurora
- Screen-reader announcements for save (`aria-live`) and generation status
- Dialogs: Radix focus trap, title, description, explicit confirm/cancel

## Content that must not hide

Critical landing copy, CTAs, onboarding forms, and editor fields exist in the initial layout. Animation failure must not hide them.

## Contrast

Ink on paper and orange-600 on white are the primary combinations. Muted ink is for secondary copy only. Danger/warning/success text sits on tinted surfaces.

## Private data

Do not put employee names, report contents, or fixture data in Open Graph images, analytics, or the public landing mock.
