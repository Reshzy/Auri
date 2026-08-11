import { describe, expect, it } from "vitest";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";

describe("report ownership enforcement", () => {
  it("rejects mismatched client-supplied owner ids", () => {
    expect(() => assertOwnerMatchesSession("user-a", "user-b")).toThrow(/not allowed/);
  });

  it("allows omitted client owner id", () => {
    expect(() => assertOwnerMatchesSession("user-a", undefined)).not.toThrow();
  });
});
