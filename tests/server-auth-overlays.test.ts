import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const overlayDir = path.resolve(__dirname, "../supabase/overlays/server-auth");

function readOverlaySql(): string {
  return readdirSync(overlayDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(overlayDir, name), "utf8"))
    .join("\n");
}

describe("Server-auth Supabase overlays", () => {
  const sql = readOverlaySql();

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

  it("optionally binds auth_user_id to auth.users", () => {
    expect(sql).toMatch(/profiles_auth_user_id_auth_users_fkey/);
    expect(sql).toMatch(/references auth\.users/);
  });
});
