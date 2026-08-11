import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import { profiles } from "@/db/schema";
import type { ProfileInput } from "@/lib/validation/onboarding";

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

/** Update profile fields for the authenticated user only. */
export async function updateOwnProfile(
  userId: string,
  input: ProfileInput,
  clientSuppliedOwnerId?: unknown,
) {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  await ensureProfile(userId);
  const db = getDb();
  const now = new Date().toISOString();

  const updated = await db
    .update(profiles)
    .set({
      employeeName: input.employeeName,
      employeeTitle: input.employeeTitle,
      organizationName: input.organizationName,
      officeName: input.officeName,
      departmentName: input.departmentName,
      timezone: input.timezone,
      locale: input.locale,
      updatedAt: now,
    })
    .where(eq(profiles.id, userId))
    .returning();

  if (!updated[0]) {
    throw new Error("Failed to update profile.");
  }
  return updated[0];
}

/** Mark onboarding complete for the session user. Idempotent. */
export async function completeOwnOnboarding(
  userId: string,
  clientSuppliedOwnerId?: unknown,
) {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  const profile = await ensureProfile(userId);
  if (profile.onboardingCompletedAt) {
    return profile;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const updated = await db
    .update(profiles)
    .set({ onboardingCompletedAt: now, updatedAt: now })
    .where(eq(profiles.id, userId))
    .returning();

  if (!updated[0]) {
    throw new Error("Failed to complete onboarding.");
  }
  return updated[0];
}
