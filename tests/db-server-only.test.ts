import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("server-only database boundary", () => {
  it("marks db entrypoints as server-only", () => {
    for (const relative of [
      "src/db/index.ts",
      "src/db/dal/auth-user.ts",
      "src/db/dal/profiles.ts",
      "src/db/dal/get-app-user.ts",
      "src/lib/supabase/admin.ts",
    ]) {
      const source = readFileSync(path.resolve(__dirname, "..", relative), "utf8");
      expect(source).toMatch(/import ["']server-only["']/);
    }
  });

  it("keeps the browser Supabase client free of DATABASE_URL and service role", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../src/lib/supabase/client.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/DATABASE_URL/);
    expect(source).not.toMatch(/SERVICE_ROLE/);
    expect(source).not.toMatch(/server-only/);
  });
});
