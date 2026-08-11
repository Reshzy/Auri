import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4", false && "hidden", "text-auri-ink")).toBe(
      "px-4 text-auri-ink",
    );
  });
});
