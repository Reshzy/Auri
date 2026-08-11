import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import { ensureProfile } from "@/db/dal/profiles";
import { signatories } from "@/db/schema";
import type { SignatoryInput } from "@/lib/validation/onboarding";

function assertUserId(userId: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    throw new Error("Invalid authenticated user id.");
  }
}

export async function listOwnSignatories(userId: string) {
  assertUserId(userId);
  const db = getDb();
  return db
    .select()
    .from(signatories)
    .where(and(eq(signatories.userId, userId), eq(signatories.isActive, true)))
    .orderBy(asc(signatories.slot));
}

/**
 * Upsert all four active signatory slots for the session user.
 * Never trusts a client-supplied user id.
 */
export async function upsertOwnSignatories(
  userId: string,
  slots: SignatoryInput[],
  clientSuppliedOwnerId?: unknown,
) {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  if (slots.length !== 4) {
    throw new Error("All four signatory slots are required.");
  }
  const slotNumbers = new Set(slots.map((slot) => slot.slot));
  if (slotNumbers.size !== 4 || ![0, 1, 2, 3].every((n) => slotNumbers.has(n))) {
    throw new Error("Signatory slots must be 0–3 without duplicates.");
  }

  await ensureProfile(userId);
  const db = getDb();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    for (const slot of slots) {
      const existing = await tx
        .select()
        .from(signatories)
        .where(
          and(
            eq(signatories.userId, userId),
            eq(signatories.slot, slot.slot),
            eq(signatories.isActive, true),
          ),
        )
        .limit(1);

      if (existing[0]) {
        await tx
          .update(signatories)
          .set({
            displayName: slot.displayName,
            title: slot.title,
            isActive: slot.isActive,
            effectiveFrom: slot.effectiveFrom,
            effectiveTo: slot.effectiveTo,
            updatedAt: now,
          })
          .where(and(eq(signatories.id, existing[0].id), eq(signatories.userId, userId)));
      } else {
        await tx.insert(signatories).values({
          userId,
          slot: slot.slot,
          displayName: slot.displayName,
          title: slot.title,
          isActive: slot.isActive,
          effectiveFrom: slot.effectiveFrom,
          effectiveTo: slot.effectiveTo,
        });
      }
    }
  });

  return listOwnSignatories(userId);
}
