/** Format aggregated worked minutes for DTR-style labels. */

export type TimeLabelFormatOptions = {
  /** Floor leftover minutes and omit them (`80 HRS 18 MINS` → `80 HRS`). */
  hoursOnly?: boolean;
};

export function formatTotalHoursLabel(
  totalWorkedMinutes: number,
  options?: TimeLabelFormatOptions,
): string {
  if (!Number.isFinite(totalWorkedMinutes) || totalWorkedMinutes < 0) {
    throw new Error("totalWorkedMinutes must be a non-negative number");
  }
  const whole = Math.floor(totalWorkedMinutes);
  const hours = Math.floor(whole / 60);
  const minutes = options?.hoursOnly ? 0 : whole % 60;
  if (hours === 0 && minutes === 0) {
    return "0 HRS";
  }
  if (minutes === 0) {
    return `${hours} HRS`;
  }
  return `${hours} HRS ${minutes} MINS`;
}

export function sumWorkedMinutes(
  entries: ReadonlyArray<{ workedMinutes: number }>,
): number {
  return entries.reduce((sum, entry) => sum + entry.workedMinutes, 0);
}
