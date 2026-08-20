import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkipToContent } from "./skip-to-content";

describe("SkipToContent", () => {
  it("targets the main landmark", () => {
    const html = renderToStaticMarkup(<SkipToContent />);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain("Skip to content");
  });
});
