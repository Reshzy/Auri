import { afterEach, describe, expect, it } from "vitest";
import {
  assertSafeMigrateTarget,
  isDisposableDatabaseHost,
  looksLikeHostedProduction,
  parseDatabaseHost,
} from "@/lib/db-target";

describe("database mutation target guards", () => {
  const originalTarget = process.env.AURI_MIGRATE_TARGET;
  const originalAllow = process.env.AURI_ALLOW_PRODUCTION_MIGRATE;

  afterEach(() => {
    if (originalTarget === undefined) delete process.env.AURI_MIGRATE_TARGET;
    else process.env.AURI_MIGRATE_TARGET = originalTarget;
    if (originalAllow === undefined) delete process.env.AURI_ALLOW_PRODUCTION_MIGRATE;
    else process.env.AURI_ALLOW_PRODUCTION_MIGRATE = originalAllow;
  });

  it("treats localhost and CI postgres hosts as disposable", () => {
    expect(isDisposableDatabaseHost("localhost")).toBe(true);
    expect(isDisposableDatabaseHost("postgres")).toBe(true);
    expect(parseDatabaseHost("postgresql://postgres:x@localhost:5432/Auri")).toBe(
      "localhost",
    );
  });

  it("detects hosted Supabase hosts", () => {
    expect(looksLikeHostedProduction("db.abcd.supabase.co")).toBe(true);
    expect(looksLikeHostedProduction("aws-0-ap-southeast-1.pooler.supabase.com")).toBe(
      true,
    );
  });

  it("allows unlabeled local URLs and refuses unlabeled hosted URLs", () => {
    delete process.env.AURI_MIGRATE_TARGET;
    delete process.env.AURI_ALLOW_PRODUCTION_MIGRATE;
    expect(
      assertSafeMigrateTarget("postgresql://postgres:x@127.0.0.1:5432/Auri").target,
    ).toBe("local");
    expect(() =>
      assertSafeMigrateTarget(
        "postgresql://postgres:x@db.abcd.supabase.co:5432/postgres",
      ),
    ).toThrow(/Refusing database mutation/);
  });
});
