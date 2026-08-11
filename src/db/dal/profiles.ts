import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";

export { assertOwnerMatchesSession } from "@/db/dal/ownership";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUserId(userId: string): void {
  if (!UUID_RE.test(userId)) {
    throw new Error("Invalid authenticated user id.");
  }
}

/**
 * Idempotent local/production profile bootstrap for a verified Supabase user UUID.
 * Safe to call repeatedly. Does not trust client-supplied ownership fields.
 */
export async function ensureProfile(userId: string) {
  assertUserId(userId);
  const db = getDb();

  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const inserted = await db
    .insert(profiles)
    .values({ id: userId })
    .onConflictDoNothing({ target: profiles.id })
    .returning();

  if (inserted[0]) {
    return inserted[0];
  }

  const afterConflict = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!afterConflict[0]) {
    throw new Error("Failed to ensure profile for authenticated user.");
  }

  return afterConflict[0];
}

/** Load the caller's own profile. Rejects any alternate owner id. */
export async function getOwnProfile(userId: string) {
  assertUserId(userId);
  const db = getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return rows[0] ?? null;
}
