import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import postgres from "postgres";
import { assertSafeMigrateTarget } from "../src/lib/db-target";
import { getDatabaseConnectionOptions, hasDatabaseUrl } from "../src/lib/env";

config({ path: ".env.local" });
config();

const ROOT = path.resolve(__dirname, "..");
const DRIZZLE_DIR = path.join(ROOT, "drizzle");

const REQUIRED_TABLES = [
  "profiles",
  "work_schedules",
  "signatories",
  "accomplishment_presets",
  "report_periods",
  "daily_entries",
  "template_versions",
  "report_exports",
] as const;

const REQUIRED_INDEXES = [
  "report_exports_one_current_per_format_idx",
  "report_exports_user_created_idx",
  "report_exports_period_created_idx",
  "template_versions_one_active_per_key_idx",
  "profiles_auth_user_id_unique",
] as const;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function migrationFiles(): string[] {
  return readdirSync(DRIZZLE_DIR)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
}

function splitSql(sql: string): string[] {
  return sql
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function tableExists(sql: postgres.Sql, table: string): Promise<boolean> {
  const rows = await sql<Array<{ exists: boolean }>>`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = ${table}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function columnExists(
  sql: postgres.Sql,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await sql<Array<{ exists: boolean }>>`
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = ${table}
        and column_name = ${column}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function constraintExists(sql: postgres.Sql, name: string): Promise<boolean> {
  const rows = await sql<Array<{ exists: boolean }>>`
    select exists (
      select 1 from pg_constraint where conname = ${name}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function indexExists(sql: postgres.Sql, name: string): Promise<boolean> {
  const rows = await sql<Array<{ exists: boolean }>>`
    select exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = ${name}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function verifySchema(sql: postgres.Sql): Promise<void> {
  for (const table of REQUIRED_TABLES) {
    assert(await tableExists(sql, table), `Missing table ${table}`);
  }
  assert(
    await columnExists(sql, "profiles", "auth_user_id"),
    "Missing profiles.auth_user_id",
  );
  assert(
    await columnExists(sql, "report_exports", "bundle_manifest"),
    "Missing report_exports.bundle_manifest",
  );
  assert(
    await columnExists(sql, "report_periods", "snapshots_refreshed_at"),
    "Missing report_periods.snapshots_refreshed_at",
  );
  assert(
    await constraintExists(sql, "report_exports_template_provenance_check"),
    "Missing report_exports_template_provenance_check",
  );
  for (const index of REQUIRED_INDEXES) {
    assert(await indexExists(sql, index), `Missing index ${index}`);
  }
  const journal = await sql<Array<{ count: string }>>`
    select count(*)::text as count from drizzle.__drizzle_migrations
  `.catch(() => null);
  if (journal) {
    assert(
      Number(journal[0]?.count ?? 0) >= 5,
      "Drizzle journal is missing expected migrations",
    );
  }
  console.log("Schema verification: PASS");
}

async function applySqlFile(sql: postgres.Sql, fileName: string): Promise<void> {
  const source = readFileSync(path.join(DRIZZLE_DIR, fileName), "utf8");
  for (const statement of splitSql(source)) {
    await sql.unsafe(statement);
  }
}

function replaceDatabaseName(connectionString: string, database: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${database}`;
  return url.toString();
}

async function runIncremental(connectionString: string): Promise<void> {
  const files = migrationFiles();
  assert(
    files[0] === "0000_core_schema.sql",
    "First migration must be 0000_core_schema.sql",
  );
  assert(
    files.includes("0003_mighty_chamber.sql"),
    "Missing drizzle/0003_mighty_chamber.sql",
  );

  const incrementalUrl =
    process.env.AURI_INCREMENTAL_DATABASE_URL?.trim() || connectionString;
  const target = assertSafeMigrateTarget(incrementalUrl);
  console.log(`Incremental migration target=${target.target} host=${target.host}`);

  let workingUrl = incrementalUrl;
  if (process.env.AURI_INCREMENTAL_DATABASE_URL) {
    workingUrl = process.env.AURI_INCREMENTAL_DATABASE_URL;
  } else if (target.target === "ci") {
    const adminUrl = replaceDatabaseName(connectionString, "postgres");
    const options = getDatabaseConnectionOptions(adminUrl);
    const admin = postgres(adminUrl, {
      max: 1,
      prepare: options.prepare,
      ssl: options.ssl,
    });
    try {
      await admin.unsafe("create database auri_ci_incremental");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/already exists/i.test(message)) {
        throw error;
      }
    } finally {
      await admin.end({ timeout: 5 });
    }
    workingUrl = replaceDatabaseName(connectionString, "auri_ci_incremental");
  } else {
    console.log(
      "SKIP incremental SQL replay — set AURI_INCREMENTAL_DATABASE_URL to an empty disposable database.",
    );
    return;
  }

  const options = getDatabaseConnectionOptions(workingUrl);
  const sql = postgres(workingUrl, {
    max: 1,
    prepare: options.prepare,
    ssl: options.ssl,
  });
  try {
    const prior = files.filter((name) => name < "0003_mighty_chamber.sql");
    for (const file of prior) {
      await applySqlFile(sql, file);
    }
    assert(
      !(await columnExists(sql, "report_exports", "bundle_manifest")),
      "Prior schema unexpectedly already has bundle_manifest",
    );
    await applySqlFile(sql, "0003_mighty_chamber.sql");
    assert(
      await columnExists(sql, "report_exports", "bundle_manifest"),
      "0003 should add bundle_manifest",
    );
    assert(
      !(await columnExists(sql, "profiles", "auth_user_id")),
      "0003 should not yet have auth_user_id",
    );
    const later = files.filter((name) => name > "0003_mighty_chamber.sql");
    assert(later.length > 0, "Missing drizzle migration after 0003 for auth_user_id");
    for (const file of later) {
      await applySqlFile(sql, file);
    }
    await verifySchema(sql);
    console.log("Incremental 0003 + later migrations: PASS");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main(): Promise<void> {
  assert(existsSync(DRIZZLE_DIR), "Missing drizzle/");
  const files = migrationFiles();
  assert(files.includes("0003_mighty_chamber.sql"), "Missing 0003_mighty_chamber.sql");
  console.log(`Committed migrations: ${files.join(", ")}`);

  if (!hasDatabaseUrl()) {
    console.log("SKIP live schema verification — DATABASE_URL is not set.");
    return;
  }

  const url = process.env.DATABASE_URL!;
  const target = assertSafeMigrateTarget(url);
  console.log(`Schema-check target=${target.target} host=${target.host}`);

  const options = getDatabaseConnectionOptions(url);
  const sql = postgres(url, {
    max: 1,
    prepare: options.prepare,
    ssl: options.ssl,
  });
  try {
    if (!(await tableExists(sql, "profiles"))) {
      throw new Error(
        "Database has no profiles table. Run `pnpm db:migrate` against this disposable target first.",
      );
    }
    await verifySchema(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }

  if (
    process.argv.includes("--incremental") ||
    process.env.AURI_INCREMENTAL_DATABASE_URL ||
    target.target === "ci"
  ) {
    await runIncremental(url);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
