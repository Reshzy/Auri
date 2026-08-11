import { z } from "zod";

export const periodKindSchema = z.enum(["FIRST_HALF", "SECOND_HALF", "CUSTOM"]);

export const reportPeriodCreateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  periodKind: z.enum(["FIRST_HALF", "SECOND_HALF"]),
});

export type ReportPeriodCreateInput = z.infer<typeof reportPeriodCreateSchema>;

export const dayClassificationSchema = z.enum([
  "workday",
  "scheduled_off",
  "holiday",
  "leave",
  "absent",
  "custom",
]);

const optionalTimeInput = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => (value === undefined || value === "" ? null : value));

export const dailyEntryUpdateSchema = z.object({
  classification: dayClassificationSchema,
  classificationLabel: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value)),
  amArrival: optionalTimeInput,
  amDeparture: optionalTimeInput,
  pmArrival: optionalTimeInput,
  pmDeparture: optionalTimeInput,
  undertimeOverrideMinutes: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? null : value)),
  accomplishments: z
    .array(z.string())
    .max(40)
    .transform((items) =>
      items.map((item) => item.trim()).filter((item) => item.length > 0),
    )
    .refine((items) => items.every((item) => item.length <= 500), {
      message: "Each accomplishment must be 500 characters or fewer.",
    }),
  remarks: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value)),
  /** When true, copy previous workday may include undertime override. */
  includeUndertimeOverride: z.boolean().optional(),
});

export type DailyEntryUpdateInput = z.infer<typeof dailyEntryUpdateSchema>;

export const copyPreviousWorkdaySchema = z.object({
  includeUndertimeOverride: z.boolean().default(false),
});
