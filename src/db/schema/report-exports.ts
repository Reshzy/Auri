import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "@/db/schema/profiles";
import { reportPeriods } from "@/db/schema/report-periods";
import { templateVersions } from "@/db/schema/template-versions";

export const reportExports = pgTable(
  "report_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    reportPeriodId: uuid("report_period_id")
      .notNull()
      .references(() => reportPeriods.id, { onDelete: "cascade" }),
    templateVersionId: uuid("template_version_id")
      .notNull()
      .references(() => templateVersions.id),
    format: text("format").notNull(),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    sourceRevision: text("source_revision").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("report_exports_user_id_idx").on(table.userId),
    index("report_exports_period_created_idx").on(table.reportPeriodId, table.createdAt),
    check("report_exports_format_check", sql`${table.format} in ('docx', 'xlsx', 'zip')`),
    check("report_exports_file_size_nonneg", sql`${table.fileSizeBytes} >= 0`),
  ],
);
