import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: nonEmpty,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: nonEmpty,
  AURI_TEMPLATE_BUCKET: nonEmpty.default("templates"),
  AURI_GENERATED_BUCKET: nonEmpty.default("generated-reports"),
  AURI_DEFAULT_TIMEZONE: nonEmpty.default("Asia/Manila"),
});

const clerkSecretSchema = z.object({
  CLERK_SECRET_KEY: nonEmpty,
});

const databaseUrlSchema = nonEmpty
  .url()
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must be a postgres connection string",
  );

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type DatabaseConnectionOptions = {
  prepare: boolean;
  ssl: false | "require";
};

function readPublicEnvInput() {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    AURI_TEMPLATE_BUCKET: process.env.AURI_TEMPLATE_BUCKET,
    AURI_GENERATED_BUCKET: process.env.AURI_GENERATED_BUCKET,
    AURI_DEFAULT_TIMEZONE: process.env.AURI_DEFAULT_TIMEZONE,
  };
}

/** True when Clerk publishable + secret keys are present. */
export function hasClerkConfig(): boolean {
  return (
    publicEnvSchema.safeParse(readPublicEnvInput()).success &&
    clerkSecretSchema.safeParse({
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    }).success
  );
}

export function hasDatabaseUrl(): boolean {
  return databaseUrlSchema.safeParse(process.env.DATABASE_URL).success;
}

/** True when trusted server Storage credentials are present (never a user-auth proof). */
export function hasSupabaseStorageConfig(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function hasDirectUrl(): boolean {
  return databaseUrlSchema.safeParse(process.env.DIRECT_URL).success;
}

export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse(readPublicEnvInput());
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid public environment variables. Copy .env.example to .env.local and fill NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.",
    );
  }

  return parsed.data;
}

export function getClerkSecretKey(): string {
  const parsed = clerkSecretSchema.safeParse({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing CLERK_SECRET_KEY. This key is server-only and must never use a NEXT_PUBLIC_ prefix.",
    );
  }
  return parsed.data.CLERK_SECRET_KEY;
}

export function getDatabaseUrl(): string {
  const parsed = databaseUrlSchema.safeParse(process.env.DATABASE_URL);
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid DATABASE_URL. Set a postgres connection string in .env.local (see .env.example).",
    );
  }
  return parsed.data;
}

export function getDirectUrl(): string {
  const parsed = databaseUrlSchema.safeParse(process.env.DIRECT_URL);
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid DIRECT_URL. Set a postgres connection string for migrations in .env.local (see .env.example).",
    );
  }
  return parsed.data;
}

export function isLocalDatabaseHost(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

/**
 * Local Postgres: prepare on, SSL off.
 * Remote (Supabase pooler / Vercel): prepare off, SSL required.
 */
export function getDatabaseConnectionOptions(
  connectionString: string,
): DatabaseConnectionOptions {
  const local = isLocalDatabaseHost(connectionString);
  return {
    prepare: local,
    ssl: local ? false : "require",
  };
}

export { publicEnvSchema, clerkSecretSchema, databaseUrlSchema };
