import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const hasAuth =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
  Boolean(process.env.E2E_USER_EMAIL) &&
  Boolean(process.env.E2E_USER_PASSWORD);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "public",
      testMatch: /(?:phase9-|public-).+\.spec\.ts/,
      use: {
        browserName: "chromium",
        trace: "on-first-retry",
      },
    },
    {
      name: "authenticated",
      testMatch: /(?:phase[4-8]-|authenticated-).+\.spec\.ts/,
      use: {
        browserName: "chromium",
        trace: "off",
      },
    },
  ],
  metadata: {
    authConfigured: hasAuth,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm exec next dev --port 3000",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
