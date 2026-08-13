import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const clerkDir = path.resolve(__dirname, "../supabase/overlays/clerk");

function readClerkSql(): string {
  return readdirSync(clerkDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(clerkDir, name), "utf8"))
    .join("\n");
}

describe("Clerk-safe Supabase overlays", () => {
  const sql = readClerkSql();

  it("enables RLS and revokes Data API roles without auth.uid() policies", () => {
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
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
    }
    expect(sql).toMatch(/revoke all on table public\.profiles from anon, authenticated/i);
    expect(sql).not.toMatch(/create policy[\s\S]{0,120}auth\.uid\(\)/i);
  });

  it("keeps both storage buckets private", () => {
    expect(sql).toMatch(/'templates'/);
    expect(sql).toMatch(/'generated-reports'/);
    expect(sql).toMatch(/public = false/);
  });

  it("can drop stale auth.uid() policies by name", () => {
    expect(sql).toMatch(/drop policy if exists "Users can read their profile"/i);
    expect(sql).toMatch(/drop policy if exists "Users can read own generated reports"/i);
  });
});
