import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  employeeName: text("employee_name").notNull().default(""),
  employeeTitle: text("employee_title"),
  organizationName: text("organization_name"),
  officeName: text("office_name"),
  departmentName: text("department_name"),
  timezone: text("timezone").notNull().default("Asia/Manila"),
  locale: text("locale").notNull().default("en-PH"),
  activeScheduleId: uuid("active_schedule_id"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
    mode: "string",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
