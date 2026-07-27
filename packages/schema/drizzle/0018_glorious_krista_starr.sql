CREATE TYPE "public"."prompt_dismiss_reason" AS ENUM('wrong', 'bad_timing');--> statement-breakpoint
ALTER TABLE "prompt_outcome" ADD COLUMN "was_news" boolean;--> statement-breakpoint
ALTER TABLE "prompt_outcome" ADD COLUMN "dismiss_reason" "prompt_dismiss_reason";