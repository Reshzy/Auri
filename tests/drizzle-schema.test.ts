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
});
