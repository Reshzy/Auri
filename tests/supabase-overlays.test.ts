import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const overlaysDir = path.resolve(__dirname, "../supabase/overlays");

function readOverlays(): string {
  return readdirSync(overlaysDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(overlaysDir, name), "utf8"))
    .join("\n");
}

const USER_OWNED_TABLES = [
  "profiles",
  "work_schedules",
  "signatories",
  "accomplishment_presets",
  "report_periods",
  "daily_entries",
  "report_exports",
] as const;

describe("Supabase production overlays", () => {
  const sql = readOverlays();

  it("enables RLS on every user-owned table and template_versions", () => {
    for (const table of [...USER_OWNED_TABLES, "template_versions"] as const) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
    }
  });

  it("creates a profile row trigger for new auth users", () => {
    expect(sql).toMatch(/handle_new_user/i);
    expect(sql).toMatch(/on_auth_user_created/i);
    expect(sql).toMatch(/insert into public\.profiles/i);
  });

  it("binds profiles to auth.users in production overlay", () => {
    expect(sql).toMatch(/references auth\.users/i);
  });

  it("restricts report delete to drafts and blocks authenticated template writes", () => {
    expect(sql).toMatch(/Users can delete their draft reports/i);
    expect(sql).toMatch(/status = 'draft'/i);
    expect(sql).toMatch(/Authenticated users can read template versions/i);
    expect(sql).not.toMatch(
      /create policy[\s\S]{0,120}on public\.template_versions[\s\S]{0,80}for insert/i,
    );
  });

  it("defines private storage buckets and generated-report ownership policies", () => {
    expect(sql).toMatch(/'templates'/);
    expect(sql).toMatch(/'generated-reports'/);
    expect(sql).toMatch(/Users can read own generated reports/i);
    expect(sql).toMatch(
      /storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/,
    );
  });
});
