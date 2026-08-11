import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: nonEmpty,
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  AURI_TEMPLATE_BUCKET: nonEmpty.default("templates"),
  AURI_GENERATED_BUCKET: nonEmpty.default("generated-reports"),
  AURI_DEFAULT_TIMEZONE: nonEmpty.default("Asia/Manila"),
});

const serviceRoleSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function readPublicEnvInput() {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    AURI_TEMPLATE_BUCKET: process.env.AURI_TEMPLATE_BUCKET,
    AURI_GENERATED_BUCKET: process.env.AURI_GENERATED_BUCKET,
    AURI_DEFAULT_TIMEZONE: process.env.AURI_DEFAULT_TIMEZONE,
  };
}

/** True when browser/server Supabase clients can be constructed. */
export function hasSupabasePublicConfig(): boolean {
  return publicEnvSchema.safeParse(readPublicEnvInput()).success;
}

/** True when the service-role admin client can be constructed. */
export function hasSupabaseServiceRole(): boolean {
  return (
    hasSupabasePublicConfig() &&
    serviceRoleSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }).success
  );
}

export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse(readPublicEnvInput());
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid Supabase public environment variables. Copy .env.example to .env.local and fill NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("eyJ")) {
    // JWT-shaped publishable/anon keys are fine; service-role must never use NEXT_PUBLIC_.
  }

  return parsed.data;
}

export function getServiceRoleKey(): string {
  const publicEnv = getPublicEnv();
  const parsed = serviceRoleSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. This key is server-only and must never use a NEXT_PUBLIC_ prefix.",
    );
  }

  if (
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ===
      parsed.data.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Refusing to use a service-role key that appears exposed via NEXT_PUBLIC_ variables.",
    );
  }

  return parsed.data.SUPABASE_SERVICE_ROLE_KEY;
}

export { publicEnvSchema, serviceRoleSchema };
