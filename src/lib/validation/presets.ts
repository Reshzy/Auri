import { z } from "zod";
import { normalizeShortcut } from "@/lib/presets/normalize";

const optionalNullableText = (max: number, fieldLabel: string) =>
  z
    .string()
    .trim()
    .max(max, `${fieldLabel} must be ${max} characters or fewer.`)
    .nullable()
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === "") return null;
      return value;
    });

/**
 * Shared server-safe preset payload. Ownership and usage fields are never accepted.
 */
export const presetSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Label is required.")
      .max(80, "Label must be 80 characters or fewer."),
    content: z
      .string()
      .trim()
      .min(1, "Accomplishment content is required.")
      .max(500, "Each accomplishment must be 500 characters or fewer."),
    category: optionalNullableText(60, "Category"),
    shortcut: z
      .string()
      .trim()
      .max(16, "Shortcut must be 16 characters or fewer.")
      .nullable()
      .optional()
      .transform((value) => normalizeShortcut(value ?? null)),
  })
  .strict();

export type PresetInput = z.infer<typeof presetSchema>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const applyPresetsSchema = z.object({
  reportId: z.string().regex(UUID_RE, "Invalid report id."),
  entryId: z.string().regex(UUID_RE, "Invalid entry id."),
  presetIds: z
    .array(z.string().regex(UUID_RE, "Invalid preset id."))
    .min(1, "Select at least one preset.")
    .max(40, "Too many presets selected."),
  revision: z.number().int().optional(),
});

export type ApplyPresetsInput = z.infer<typeof applyPresetsSchema>;

export const SHORTCUT_CONFLICT_MESSAGE = "That shortcut is already in use.";
