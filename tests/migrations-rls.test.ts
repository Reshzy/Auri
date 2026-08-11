import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = path.resolve(__dirname, "../supabase/migrations");

function readMigrations(): string {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  return files
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
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

describe("Phase 2 migrations and RLS", () => {
  const sql = readMigrations();

  it("creates all core tables", () => {
    for (const table of [...USER_OWNED_TABLES, "template_versions"] as const) {
      expect(sql).toMatch(new RegExp(`create table public\\.${table}`, "i"));
    }
  });

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

  it("restricts report delete to drafts and blocks authenticated template writes", () => {
    expect(sql).toMatch(/Users can delete their draft reports/i);
    expect(sql).toMatch(/status = 'draft'/i);
    expect(sql).toMatch(/Authenticated users can read template versions/i);
    expect(sql).not.toMatch(
      /create policy[\s\S]{0,120}on public\.template_versions[\s\S]{0,80}for insert/i,
    );
    expect(sql).not.toMatch(
      /create policy[\s\S]{0,120}on public\.template_versions[\s\S]{0,80}for update/i,
    );
    expect(sql).not.toMatch(
      /create policy[\s\S]{0,120}on public\.template_versions[\s\S]{0,80}for delete/i,
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
