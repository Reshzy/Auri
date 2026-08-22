import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { hasAuthConfig } from "../src/lib/env";

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
  assert(existsSync(drizzleDir), "Missing drizzle/ migrations");
  const proxyPath = path.join(root, "src", "proxy.ts");
  assert(existsSync(proxyPath), "Missing src/proxy.ts (required when using src/app)");

  const proxySource = readFileSync(proxyPath, "utf8");
  assert(proxySource.includes("@supabase/ssr"), "proxy.ts must use @supabase/ssr");
  assert(proxySource.includes("getClaims"), "proxy.ts must authorize with getClaims()");
  assert(
    !proxySource.includes("clerkMiddleware"),
    "proxy.ts must not use clerkMiddleware",
  );
  assert(!proxySource.includes("/__clerk"), "proxy matcher must not include /__clerk");

  const drizzleSql = readSqlDir(drizzleDir);
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
        drizzleSql.toLowerCase().includes(`"${table}"`),
      `Missing Drizzle table ${table}`,
    );
  }

  assert(
    drizzleSql.includes("auth_user_id"),
    "Missing profiles.auth_user_id column in Drizzle migrations",
  );

  assert(
    existsSync(path.join(root, "src", "db", "dal", "profiles.ts")),
    "Missing ensureProfile DAL",
  );
  assert(
    existsSync(path.join(root, "src", "db", "dal", "auth-user.ts")),
    "Missing auth-user DAL",
  );
  assert(
    existsSync(path.join(root, "src", "app", "(auth)", "sign-in", "page.tsx")),
    "Missing sign-in page",
  );
  assert(
    existsSync(path.join(root, "src", "app", "(auth)", "sign-up", "page.tsx")),
    "Missing sign-up page",
  );
  assert(
    existsSync(path.join(root, "src", "app", "auth", "callback", "route.ts")),
    "Missing auth callback route",
  );

  if (existsSync(overlaysDir)) {
    console.log(
      "Note: supabase/overlays 001–004 assume auth.uid() = profiles.id and must not be applied as-is. Use supabase/overlays/server-auth/.",
    );
  }
  assert(
    existsSync(path.join(overlaysDir, "server-auth", "001_rls_enable_deny_default.sql")),
    "Missing server-auth RLS overlay",
  );

  const authConfigured = hasAuthConfig();

  console.log("Auth static checks: PASS");
  console.log(
    authConfigured
      ? "Auth env: configured"
      : "Auth env: missing (add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local)",
  );

  if (!authConfigured) {
    console.log(
      "Manual setup still required: copy .env.example → .env.local, add Supabase Auth keys, and set DATABASE_URL for Drizzle.",
    );
  }
}

main();
