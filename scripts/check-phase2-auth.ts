import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { hasSupabasePublicConfig, hasSupabaseServiceRole } from "../src/lib/env";

config({ path: ".env.local" });
config();

const root = path.resolve(__dirname, "..");
const overlaysDir = path.join(root, "supabase", "overlays");
const drizzleDir = path.join(root, "drizzle");

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readSqlDir(dir: string): string {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
}

function main() {
  assert(
    existsSync(path.join(root, "supabase", "config.toml")),
    "Missing supabase/config.toml",
  );
  assert(existsSync(overlaysDir), "Missing supabase/overlays");
  assert(existsSync(drizzleDir), "Missing drizzle/ migrations");

  const drizzleSql = readSqlDir(drizzleDir);
  const overlaySql = readSqlDir(overlaysDir);

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
    assert(
      drizzleSql.toLowerCase().includes(`create table "${table}"`),
      `Missing Drizzle table ${table}`,
    );
    assert(
      overlaySql.includes(`alter table public.${table} enable row level security`),
      `Missing RLS enable for ${table}`,
    );
  }

  assert(overlaySql.includes("handle_new_user"), "Missing profile bootstrap trigger");
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
  assert(
    existsSync(path.join(root, "src", "db", "dal", "profiles.ts")),
    "Missing ensureProfile DAL",
  );

  const publicConfigured = hasSupabasePublicConfig();
  const serviceConfigured = hasSupabaseServiceRole();

  console.log("Phase 2 static auth checks: PASS");
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
      "Manual setup still required: copy .env.example → .env.local, configure Auth redirect URLs, and set DATABASE_URL for Drizzle.",
    );
  }
}

main();
