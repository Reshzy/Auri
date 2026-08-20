import { expect, test } from "@playwright/test";

test.describe("Phase 9 marketing landing", () => {
  test("shows approved copy, product evidence, and CTA targets in the initial HTML", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Work, without the paperwork." }),
    ).toBeVisible();
    await expect(page.getByText("Daily Time Record (DTR)")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create your report" }).first(),
    ).toHaveAttribute("href", "/sign-up");
    await expect(page.getByRole("link", { name: "See how it works" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Get started" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);

    await expect(page.locator("#product")).toBeVisible();
    await expect(page.locator("#outputs")).toBeVisible();
    await expect(page.locator("#trust")).toBeVisible();
    await expect(page.locator("#get-started")).toBeVisible();

    await expect(page.getByText("CSC Form No. 48")).toBeVisible();
    await expect(page.getByText("Accomplishment report", { exact: true })).toBeVisible();
    await expect(page.getByText("Daily Time Record", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "This half-month’s Daily Time Record and accomplishment report, from the days you already logged.",
      }),
    ).toBeVisible();
  });

  test("keeps hero copy visible when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Work, without the paperwork." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create your report" }).first(),
    ).toBeVisible();
  });

  test("opens mobile marketing navigation from the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).press("Enter");
    await expect(
      page.getByRole("navigation", { name: "Marketing mobile" }),
    ).toBeVisible();
    const mobileNav = page.getByRole("navigation", { name: "Marketing mobile" });
    await expect(mobileNav.getByRole("link", { name: "Product" })).toBeVisible();
    await expect(
      mobileNav.getByRole("link", { name: "Create your report" }),
    ).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "How it works" })).toHaveCount(0);
  });

  test("renders a branded 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
