import { relations } from "drizzle-orm";
import {
  accomplishmentPresets,
  dailyEntries,
  profiles,
  reportExports,
  reportPeriods,
  signatories,
  templateVersions,
  workSchedules,
} from "@/db/schema";

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  workSchedules: many(workSchedules),
  signatories: many(signatories),
  accomplishmentPresets: many(accomplishmentPresets),
  reportPeriods: many(reportPeriods),
  reportExports: many(reportExports),
  activeSchedule: one(workSchedules, {
    fields: [profiles.activeScheduleId],
    references: [workSchedules.id],
  }),
}));

export const workSchedulesRelations = relations(workSchedules, ({ one }) => ({
  profile: one(profiles, {
    fields: [workSchedules.userId],
    references: [profiles.id],
  }),
}));

export const signatoriesRelations = relations(signatories, ({ one }) => ({
  profile: one(profiles, {
    fields: [signatories.userId],
    references: [profiles.id],
  }),
}));

export const accomplishmentPresetsRelations = relations(
  accomplishmentPresets,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [accomplishmentPresets.userId],
      references: [profiles.id],
    }),
  }),
);

export const reportPeriodsRelations = relations(reportPeriods, ({ many, one }) => ({
  profile: one(profiles, {
    fields: [reportPeriods.userId],
    references: [profiles.id],
  }),
  dailyEntries: many(dailyEntries),
  reportExports: many(reportExports),
}));

export const dailyEntriesRelations = relations(dailyEntries, ({ one }) => ({
  reportPeriod: one(reportPeriods, {
    fields: [dailyEntries.reportPeriodId],
    references: [reportPeriods.id],
  }),
  profile: one(profiles, {
    fields: [dailyEntries.userId],
    references: [profiles.id],
  }),
}));

export const templateVersionsRelations = relations(templateVersions, ({ many }) => ({
  reportExports: many(reportExports),
}));

export const reportExportsRelations = relations(reportExports, ({ one }) => ({
  profile: one(profiles, {
    fields: [reportExports.userId],
    references: [profiles.id],
  }),
  reportPeriod: one(reportPeriods, {
    fields: [reportExports.reportPeriodId],
    references: [reportPeriods.id],
  }),
  templateVersion: one(templateVersions, {
    fields: [reportExports.templateVersionId],
    references: [templateVersions.id],
  }),
}));
