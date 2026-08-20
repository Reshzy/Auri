import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
}));

import { MobileAppNav } from "./mobile-app-nav";

describe("MobileAppNav", () => {
  it("marks the current destination for assistive tech", () => {
    const html = renderToStaticMarkup(<MobileAppNav />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Overview");
  });
});
