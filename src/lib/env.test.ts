import { afterEach, describe, expect, it } from "vitest";
import {
  getClerkSecretKey,
  getDatabaseConnectionOptions,
  getDatabaseUrl,
  getDirectUrl,
  getPublicEnv,
  hasClerkConfig,
  hasDatabaseUrl,
  hasDirectUrl,
  isLocalDatabaseHost,
  publicEnvSchema,
  clerkSecretSchema,
} from "@/lib/env";

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "AURI_TEMPLATE_BUCKET",
  "AURI_GENERATED_BUCKET",
  "AURI_DEFAULT_TIMEZONE",
] as const;

const original = new Map<string, string | undefined>();

function snapshotEnv() {
  for (const key of KEYS) {
    original.set(key, process.env[key]);
  }
}

function restoreEnv() {
  for (const key of KEYS) {
    const value = original.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearEnv() {
  for (const key of KEYS) {
    delete process.env[key];
  }
}

describe("env validation", () => {
  snapshotEnv();
  afterEach(() => {
    restoreEnv();
  });

  it("rejects incomplete Clerk config", () => {
    clearEnv();
    expect(hasClerkConfig()).toBe(false);
    expect(() => getPublicEnv()).toThrow(/Missing or invalid public/);
  });

  it("accepts a complete public config", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_example";

    const env = getPublicEnv();
    expect(env.AURI_TEMPLATE_BUCKET).toBe("templates");
    expect(env.AURI_GENERATED_BUCKET).toBe("generated-reports");
    expect(env.AURI_DEFAULT_TIMEZONE).toBe("Asia/Manila");
  });

  it("requires both publishable and secret keys for hasClerkConfig", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_example";
    expect(hasClerkConfig()).toBe(false);

    process.env.CLERK_SECRET_KEY = "sk_test_example";
    expect(hasClerkConfig()).toBe(true);
    expect(getClerkSecretKey()).toBe("sk_test_example");
  });

  it("keeps the Clerk secret key off the public schema", () => {
    const shape = publicEnvSchema.shape;
    expect("CLERK_SECRET_KEY" in shape).toBe(false);
    expect("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" in shape).toBe(true);
    expect(clerkSecretSchema.shape.CLERK_SECRET_KEY).toBeTruthy();
  });

  it("validates database connection URLs", () => {
    clearEnv();
    expect(hasDatabaseUrl()).toBe(false);
    expect(hasDirectUrl()).toBe(false);
    expect(() => getDatabaseUrl()).toThrow(/DATABASE_URL/);

    process.env.DATABASE_URL = "postgresql://postgres:secret@localhost:5432/Auri";
    process.env.DIRECT_URL = "postgresql://postgres:secret@localhost:5432/Auri";
    expect(hasDatabaseUrl()).toBe(true);
    expect(hasDirectUrl()).toBe(true);
    expect(getDirectUrl()).toContain("localhost:5432/Auri");
  });

  it("selects local versus remote connection options", () => {
    const local = "postgresql://postgres:x@localhost:5432/Auri";
    const remote =
      "postgresql://postgres:x@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

    expect(isLocalDatabaseHost(local)).toBe(true);
    expect(getDatabaseConnectionOptions(local)).toEqual({
      prepare: true,
      ssl: false,
    });
    expect(isLocalDatabaseHost(remote)).toBe(false);
    expect(getDatabaseConnectionOptions(remote)).toEqual({
      prepare: false,
      ssl: "require",
    });
  });
});
