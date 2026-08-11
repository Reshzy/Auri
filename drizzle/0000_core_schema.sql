CREATE TABLE "accomplishment_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"shortcut" text,
	"use_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accomplishment_presets_use_count_nonneg" CHECK ("accomplishment_presets"."use_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "daily_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_period_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"classification" text NOT NULL,
	"classification_label" text,
	"am_arrival" time,
	"am_departure" time,
	"pm_arrival" time,
	"pm_departure" time,
	"worked_minutes" integer DEFAULT 0 NOT NULL,
	"calculated_undertime_minutes" integer DEFAULT 0 NOT NULL,
	"undertime_override_minutes" integer,
	"accomplishments" text[] DEFAULT '{}'::text[] NOT NULL,
	"remarks" text,
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_entries_unique_date_per_report" UNIQUE("report_period_id","work_date"),
	CONSTRAINT "daily_entries_classification_check" CHECK ("daily_entries"."classification" in ('workday', 'scheduled_off', 'holiday', 'leave', 'absent', 'custom')),
	CONSTRAINT "daily_entries_worked_minutes_nonneg" CHECK ("daily_entries"."worked_minutes" >= 0),
	CONSTRAINT "daily_entries_calc_undertime_nonneg" CHECK ("daily_entries"."calculated_undertime_minutes" >= 0),
	CONSTRAINT "daily_entries_override_undertime_nonneg" CHECK ("daily_entries"."undertime_override_minutes" is null or "daily_entries"."undertime_override_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_name" text DEFAULT '' NOT NULL,
	"employee_title" text,
	"organization_name" text,
	"office_name" text,
	"department_name" text,
	"timezone" text DEFAULT 'Asia/Manila' NOT NULL,
	"locale" text DEFAULT 'en-PH' NOT NULL,
	"active_schedule_id" uuid,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"report_period_id" uuid NOT NULL,
	"template_version_id" uuid NOT NULL,
	"format" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"source_revision" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_exports_format_check" CHECK ("report_exports"."format" in ('docx', 'xlsx', 'zip')),
	CONSTRAINT "report_exports_file_size_nonneg" CHECK ("report_exports"."file_size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "report_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_kind" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"schedule_snapshot" jsonb NOT NULL,
	"profile_snapshot" jsonb NOT NULL,
	"signatory_snapshot" jsonb NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_periods_kind_check" CHECK ("report_periods"."period_kind" in ('FIRST_HALF', 'SECOND_HALF', 'CUSTOM')),
	CONSTRAINT "report_periods_status_check" CHECK ("report_periods"."status" in ('draft', 'ready', 'finalized', 'archived')),
	CONSTRAINT "report_periods_date_order_check" CHECK ("report_periods"."start_date" <= "report_periods"."end_date")
);
--> statement-breakpoint
CREATE TABLE "signatories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"title" text NOT NULL,
	"slot" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signatories_slot_range_check" CHECK ("signatories"."slot" >= 0 and "signatories"."slot" <= 3)
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" text NOT NULL,
	"version" integer NOT NULL,
	"file_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"sha256" text NOT NULL,
	"manifest" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_versions_key_version_unique" UNIQUE("template_key","version"),
	CONSTRAINT "template_versions_key_check" CHECK ("template_versions"."template_key" in ('accomplishment', 'dtr')),
	CONSTRAINT "template_versions_file_type_check" CHECK ("template_versions"."file_type" in ('docx', 'xlsx'))
);
--> statement-breakpoint
CREATE TABLE "work_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"weekday_rules" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accomplishment_presets" ADD CONSTRAINT "accomplishment_presets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_report_period_id_report_periods_id_fk" FOREIGN KEY ("report_period_id") REFERENCES "public"."report_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_report_period_id_report_periods_id_fk" FOREIGN KEY ("report_period_id") REFERENCES "public"."report_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_template_version_id_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."template_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_periods" ADD CONSTRAINT "report_periods_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatories" ADD CONSTRAINT "signatories_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accomplishment_presets_user_id_idx" ON "accomplishment_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accomplishment_presets_user_active_use_count_idx" ON "accomplishment_presets" USING btree ("user_id","is_active","use_count");--> statement-breakpoint
CREATE UNIQUE INDEX "accomplishment_presets_shortcut_per_user_idx" ON "accomplishment_presets" USING btree ("user_id","shortcut") WHERE "accomplishment_presets"."shortcut" is not null;--> statement-breakpoint
CREATE INDEX "daily_entries_user_id_idx" ON "daily_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_entries_report_period_id_idx" ON "daily_entries" USING btree ("report_period_id");--> statement-breakpoint
CREATE INDEX "report_exports_user_id_idx" ON "report_exports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "report_exports_period_created_idx" ON "report_exports" USING btree ("report_period_id","created_at");--> statement-breakpoint
CREATE INDEX "report_periods_user_id_idx" ON "report_periods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "report_periods_user_start_date_idx" ON "report_periods" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "signatories_user_id_idx" ON "signatories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signatories_active_slot_per_user_idx" ON "signatories" USING btree ("user_id","slot") WHERE "signatories"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "template_versions_one_active_per_key_idx" ON "template_versions" USING btree ("template_key") WHERE "template_versions"."is_active" = true;--> statement-breakpoint
CREATE INDEX "work_schedules_user_id_idx" ON "work_schedules" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_schedules_one_default_per_user_idx" ON "work_schedules" USING btree ("user_id") WHERE "work_schedules"."is_default" = true;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_active_schedule_id_fkey" FOREIGN KEY ("active_schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON "profiles" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER work_schedules_set_updated_at BEFORE UPDATE ON "work_schedules" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER signatories_set_updated_at BEFORE UPDATE ON "signatories" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER accomplishment_presets_set_updated_at BEFORE UPDATE ON "accomplishment_presets" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER report_periods_set_updated_at BEFORE UPDATE ON "report_periods" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER daily_entries_set_updated_at BEFORE UPDATE ON "daily_entries" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER template_versions_set_updated_at BEFORE UPDATE ON "template_versions" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();