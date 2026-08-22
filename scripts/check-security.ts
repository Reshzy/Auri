import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Clerk secret key", pattern: /\bsk_(live|test)_[A-Za-z0-9]{20,}\b/ },
  {
    name: "Supabase service role JWT",
    pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./,
  },
  {
    name: "Generic private key block",
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
];

const FORBIDDEN_PUBLIC_PREFIXES = [
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_DATABASE_URL",
  "NEXT_PUBLIC_DIRECT_URL",
];

const ALLOWED_SECRET_FILES = new Set([".env.example", "scripts/check-security.ts"]);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function trackedFiles(): string[] {
  try {
    const output = execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    return walkFiles(ROOT, []).map((file) => path.relative(ROOT, file));
  }
}

function walkFiles(dir: string, acc: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    if (
      entry === "node_modules" ||
      entry === ".next" ||
      entry === ".git" ||
      entry === "coverage" ||
      entry === "test-results" ||
      entry === "playwright-report"
    ) {
      continue;
    }
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function isSkippable(relative: string): boolean {
  return (
    relative.startsWith(".agents/") ||
    relative.includes("node_modules/") ||
    relative.endsWith(".png") ||
    relative.endsWith(".jpg") ||
    relative.endsWith(".webp") ||
    relative.endsWith(".docx") ||
    relative.endsWith(".xlsx") ||
    relative.endsWith(".lock") ||
    relative === "pnpm-lock.yaml"
  );
}

function main(): void {
  const gitignore = readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert(gitignore.includes(".env*"), ".gitignore must ignore .env files");
  assert(
    gitignore.includes("/playwright-report/"),
    ".gitignore must ignore Playwright reports",
  );
  assert(
    gitignore.includes("/playwright/.auth/") || gitignore.includes("*.auth.json"),
    ".gitignore must ignore Playwright auth state",
  );

  const example = readFileSync(path.join(ROOT, ".env.example"), "utf8");
  for (const name of FORBIDDEN_PUBLIC_PREFIXES) {
    assert(!example.includes(`${name}=`), `.env.example must not define ${name}`);
  }
  assert(
    example.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="),
    ".env.example should document NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  assert(
    example.includes("# SUPABASE_SERVICE_ROLE_KEY="),
    ".env.example should keep the service role commented",
  );
  assert(
    !example.includes("CLERK_SECRET_KEY="),
    ".env.example must not document Clerk secrets",
  );
  assert(
    !/sk_(live|test)_[A-Za-z0-9]{20,}/.test(example),
    ".env.example must not contain a real Clerk secret",
  );

  const envSource = readFileSync(path.join(ROOT, "src/lib/env.ts"), "utf8");
  assert(
    envSource.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    "Public schema must include the Supabase publishable key",
  );
  assert(
    !envSource.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE"),
    "Service role must never use NEXT_PUBLIC_",
  );
  assert(
    !envSource.includes("CLERK_SECRET_KEY"),
    "Clerk secrets must not remain in env helpers",
  );

  const files = trackedFiles();
  for (const relative of files) {
    if (isSkippable(relative) || ALLOWED_SECRET_FILES.has(relative)) continue;
    const full = path.join(ROOT, relative);
    if (!existsSync(full) || statSync(full).isDirectory()) continue;
    const text = readFileSync(full, "utf8");
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        throw new Error(`Possible ${name} in tracked file ${relative}`);
      }
    }
    for (const forbidden of FORBIDDEN_PUBLIC_PREFIXES) {
      if (text.includes(forbidden)) {
        throw new Error(`Forbidden public secret name ${forbidden} in ${relative}`);
      }
    }
  }

  const clientApp = path.join(ROOT, "src/app");
  if (existsSync(clientApp)) {
    const appFiles = walkFiles(clientApp, []).filter((file) => file.endsWith(".tsx"));
    for (const full of appFiles) {
      const text = readFileSync(full, "utf8");
      assert(
        !text.includes("SUPABASE_SERVICE_ROLE_KEY"),
        `App file ${path.relative(ROOT, full)} must not reference the service role`,
      );
    }
  }

  console.log("Security static checks: PASS");
}

main();
