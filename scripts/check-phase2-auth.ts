import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { hasClerkConfig } from "../src/lib/env";

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
  assert(proxySource.includes("clerkMiddleware"), "proxy.ts must use clerkMiddleware()");
  assert(
    proxySource.includes("/__clerk/:path*"),
    "proxy matcher must include /__clerk/:path*",
  );

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
    drizzleSql.includes("clerk_user_id"),
    "Missing profiles.clerk_user_id column in Drizzle migrations",
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
    existsSync(
      path.join(root, "src", "app", "(auth)", "sign-in", "[[...sign-in]]", "page.tsx"),
    ),
    "Missing Clerk sign-in page",
  );
  assert(
    existsSync(
      path.join(root, "src", "app", "(auth)", "sign-up", "[[...sign-up]]", "page.tsx"),
    ),
    "Missing Clerk sign-up page",
  );

  // Historical overlays remain as reference; Clerk-safe overlays live in overlays/clerk/.
  if (existsSync(overlaysDir)) {
    console.log(
      "Note: supabase/overlays 001–004 assume auth.uid() and must not be applied as-is. Use supabase/overlays/clerk/.",
    );
  }
  assert(
    existsSync(path.join(overlaysDir, "clerk", "001_rls_enable_deny_default.sql")),
    "Missing Clerk-safe RLS overlay",
  );

  const clerkConfigured = hasClerkConfig();

  console.log("Auth static checks: PASS");
  console.log(
    clerkConfigured
      ? "Clerk env: configured"
      : "Clerk env: missing (add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY to .env.local)",
  );

  if (!clerkConfigured) {
    console.log(
      "Manual setup still required: copy .env.example → .env.local, add Clerk keys, and set DATABASE_URL for Drizzle.",
    );
  }
}

main();
