import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { prefersReducedMotion } from "./motion";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false during server render", () => {
    vi.stubGlobal("window", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("reads the reduced-motion media query", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
      }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe("reduced-motion CSS", () => {
  it("does not globally zero transition duration", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(css).not.toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });
});
