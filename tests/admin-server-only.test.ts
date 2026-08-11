import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin client boundary", () => {
  it("marks the admin module as server-only", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../src/lib/supabase/admin.ts"),
      "utf8",
    );
    expect(source).toMatch(/import ["']server-only["']/);
    expect(source).toMatch(/SUPABASE_SERVICE_ROLE_KEY|getServiceRoleKey/);
  });

  it("keeps the browser client on the publishable key only", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../src/lib/supabase/client.ts"),
      "utf8",
    );
    expect(source).toMatch(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|getPublicEnv/);
    expect(source).not.toMatch(/SERVICE_ROLE/);
    expect(source).not.toMatch(/server-only/);
  });
});
