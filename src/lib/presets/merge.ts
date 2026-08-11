import { normalizeAccomplishmentForCompare } from "@/lib/presets/normalize";

export type MergePresetResult = {
  next: string[];
  appliedIndexes: number[];
  skippedDuplicateIndexes: number[];
};

/**
 * Append selected preset contents in selection order, skipping duplicates
 * against existing items and earlier selections (comparison-normalized).
 */
export function mergePresetContents(input: {
  existing: string[];
  selectedContents: string[];
}): MergePresetResult {
  const next = [...input.existing];
  const seen = new Set(next.map(normalizeAccomplishmentForCompare));
  const appliedIndexes: number[] = [];
  const skippedDuplicateIndexes: number[] = [];

  input.selectedContents.forEach((content, index) => {
    const trimmed = content.trim();
    if (!trimmed) {
      skippedDuplicateIndexes.push(index);
      return;
    }
    const key = normalizeAccomplishmentForCompare(trimmed);
    if (seen.has(key)) {
      skippedDuplicateIndexes.push(index);
      return;
    }
    seen.add(key);
    next.push(trimmed);
    appliedIndexes.push(index);
  });

  return { next, appliedIndexes, skippedDuplicateIndexes };
}

/** Deduplicate IDs while preserving first-seen order. */
export function dedupeIdsPreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function reorderAccomplishment(
  items: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next;
}

export function removeAccomplishment(items: string[], index: number): string[] {
  return items.filter((_, i) => i !== index);
}
