import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "@/db/schema/profiles";

export const accomplishmentPresets = pgTable(
  "accomplishment_presets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    content: text("content").notNull(),
    category: text("category"),
    shortcut: text("shortcut"),
    useCount: integer("use_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accomplishment_presets_user_id_idx").on(table.userId),
    index("accomplishment_presets_user_active_use_count_idx").on(
      table.userId,
      table.isActive,
      table.useCount,
    ),
    uniqueIndex("accomplishment_presets_shortcut_per_user_idx")
      .on(table.userId, table.shortcut)
      .where(sql`${table.shortcut} is not null`),
    check("accomplishment_presets_use_count_nonneg", sql`${table.useCount} >= 0`),
  ],
);
