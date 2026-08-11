export type OrderablePreset = {
  label: string;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

/**
 * Default active-list ordering:
 * highest use_count → most recent last_used_at → alphabetical label → created_at.
 */
export function orderPresets<T extends OrderablePreset>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.useCount !== a.useCount) return b.useCount - a.useCount;
    const aLast = a.lastUsedAt ?? "";
    const bLast = b.lastUsedAt ?? "";
    if (aLast !== bLast) return bLast.localeCompare(aLast);
    const labelCmp = a.label.localeCompare(b.label, "en", { sensitivity: "base" });
    if (labelCmp !== 0) return labelCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
