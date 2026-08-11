import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "@/db/schema/profiles";
import { reportPeriods } from "@/db/schema/report-periods";

export const dailyEntries = pgTable(
  "daily_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportPeriodId: uuid("report_period_id")
      .notNull()
      .references(() => reportPeriods.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    classification: text("classification").notNull(),
    classificationLabel: text("classification_label"),
    amArrival: time("am_arrival"),
    amDeparture: time("am_departure"),
    pmArrival: time("pm_arrival"),
    pmDeparture: time("pm_departure"),
    workedMinutes: integer("worked_minutes").notNull().default(0),
    calculatedUndertimeMinutes: integer("calculated_undertime_minutes")
      .notNull()
      .default(0),
    undertimeOverrideMinutes: integer("undertime_override_minutes"),
    accomplishments: text("accomplishments")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    remarks: text("remarks"),
    isComplete: boolean("is_complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("daily_entries_user_id_idx").on(table.userId),
    index("daily_entries_report_period_id_idx").on(table.reportPeriodId),
    unique("daily_entries_unique_date_per_report").on(
      table.reportPeriodId,
      table.workDate,
    ),
    check(
      "daily_entries_classification_check",
      sql`${table.classification} in ('workday', 'scheduled_off', 'holiday', 'leave', 'absent', 'custom')`,
    ),
    check("daily_entries_worked_minutes_nonneg", sql`${table.workedMinutes} >= 0`),
    check(
      "daily_entries_calc_undertime_nonneg",
      sql`${table.calculatedUndertimeMinutes} >= 0`,
    ),
    check(
      "daily_entries_override_undertime_nonneg",
      sql`${table.undertimeOverrideMinutes} is null or ${table.undertimeOverrideMinutes} >= 0`,
    ),
  ],
);
