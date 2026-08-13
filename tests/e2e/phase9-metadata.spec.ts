import { expect, test } from "@playwright/test";

test.describe("Phase 9 metadata and identity", () => {
  test("sets the landing title and description", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Auri — Work, without the paperwork/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute(
      "content",
      /Daily Time Record and accomplishment report/,
    );
  });

  test("serves an Open Graph image without report data", async ({ request }) => {
    test.setTimeout(60_000);
    const response = await request.get("/opengraph-image");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toMatch(/image\//);
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(1000);
    expect(body.toString("utf8")).not.toMatch(/Viloria|Sanchez Mira/i);
  });

  test("serves the web manifest", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const manifest = (await response.json()) as { name?: string; theme_color?: string };
    expect(manifest.name).toBe("Auri");
    expect(manifest.theme_color).toBe("#fffaf5");
  });
});
