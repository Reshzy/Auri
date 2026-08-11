/** Format aggregated worked minutes for DTR-style labels. */

export function formatTotalHoursLabel(totalWorkedMinutes: number): string {
  if (!Number.isFinite(totalWorkedMinutes) || totalWorkedMinutes < 0) {
    throw new Error("totalWorkedMinutes must be a non-negative number");
  }
  const whole = Math.floor(totalWorkedMinutes);
  const hours = Math.floor(whole / 60);
  const minutes = whole % 60;
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
