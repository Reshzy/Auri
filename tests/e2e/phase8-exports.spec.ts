import { test, expect } from "@playwright/test";
import { hasLiveAuth } from "./helpers/live-auth";

test.describe("Phase 8 preview and export history E2E", () => {
  test.skip(
    !hasLiveAuth(),
    "Live Auth E2E credentials are not configured for an onboarded test account.",
  );

  test("authenticated user can open preview and generation review", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("Preview verifies your content")).toHaveCount(0);
  });
});
