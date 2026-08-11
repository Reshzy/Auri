import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "@/db/schema/profiles";

export const reportPeriods = pgTable(
  "report_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    periodKind: text("period_kind").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").notNull().default("draft"),
    scheduleSnapshot: jsonb("schedule_snapshot").notNull(),
    profileSnapshot: jsonb("profile_snapshot").notNull(),
    signatorySnapshot: jsonb("signatory_snapshot").notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("report_periods_user_id_idx").on(table.userId),
    index("report_periods_user_start_date_idx").on(table.userId, table.startDate),
    check(
      "report_periods_kind_check",
      sql`${table.periodKind} in ('FIRST_HALF', 'SECOND_HALF', 'CUSTOM')`,
    ),
    check(
      "report_periods_status_check",
      sql`${table.status} in ('draft', 'ready', 'finalized', 'archived')`,
    ),
    check("report_periods_date_order_check", sql`${table.startDate} <= ${table.endDate}`),
  ],
);
