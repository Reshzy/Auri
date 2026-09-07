import { describe, expect, it } from "vitest";
import { dicebearAvatarUrl } from "./avatar";

describe("dicebearAvatarUrl", () => {
  it("builds a sprouts SVG URL with seed and animation tag", () => {
    expect(dicebearAvatarUrl("user-123")).toBe(
      "https://api.dicebear.com/10.x/sprouts/svg?seed=user-123&tags=animation",
    );
  });

  it("URL-encodes seeds with reserved characters", () => {
    expect(dicebearAvatarUrl("a b&c")).toBe(
      "https://api.dicebear.com/10.x/sprouts/svg?seed=a+b%26c&tags=animation",
    );
  });
});
