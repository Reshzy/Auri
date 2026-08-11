import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "@/db/schema/profiles";

export const signatories = pgTable(
  "signatories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    title: text("title").notNull(),
    slot: smallint("slot").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("signatories_user_id_idx").on(table.userId),
    uniqueIndex("signatories_active_slot_per_user_idx")
      .on(table.userId, table.slot)
      .where(sql`${table.isActive} = true`),
    check("signatories_slot_range_check", sql`${table.slot} >= 0 and ${table.slot} <= 3`),
  ],
);
