import { afterEach, describe, expect, it } from "vitest";
import {
  getDatabaseConnectionOptions,
  getDatabaseUrl,
  getDirectUrl,
  getPublicEnv,
  getServiceRoleKey,
  hasDatabaseUrl,
  hasDirectUrl,
  hasSupabasePublicConfig,
  hasSupabaseServiceRole,
  isLocalDatabaseHost,
  publicEnvSchema,
  serviceRoleSchema,
} from "@/lib/env";

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
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

  it("rejects incomplete public config", () => {
    clearEnv();
    expect(hasSupabasePublicConfig()).toBe(false);
    expect(() => getPublicEnv()).toThrow(/Missing or invalid Supabase public/);
  });

  it("accepts a complete public config", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";

    expect(hasSupabasePublicConfig()).toBe(true);
    const env = getPublicEnv();
    expect(env.AURI_TEMPLATE_BUCKET).toBe("templates");
    expect(env.AURI_GENERATED_BUCKET).toBe("generated-reports");
    expect(env.AURI_DEFAULT_TIMEZONE).toBe("Asia/Manila");
  });

  it("keeps the service role key off the public schema", () => {
    const shape = publicEnvSchema.shape;
    expect("SUPABASE_SERVICE_ROLE_KEY" in shape).toBe(false);
    expect("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" in shape).toBe(true);
    expect(serviceRoleSchema.shape.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
  });

  it("requires a distinct service-role key for admin use", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";

    expect(hasSupabaseServiceRole()).toBe(false);
    expect(() => getServiceRoleKey()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);

    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    expect(hasSupabaseServiceRole()).toBe(true);
    expect(getServiceRoleKey()).toBe("service-role-test-key");
  });

  it("refuses a service-role key mirrored as the publishable key", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "same-secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "same-secret";

    expect(() => getServiceRoleKey()).toThrow(/exposed via NEXT_PUBLIC_/);
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
