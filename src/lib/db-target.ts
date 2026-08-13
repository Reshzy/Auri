const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

const PRODUCTION_HOST_MARKERS = [
  "supabase.co",
  "pooler.supabase.com",
  "neon.tech",
  "amazonaws.com",
  "azure.com",
  "rds.amazonaws.com",
];

export type MigrateTarget = "local" | "ci" | "preview" | "production";

export function parseDatabaseHost(connectionString: string): string | null {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return null;
  }
}

export function isDisposableDatabaseHost(hostname: string | null): boolean {
  if (!hostname) return false;
  return LOCAL_HOSTS.has(hostname);
}

export function looksLikeHostedProduction(hostname: string | null): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return PRODUCTION_HOST_MARKERS.some((marker) => lower.includes(marker));
}

export function resolveMigrateTarget(
  raw = process.env.AURI_MIGRATE_TARGET,
): MigrateTarget | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (
    value === "local" ||
    value === "ci" ||
    value === "preview" ||
    value === "production"
  ) {
    return value;
  }
  return null;
}

/**
 * Refuse ambiguous or production-looking mutation targets unless explicitly labeled.
 */
export function assertSafeMigrateTarget(connectionString: string): {
  host: string;
  target: MigrateTarget;
} {
  const host = parseDatabaseHost(connectionString);
  if (!host) {
    throw new Error("DATABASE_URL/DIRECT_URL host could not be parsed.");
  }

  const target = resolveMigrateTarget();
  const productionAllowed =
    process.env.AURI_ALLOW_PRODUCTION_MIGRATE === "1" && target === "production";

  if (looksLikeHostedProduction(host) && !productionAllowed) {
    throw new Error(
      `Refusing database mutation against hosted host '${host}'. Set AURI_MIGRATE_TARGET=production and AURI_ALLOW_PRODUCTION_MIGRATE=1 only after confirming the exact project.`,
    );
  }

  if (!target) {
    if (isDisposableDatabaseHost(host)) {
      return { host, target: "local" };
    }
    throw new Error(
      `Refusing database mutation against ambiguous host '${host}'. Set AURI_MIGRATE_TARGET to local, ci, preview, or production.`,
    );
  }

  if (target === "ci" && !isDisposableDatabaseHost(host) && !productionAllowed) {
    throw new Error(
      `AURI_MIGRATE_TARGET=ci requires a disposable host, received '${host}'.`,
    );
  }

  return { host, target };
}
