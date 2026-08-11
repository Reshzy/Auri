export type SearchablePreset = {
  label: string;
  content: string;
  category: string | null;
  shortcut: string | null;
};

export function filterPresets<T extends SearchablePreset>(rows: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [row.label, row.content, row.category ?? "", row.shortcut ?? ""]
      .join("\n")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Returns the first preset whose shortcut exactly matches the query (case-insensitive). */
export function findExactShortcutMatch<T extends SearchablePreset>(
  rows: T[],
  query: string,
): T | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return rows.find((row) => (row.shortcut ?? "").toLowerCase() === q) ?? null;
}
