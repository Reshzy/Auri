/**
 * Exact accomplishment content from AURI_CURSOR_MASTER_SPEC §16 Phase 5.
 * Labels are short UI helpers; content must not be altered.
 */
export const STARTER_PRESETS = [
  {
    label: "Assisted visitors",
    content: "Assisted visitors at the Office of the Vice Mayor",
  },
  {
    label: "Assisted Vice Mayor",
    content: "Assisted the Vice Mayor in activities and programs",
  },
  {
    label: "Official documents",
    content: "Prepared, formatted, and printed official documents",
  },
  {
    label: "Photos and digital",
    content: "Edited photos and digital content for publications and presentations",
  },
  {
    label: "Flag ceremony",
    content: "Attended the flag ceremony",
  },
] as const;

export type StarterPreset = (typeof STARTER_PRESETS)[number];
