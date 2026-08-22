ALTER TABLE "profiles" RENAME COLUMN "clerk_user_id" TO "auth_user_id";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_clerk_user_id_unique";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_auth_user_id_unique" UNIQUE("auth_user_id");
