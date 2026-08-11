import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import {
  getDatabaseConnectionOptions,
  hasDatabaseUrl,
  hasDirectUrl,
  isLocalDatabaseHost,
} from "../src/lib/env";

config({ path: ".env.local" });
config();

const root = path.resolve(__dirname, "..");

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readDirSql(dir: string): string {
  if (!existsSync(dir)) {
    return "";
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
}

function main() {
  assert(existsSync(path.join(root, "drizzle.config.ts")), "Missing drizzle.config.ts");
  assert(existsSync(path.join(root, "src", "db", "index.ts")), "Missing src/db/index.ts");
  assert(
    existsSync(path.join(root, "src", "db", "schema", "index.ts")),
    "Missing Drizzle schema index",
  );

  const dbIndex = readFileSync(path.join(root, "src", "db", "index.ts"), "utf8");
  assert(dbIndex.includes('import "server-only"'), "src/db/index.ts must be server-only");

  const drizzleSql = readDirSql(path.join(root, "drizzle"));
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
      drizzleSql.toLowerCase().includes(`create table "${table}"`) ||
        drizzleSql.toLowerCase().includes(`create table ${table}`),
      `Drizzle migration missing table ${table}`,
    );
  }

  assert(
    drizzleSql.includes("profiles_active_schedule_id_fkey") ||
      drizzleSql.includes("set_updated_at"),
    "Drizzle migration should include active schedule FK / updated_at triggers",
  );

  assert(
    drizzleSql.includes("snapshots_refreshed_at"),
    "Drizzle migration missing report_periods.snapshots_refreshed_at",
  );

  const overlays = readDirSql(path.join(root, "supabase", "overlays"));
  assert(overlays.includes("handle_new_user"), "Overlay missing profile trigger");
  assert(overlays.includes("enable row level security"), "Overlay missing RLS");
  assert(overlays.includes("generated-reports"), "Overlay missing storage buckets");
  assert(overlays.includes("auth.users"), "Overlay missing auth.users FK");

  const archivedCore = path.join(
    root,
    "supabase",
    "archive",
    "20260811000001_core_schema.sql",
  );
  assert(existsSync(archivedCore), "Archived core schema missing");

  const liveMigrations = path.join(root, "supabase", "migrations");
  const liveSqlFiles = existsSync(liveMigrations)
    ? readdirSync(liveMigrations).filter((name) => name.endsWith(".sql"))
    : [];
  assert(
    liveSqlFiles.length === 0,
    "supabase/migrations should not contain portable schema SQL (use drizzle/ + overlays)",
  );

  console.log("Phase 2 db:check static assertions: PASS");

  if (!hasDatabaseUrl() || !hasDirectUrl()) {
    console.log(
      "DATABASE_URL/DIRECT_URL: missing or incomplete — live connection/migrate checks skipped",
    );
    return;
  }

  const runtimeUrl = process.env.DATABASE_URL!;
  const options = getDatabaseConnectionOptions(runtimeUrl);
  console.log(
    `Runtime connection policy: local=${isLocalDatabaseHost(runtimeUrl)} prepare=${options.prepare} ssl=${options.ssl}`,
  );
  console.log("DATABASE_URL/DIRECT_URL: configured (credentials not logged)");
}

main();
