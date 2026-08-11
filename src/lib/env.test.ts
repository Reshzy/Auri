import { afterEach, describe, expect, it } from "vitest";
import {
  getPublicEnv,
  getServiceRoleKey,
  hasSupabasePublicConfig,
  hasSupabaseServiceRole,
  publicEnvSchema,
  serviceRoleSchema,
} from "@/lib/env";

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
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
});
