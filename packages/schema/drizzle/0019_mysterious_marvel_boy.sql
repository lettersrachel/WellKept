CREATE TYPE "public"."incident_preventable_kind" AS ENUM('fired_and_ignored', 'fired_too_late', 'no_prompt_existed', 'not_preventable', 'unclear');--> statement-breakpoint
ALTER TABLE "incident_report" ADD COLUMN "preventable_by_prompt" "incident_preventable_kind";--> statement-breakpoint
ALTER TABLE "incident_report" ADD COLUMN "related_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "incident_report" ADD COLUMN "related_prompt_id" uuid;