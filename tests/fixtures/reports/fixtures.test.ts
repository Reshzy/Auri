import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FIXTURES = [
  "first-half-standard.json",
  "second-half-31-days.json",
  "long-content.json",
  "xml-special-characters.json",
  "undertime-overrides.json",
] as const;

describe("visual regression fixtures", () => {
  it("keeps the required Office review fixtures", () => {
    for (const fileName of FIXTURES) {
      const parsed = JSON.parse(
        readFileSync(path.resolve(__dirname, fileName), "utf8"),
      ) as { id: string; period: { kind: string } };
      expect(parsed.id).toBeTruthy();
      expect(parsed.period.kind).toMatch(/FIRST_HALF|SECOND_HALF/);
    }
  });
});
