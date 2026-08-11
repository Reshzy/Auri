import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import { ensureProfile } from "@/db/dal/profiles";
import { profiles, workSchedules } from "@/db/schema";
import type { WeekdayRules } from "@/lib/validation/onboarding";

function assertUserId(userId: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    throw new Error("Invalid authenticated user id.");
  }
}

export async function listOwnSchedules(userId: string) {
  assertUserId(userId);
  const db = getDb();
  return db.select().from(workSchedules).where(eq(workSchedules.userId, userId));
}

export async function getOwnSchedule(userId: string, scheduleId: string) {
  assertUserId(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(workSchedules)
    .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOwnActiveSchedule(userId: string) {
  assertUserId(userId);
  await ensureProfile(userId);
  const db = getDb();
  const profileRows = await db
    .select({ activeScheduleId: profiles.activeScheduleId })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  const activeId = profileRows[0]?.activeScheduleId;
  if (!activeId) {
    return null;
  }
  return getOwnSchedule(userId, activeId);
}

/**
 * Upsert the caller's default schedule and point profiles.active_schedule_id at it.
 * Rejects client-supplied owner ids. Preserves referential integrity for active schedule.
 */
export async function upsertOwnDefaultSchedule(
  userId: string,
  input: {
    name: string;
    weekdayRules: WeekdayRules;
    scheduleId?: string | null;
    clientSuppliedOwnerId?: unknown;
  },
) {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, input.clientSuppliedOwnerId);
  await ensureProfile(userId);
  const db = getDb();
  const now = new Date().toISOString();

  return db.transaction(async (tx) => {
    let scheduleId = input.scheduleId ?? null;

    if (scheduleId) {
      const existing = await tx
        .select()
        .from(workSchedules)
        .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.userId, userId)))
        .limit(1);
      if (!existing[0]) {
        throw new Error("Schedule not found for the authenticated user.");
      }

      await tx
        .update(workSchedules)
        .set({
          name: input.name,
          weekdayRules: input.weekdayRules,
          isDefault: true,
          updatedAt: now,
        })
        .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.userId, userId)));
    } else {
      const inserted = await tx
        .insert(workSchedules)
        .values({
          userId,
          name: input.name,
          weekdayRules: input.weekdayRules,
          isDefault: true,
        })
        .returning();
      scheduleId = inserted[0]!.id;
    }

    await tx
      .update(workSchedules)
      .set({ isDefault: false, updatedAt: now })
      .where(
        and(
          eq(workSchedules.userId, userId),
          ne(workSchedules.id, scheduleId),
          eq(workSchedules.isDefault, true),
        ),
      );

    await tx
      .update(profiles)
      .set({ activeScheduleId: scheduleId, updatedAt: now })
      .where(eq(profiles.id, userId));

    const rows = await tx
      .select()
      .from(workSchedules)
      .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.userId, userId)))
      .limit(1);

    return rows[0]!;
  });
}

/** Point the profile at an owned schedule. Rejects foreign schedule ids. */
export async function setOwnActiveSchedule(
  userId: string,
  scheduleId: string,
  clientSuppliedOwnerId?: unknown,
) {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  await ensureProfile(userId);

  const owned = await getOwnSchedule(userId, scheduleId);
  if (!owned) {
    throw new Error("Schedule not found for the authenticated user.");
  }

  const db = getDb();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(workSchedules)
      .set({ isDefault: false, updatedAt: now })
      .where(and(eq(workSchedules.userId, userId), eq(workSchedules.isDefault, true)));

    await tx
      .update(workSchedules)
      .set({ isDefault: true, updatedAt: now })
      .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.userId, userId)));

    await tx
      .update(profiles)
      .set({ activeScheduleId: scheduleId, updatedAt: now })
      .where(eq(profiles.id, userId));
  });

  return owned;
}
