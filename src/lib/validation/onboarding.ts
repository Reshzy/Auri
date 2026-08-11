import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const weekdayKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdayKey = (typeof weekdayKeys)[number];

const optionalTime = z
  .string()
  .trim()
  .nullable()
  .refine((value) => value === null || value === "" || TIME_RE.test(value), {
    message: "Use 24-hour HH:MM time.",
  })
  .transform((value) => (value === "" ? null : value));

export const weekdayRuleSchema = z
  .object({
    isWorkday: z.boolean(),
    amStart: optionalTime,
    amEnd: optionalTime,
    pmStart: optionalTime,
    pmEnd: optionalTime,
    offDayLabel: z
      .string()
      .trim()
      .nullable()
      .transform((value) => (value === "" ? null : value)),
  })
  .superRefine((rule, ctx) => {
    if (rule.isWorkday) {
      for (const key of ["amStart", "amEnd", "pmStart", "pmEnd"] as const) {
        if (!rule[key]) {
          ctx.addIssue({
            code: "custom",
            message: "Workdays require AM and PM start/end times.",
            path: [key],
          });
        }
      }
    } else if (!rule.offDayLabel) {
      ctx.addIssue({
        code: "custom",
        message: "Off days require a label.",
        path: ["offDayLabel"],
      });
    }
  });

export const weekdayRulesSchema = z.object({
  monday: weekdayRuleSchema,
  tuesday: weekdayRuleSchema,
  wednesday: weekdayRuleSchema,
  thursday: weekdayRuleSchema,
  friday: weekdayRuleSchema,
  saturday: weekdayRuleSchema,
  sunday: weekdayRuleSchema,
});

export const profileSchema = z.object({
  employeeName: z.string().trim().min(1, "Employee name is required."),
  employeeTitle: z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  organizationName: z.string().trim().min(1, "Municipality / organization is required."),
  officeName: z.string().trim().min(1, "Office is required."),
  departmentName: z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  timezone: z.string().trim().min(1, "Timezone is required.").default("Asia/Manila"),
  locale: z.string().trim().min(1, "Locale is required.").default("en-PH"),
});

export const workScheduleSchema = z.object({
  name: z.string().trim().min(1, "Schedule name is required."),
  weekdayRules: weekdayRulesSchema,
  scheduleId: z.string().uuid().optional().nullable(),
});

export const signatorySchema = z.object({
  slot: z.number().int().min(0).max(3),
  displayName: z.string().trim().min(1, "Signatory name is required."),
  title: z.string().trim().min(1, "Signatory title is required."),
  isActive: z.boolean().default(true),
  effectiveFrom: z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  effectiveTo: z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
});

export const signatoriesFormSchema = z.object({
  signatories: z
    .array(signatorySchema)
    .length(4, "All four signatory slots are required."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type WeekdayRule = z.infer<typeof weekdayRuleSchema>;
export type WeekdayRules = z.infer<typeof weekdayRulesSchema>;
export type WorkScheduleInput = z.infer<typeof workScheduleSchema>;
export type SignatoryInput = z.infer<typeof signatorySchema>;
export type SignatoriesFormInput = z.infer<typeof signatoriesFormSchema>;
