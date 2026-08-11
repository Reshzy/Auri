import type { WeekdayRules } from "@/lib/validation/onboarding";

/** Editable sample defaults from the master specification (§7.2–7.4). Not hard-coded constants. */
export const SAMPLE_PROFILE_DEFAULTS = {
  employeeName: "Rodge Andru P. Viloria",
  employeeTitle: "COS Employee",
  organizationName: "Municipality of Sanchez Mira",
  officeName: "Vice Mayor’s Office",
  departmentName: "",
  timezone: "Asia/Manila",
  locale: "en-PH",
} as const;

export const SAMPLE_SIGNATORY_DEFAULTS = [
  {
    slot: 0,
    displayName: "Rodge Andru P. Viloria",
    title: "Signature of COS Employee",
  },
  {
    slot: 1,
    displayName: "Joel A. Puzon",
    title: "Secretary of the Sangguniang Bayan",
  },
  {
    slot: 2,
    displayName: "Lani P. Langaman",
    title: "HRMO I",
  },
  {
    slot: 3,
    displayName: "Connie Marie O. Sacramed",
    title: "Vice Mayor",
  },
] as const;

function workday(amStart: string, amEnd: string, pmStart: string, pmEnd: string) {
  return {
    isWorkday: true as const,
    amStart,
    amEnd,
    pmStart,
    pmEnd,
    offDayLabel: null,
  };
}

function offDay(label: string) {
  return {
    isWorkday: false as const,
    amStart: null,
    amEnd: null,
    pmStart: null,
    pmEnd: null,
    offDayLabel: label,
  };
}

/** Compressed four-day week (Mon–Thu work; Fri–Sun off). */
export function createCompressedWeekdayRules(): WeekdayRules {
  return {
    monday: workday("07:00", "12:00", "13:00", "18:00"),
    tuesday: workday("07:00", "12:00", "13:00", "18:00"),
    wednesday: workday("07:00", "12:00", "13:00", "18:00"),
    thursday: workday("07:00", "12:00", "13:00", "18:00"),
    friday: offDay("FRIDAY"),
    saturday: offDay("SATURDAY"),
    sunday: offDay("SUNDAY"),
  };
}

/** Standard five-day week (Mon–Fri 08:00–12:00 / 13:00–17:00). */
export function createStandardWeekdayRules(): WeekdayRules {
  return {
    monday: workday("08:00", "12:00", "13:00", "17:00"),
    tuesday: workday("08:00", "12:00", "13:00", "17:00"),
    wednesday: workday("08:00", "12:00", "13:00", "17:00"),
    thursday: workday("08:00", "12:00", "13:00", "17:00"),
    friday: workday("08:00", "12:00", "13:00", "17:00"),
    saturday: offDay("SATURDAY"),
    sunday: offDay("SUNDAY"),
  };
}

export const COMPRESSED_SCHEDULE_NAME = "Compressed four-day week";
export const STANDARD_SCHEDULE_NAME = "Standard five-day week";
