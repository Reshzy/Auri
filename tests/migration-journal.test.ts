import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Drizzle migration journal", () => {
  it("includes 0003_mighty_chamber in order after the core schema", () => {
    const journal = JSON.parse(
      readFileSync(path.resolve(__dirname, "../drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ idx: number; tag: string }> };
    const tags = journal.entries.map((entry) => entry.tag);
    expect(tags[0]).toBe("0000_core_schema");
    expect(tags).toContain("0003_mighty_chamber");
    expect(tags.indexOf("0003_mighty_chamber")).toBe(tags.length - 1);
  });
});
