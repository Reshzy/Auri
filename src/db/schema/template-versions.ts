import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const templateVersions = pgTable(
  "template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateKey: text("template_key").notNull(),
    version: integer("version").notNull(),
    fileType: text("file_type").notNull(),
    storagePath: text("storage_path").notNull(),
    sha256: text("sha256").notNull(),
    manifest: jsonb("manifest").notNull().default({}),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("template_versions_key_version_unique").on(table.templateKey, table.version),
    uniqueIndex("template_versions_one_active_per_key_idx")
      .on(table.templateKey)
      .where(sql`${table.isActive} = true`),
    check(
      "template_versions_key_check",
      sql`${table.templateKey} in ('accomplishment', 'dtr')`,
    ),
    check(
      "template_versions_file_type_check",
      sql`${table.fileType} in ('docx', 'xlsx')`,
    ),
  ],
);
