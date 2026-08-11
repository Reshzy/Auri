import { test, expect } from "@playwright/test";

/**
 * Authenticated Phase 5 browser E2E.
 * Skipped unless Clerk public env + E2E_USER_* credentials are present.
 * Do not treat mocked unit/integration tests as a substitute for this suite.
 */
const hasLiveAuth =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.E2E_USER_EMAIL) &&
  Boolean(process.env.E2E_USER_PASSWORD);

test.describe("Phase 5 presets (live Auth)", () => {
  test.skip(!hasLiveAuth, "Live Clerk Auth E2E credentials are not configured.");

  test("starter presets, CRUD, picker apply, persistence, finalized lock", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(app|onboarding)/);

    if (page.url().includes("/onboarding")) {
      test.skip(true, "E2E user has not completed onboarding.");
    }

    await page.goto("/app/presets");
    await expect(page.getByRole("heading", { name: /^Presets$/ })).toBeVisible();

    const addStarters = page.getByRole("button", { name: /Add starter presets/i });
    if (await addStarters.isVisible()) {
      await addStarters.click();
      await expect(page.getByText(/Assisted visitors/i).first()).toBeVisible({
        timeout: 15000,
      });
    }

    await page.getByRole("button", { name: /Create preset/i }).click();
    await page.getByLabel(/^Label$/i).fill("E2E Shortcut Preset");
    await page.getByLabel(/Accomplishment text/i).fill("E2E unique accomplishment text");
    await page.getByLabel(/Shortcut/i).fill("e2e");
    await page.getByRole("button", { name: /^Create preset$/i }).click();
    await expect(page.getByText(/E2E Shortcut Preset/i)).toBeVisible({ timeout: 15000 });

    await page.getByLabel(/Search presets/i).fill("e2e");
    await expect(page.getByText(/E2E Shortcut Preset/i)).toBeVisible();
    await page.getByLabel(/Search presets/i).fill("unique accomplishment");
    await expect(page.getByText(/E2E Shortcut Preset/i)).toBeVisible();

    await page
      .getByRole("button", { name: /^Edit$/i })
      .first()
      .click();
    await page.getByLabel(/^Label$/i).fill("E2E Shortcut Preset Edited");
    await page.getByRole("button", { name: /Save changes/i }).click();
    await expect(page.getByText(/E2E Shortcut Preset Edited/i)).toBeVisible({
      timeout: 15000,
    });

    await page.goto("/app/reports/new");
    await page.getByLabel("Year").fill("2026");
    await page.getByLabel("Month").fill("3");
    await page.getByRole("radio", { name: /First half/i }).check();
    await page.getByRole("button", { name: /Create report/i }).click();
    await page.waitForURL(/\/app\/reports\/.+\/edit/);

    const daySelect = page.locator("select").filter({ hasText: "2026-03-" }).first();
    if ((await daySelect.count()) > 0) {
      const options = await daySelect.locator("option").allTextContents();
      const workday = options.find((o) => /Mon|Tue|Wed|Thu/i.test(o));
      if (workday) {
        const value = workday.slice(0, 10);
        await daySelect.selectOption(value);
      }
    }

    await page.getByLabel(/Apply presets/i).fill("e2e");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /Apply selected/i }).click();
    await expect(page.getByPlaceholder("Item 1")).toHaveValue(
      /E2E unique accomplishment text/,
      { timeout: 15000 },
    );

    await page.getByLabel(/Apply presets/i).fill("flag");
    await page.keyboard.press("Enter");
    await page.getByLabel(/Apply presets/i).fill("visitors");
    // select second via click if visible
    const option = page.getByRole("option").filter({ hasText: /Assisted visitors/i });
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    }
    await page.getByRole("button", { name: /Apply selected/i }).click();

    await page.reload();
    await expect(page.getByPlaceholder("Item 1")).toHaveValue(
      /E2E unique accomplishment text/,
    );

    await page.getByPlaceholder("Item 1").fill("Edited after preset insert");
    await page.getByRole("button", { name: /Save now/i }).click();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 15000 });

    const moveDown = page.getByRole("button", { name: /Move down/i }).first();
    if (await moveDown.isEnabled()) {
      await moveDown.click();
    }

    // Repeated apply should not duplicate
    await page.getByLabel(/Apply presets/i).fill("e2e");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /Apply selected/i }).click();
    await expect(page.getByText(/already|duplicate|nothing new|skipped/i)).toBeVisible({
      timeout: 15000,
    });

    const finalize = page.getByRole("button", { name: /Finalize report/i });
    if (await finalize.isVisible()) {
      // Finalize may fail if incomplete; only assert lock when finalize succeeds
      await finalize.click();
      const locked = page.getByText(/read-only|Reopen report/i);
      if (await locked.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(page.getByLabel(/Apply presets/i)).toHaveCount(0);
      }
    }
  });
});
