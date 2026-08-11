ALTER TABLE "profiles" ADD COLUMN "clerk_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_clerk_user_id_unique" UNIQUE("clerk_user_id");