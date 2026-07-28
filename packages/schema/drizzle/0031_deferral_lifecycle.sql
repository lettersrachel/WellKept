CREATE TYPE "public"."deferral_resolution" AS ENUM('done', 'no_longer_needed', 'superseded');--> statement-breakpoint
ALTER TABLE "deferral" ADD COLUMN "resolution" "deferral_resolution";--> statement-breakpoint
ALTER TABLE "deferral" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deferral" ADD COLUMN "resolved_by" text;--> statement-breakpoint
ALTER TABLE "deferral" ADD CONSTRAINT "deferral_resolved_by_auth_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deferral" ADD CONSTRAINT "deferral_resolution_is_whole" CHECK (("deferral"."resolution" IS NULL AND "deferral"."resolved_at" IS NULL AND "deferral"."resolved_by" IS NULL) OR ("deferral"."resolution" IS NOT NULL AND "deferral"."resolved_at" IS NOT NULL AND "deferral"."resolved_by" IS NOT NULL));