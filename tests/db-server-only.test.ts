import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("server-only database boundary", () => {
  it("marks db entrypoints as server-only", () => {
    for (const relative of [
      "src/db/index.ts",
      "src/db/dal/auth-user.ts",
      "src/db/dal/profiles.ts",
      "src/db/dal/get-app-user.ts",
      "src/db/dal/schedules.ts",
      "src/db/dal/signatories.ts",
      "src/db/dal/templates.ts",
      "src/db/dal/snapshots.ts",
      "src/db/dal/onboarding-state.ts",
      "src/db/dal/reports.ts",
      "src/db/dal/daily-entries.ts",
      "src/server/services/report-period-service.ts",
      "src/server/services/daily-entry-service.ts",
      "src/db/dal/exports.ts",
      "src/server/services/export-orchestration-service.ts",
      "src/server/services/export-download-service.ts",
      "src/server/services/export-persistence-service.ts",
      "src/server/services/docx-export-service.ts",
      "src/server/services/xlsx-export-service.ts",
      "src/server/services/zip-export-service.ts",
      "src/server/storage/generated-reports-storage.ts",
    ]) {
      const source = readFileSync(path.resolve(__dirname, "..", relative), "utf8");
      expect(source).toMatch(/import ["']server-only["']/);
    }
  });

  it("keeps Clerk auth-user free of client-supplied ownership", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../src/db/dal/auth-user.ts"),
      "utf8",
    );
    expect(source).toMatch(/@clerk\/nextjs\/server/);
    expect(source).not.toMatch(/supabase/i);
  });
});
