import { expect, test } from "@playwright/test";

test.describe("Public auth pages", () => {
  test("sign-in route is reachable", async ({ page }) => {
    const response = await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    expect(response).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/sign-in|accounts\.|clerk/i);
  });

  test("sign-up route is reachable", async ({ page }) => {
    const response = await page.goto("/sign-up", { waitUntil: "domcontentloaded" });
    expect(response).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/sign-up|accounts\.|clerk/i);
  });

  test("unauthenticated visitors cannot open /app", async ({ page }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/sign-in|login|accounts\.|clerk/i, { timeout: 20_000 });
    expect(page.url()).toMatch(/sign-in|login|accounts\.|clerk/i);
  });
});
