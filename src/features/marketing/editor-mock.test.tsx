import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketingEditorMock } from "./editor-mock";

describe("marketing editor mock", () => {
  it("does not expose onboarding fixture names", () => {
    const html = renderToStaticMarkup(<MarketingEditorMock />);
    expect(html).not.toMatch(/Viloria|Puzon|Langaman|Sacramed|Sanchez Mira/i);
    expect(html).toContain("07:00");
  });
});
