import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";

const CORE_TABLES = [
  "profiles",
  "workSchedules",
  "signatories",
  "accomplishmentPresets",
  "reportPeriods",
  "dailyEntries",
  "templateVersions",
  "reportExports",
] as const;

describe("Drizzle schema", () => {
  it("exports all eight core tables", () => {
    for (const key of CORE_TABLES) {
      expect(schema[key]).toBeTruthy();
    }
  });

  it("keeps profiles.id as a portable uuid primary key", () => {
    expect(schema.profiles.id.name).toBe("id");
    expect(schema.profiles.clerkUserId.name).toBe("clerk_user_id");
    expect(schema.profiles.employeeName.name).toBe("employee_name");
    expect(schema.profiles.timezone.name).toBe("timezone");
  });

  it("scopes ownership columns on user-owned tables", () => {
    expect(schema.workSchedules.userId.name).toBe("user_id");
    expect(schema.reportPeriods.userId.name).toBe("user_id");
    expect(schema.dailyEntries.userId.name).toBe("user_id");
    expect(schema.reportExports.userId.name).toBe("user_id");
  });
});

describe("Drizzle migrations", () => {
  const drizzleDir = path.resolve(__dirname, "../drizzle");
  const sql = readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(drizzleDir, name), "utf8"))
    .join("\n");

  it("creates all core tables in generated SQL", () => {
    for (const table of [
      "profiles",
      "work_schedules",
      "signatories",
      "accomplishment_presets",
      "report_periods",
      "daily_entries",
      "template_versions",
      "report_exports",
    ]) {
      expect(sql.toLowerCase()).toContain(`create table "${table}"`);
    }
  });

  it("includes report status checks and updated_at maintenance", () => {
    expect(sql).toContain("report_periods_status_check");
    expect(sql).toContain("set_updated_at");
    expect(sql).toContain("profiles_active_schedule_id_fkey");
  });

  it("adds snapshots_refreshed_at for draft snapshot refresh audit", () => {
    expect(sql).toContain("snapshots_refreshed_at");
    expect(schema.reportPeriods.snapshotsRefreshedAt.name).toBe("snapshots_refreshed_at");
  });

  it("adds ZIP bundle_manifest and nullable template_version_id", () => {
    expect(sql).toContain("bundle_manifest");
    expect(sql).toContain("report_exports_template_provenance_check");
    expect(schema.reportExports.bundleManifest.name).toBe("bundle_manifest");
  });

  it("adds clerk_user_id for Clerk identity mapping", () => {
    expect(sql).toContain("clerk_user_id");
  });
});
