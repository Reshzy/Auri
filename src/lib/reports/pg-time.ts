/** Normalize PostgreSQL time values (`HH:MM:SS` / `HH:MM:SS.sss`) to `HH:MM`. */
export function pgTimeToHhmm(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return value.slice(0, 5);
  }
  return `${match[1]}:${match[2]}`;
}
