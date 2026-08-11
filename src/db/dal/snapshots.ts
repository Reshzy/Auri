import "server-only";

import { getOwnActiveSchedule } from "@/db/dal/schedules";
import { getOwnProfile } from "@/db/dal/profiles";
import { listOwnSignatories } from "@/db/dal/signatories";
import type { WeekdayRules } from "@/lib/validation/onboarding";

export type ProfileSnapshot = {
  employeeName: string;
  employeeTitle: string | null;
  organizationName: string | null;
  officeName: string | null;
  departmentName: string | null;
  timezone: string;
  locale: string;
};

export type ScheduleSnapshot = {
  id: string;
  name: string;
  weekdayRules: WeekdayRules;
};

export type SignatorySnapshot = {
  slot: number;
  displayName: string;
  title: string;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

/**
 * Build immutable snapshot JSON from the caller's current settings.
 * Used by Phase 4 report creation — Phase 3 only provides the builders.
 */
export async function buildProfileSnapshot(userId: string): Promise<ProfileSnapshot> {
  const profile = await getOwnProfile(userId);
  if (!profile) {
    throw new Error("Profile not found for the authenticated user.");
  }
  return {
    employeeName: profile.employeeName,
    employeeTitle: profile.employeeTitle,
    organizationName: profile.organizationName,
    officeName: profile.officeName,
    departmentName: profile.departmentName,
    timezone: profile.timezone,
    locale: profile.locale,
  };
}

export async function buildScheduleSnapshot(
  userId: string,
): Promise<ScheduleSnapshot | null> {
  const schedule = await getOwnActiveSchedule(userId);
  if (!schedule) {
    return null;
  }
  return {
    id: schedule.id,
    name: schedule.name,
    weekdayRules: schedule.weekdayRules as WeekdayRules,
  };
}

export async function buildSignatorySnapshot(
  userId: string,
): Promise<SignatorySnapshot[]> {
  const rows = await listOwnSignatories(userId);
  return rows.map((row) => ({
    slot: row.slot,
    displayName: row.displayName,
    title: row.title,
    isActive: row.isActive,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
  }));
}

export async function buildReportSnapshots(userId: string) {
  const [profileSnapshot, scheduleSnapshot, signatorySnapshot] = await Promise.all([
    buildProfileSnapshot(userId),
    buildScheduleSnapshot(userId),
    buildSignatorySnapshot(userId),
  ]);
  return { profileSnapshot, scheduleSnapshot, signatorySnapshot };
}
