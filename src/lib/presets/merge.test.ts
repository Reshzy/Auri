import { describe, expect, it } from "vitest";
import {
  dedupeIdsPreserveOrder,
  mergePresetContents,
  removeAccomplishment,
  reorderAccomplishment,
} from "@/lib/presets/merge";

describe("mergePresetContents", () => {
  it("appends in selection order and preserves existing items", () => {
    const result = mergePresetContents({
      existing: ["Manual item"],
      selectedContents: ["First preset", "Second preset"],
    });
    expect(result.next).toEqual(["Manual item", "First preset", "Second preset"]);
    expect(result.appliedIndexes).toEqual([0, 1]);
    expect(result.skippedDuplicateIndexes).toEqual([]);
  });

  it("skips duplicates with whitespace/case normalization", () => {
    const result = mergePresetContents({
      existing: ["Assisted visitors"],
      selectedContents: ["  assisted   VISITORS ", "New item"],
    });
    expect(result.next).toEqual(["Assisted visitors", "New item"]);
    expect(result.appliedIndexes).toEqual([1]);
    expect(result.skippedDuplicateIndexes).toEqual([0]);
  });

  it("skips duplicates within the same selection batch", () => {
    const result = mergePresetContents({
      existing: [],
      selectedContents: ["Same", "same", "Other"],
    });
    expect(result.next).toEqual(["Same", "Other"]);
    expect(result.appliedIndexes).toEqual([0, 2]);
    expect(result.skippedDuplicateIndexes).toEqual([1]);
  });
});

describe("dedupeIdsPreserveOrder", () => {
  it("keeps first occurrence order", () => {
    expect(dedupeIdsPreserveOrder(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});

describe("reorder and remove", () => {
  it("reorders and removes independently of source presets", () => {
    const items = ["A", "B", "C"];
    expect(reorderAccomplishment(items, 0, 2)).toEqual(["B", "C", "A"]);
    expect(removeAccomplishment(items, 1)).toEqual(["A", "C"]);
    expect(items).toEqual(["A", "B", "C"]);
  });
});
