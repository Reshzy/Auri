import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketingOutputPair } from "./output-pair";
import { MarketingProductStage } from "./product-stage";

describe("marketing output pair", () => {
  it("does not expose onboarding fixture names", () => {
    const html = renderToStaticMarkup(<MarketingOutputPair />);
    expect(html).not.toMatch(/Viloria|Puzon|Langaman|Sacramed|Sanchez Mira/i);
    expect(html).toContain("CSC Form No. 48");
    expect(html).toContain("Left copy");
    expect(html).toContain("Right copy");
    expect(html).toContain("07:00");
  });
});

describe("marketing product stage", () => {
  it("keeps print honesty on the files, not as a separate anxiety block", () => {
    const html = renderToStaticMarkup(<MarketingProductStage />);
    expect(html).toContain("Print layout can differ slightly");
    expect(html).not.toMatch(/Viloria|Sanchez Mira/i);
  });
});
