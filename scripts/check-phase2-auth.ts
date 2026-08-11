import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { hasSupabasePublicConfig, hasSupabaseServiceRole } from "../src/lib/env";

const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  assert(
    existsSync(path.join(root, "supabase", "config.toml")),
    "Missing supabase/config.toml",
  );
  assert(existsSync(migrationsDir), "Missing supabase/migrations");

  const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"));
  assert(migrations.length >= 4, "Expected at least four Phase 2 migrations");

  const sql = migrations
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");

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
    assert(sql.includes(`create table public.${table}`), `Missing table ${table}`);
    assert(
      sql.includes(`alter table public.${table} enable row level security`),
      `Missing RLS enable for ${table}`,
    );
  }

  assert(sql.includes("handle_new_user"), "Missing profile bootstrap trigger");
  assert(existsSync(path.join(root, "proxy.ts")), "Missing root proxy.ts");
  assert(
    existsSync(path.join(root, "src", "lib", "supabase", "client.ts")),
    "Missing browser Supabase client",
  );
  assert(
    existsSync(path.join(root, "src", "lib", "supabase", "server.ts")),
    "Missing server Supabase client",
  );
  assert(
    existsSync(path.join(root, "src", "lib", "supabase", "admin.ts")),
    "Missing admin Supabase client",
  );

  const publicConfigured = hasSupabasePublicConfig();
  const serviceConfigured = hasSupabaseServiceRole();

  console.log("Phase 2 static auth/database checks: PASS");
  console.log(
    publicConfigured
      ? "Supabase public env: configured"
      : "Supabase public env: missing (live auth/session checks skipped)",
  );
  console.log(
    serviceConfigured
      ? "Supabase service role: configured"
      : "Supabase service role: missing (admin/live isolation checks skipped)",
  );

  if (!publicConfigured) {
    console.log(
      "Manual setup still required: copy .env.example → .env.local, apply migrations, configure Auth redirect URLs.",
    );
  }
}

main();
