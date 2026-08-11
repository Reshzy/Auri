/**
 * Canonical shortcut storage form: trimmed lowercase.
 * Comparison is case-insensitive via this normalization.
 */
export function normalizeShortcut(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Comparison-only normalization for accomplishment duplicate detection.
 * Storage always keeps the original casing and wording.
 */
export function normalizeAccomplishmentForCompare(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
