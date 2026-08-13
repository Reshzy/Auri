DROP INDEX "report_exports_period_created_idx";--> statement-breakpoint
ALTER TABLE "report_exports" ALTER COLUMN "template_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_exports" ADD COLUMN "bundle_manifest" jsonb;--> statement-breakpoint
CREATE INDEX "report_exports_user_created_idx" ON "report_exports" USING btree ("user_id","created_at" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "report_exports_one_current_per_format_idx" ON "report_exports" USING btree ("report_period_id","format") WHERE "report_exports"."is_current" = true;--> statement-breakpoint
CREATE INDEX "report_exports_period_created_idx" ON "report_exports" USING btree ("report_period_id","created_at" desc);--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_template_provenance_check" CHECK ((
        ("report_exports"."format" in ('docx', 'xlsx')
          and "report_exports"."template_version_id" is not null
          and "report_exports"."bundle_manifest" is null)
        or
        ("report_exports"."format" = 'zip'
          and "report_exports"."template_version_id" is null
          and "report_exports"."bundle_manifest" is not null)
      ));