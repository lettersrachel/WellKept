CREATE TYPE "public"."incident_kind" AS ENUM('complaint', 'breakage', 'injury', 'near_miss', 'other');--> statement-breakpoint
CREATE TABLE "incident_report" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" "incident_kind" NOT NULL,
	"severity" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"reported_by" text NOT NULL,
	"reported_via" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "visit_photo" ADD COLUMN "retention_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_photo" ADD COLUMN "purged_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "incident_report_household_idx" ON "incident_report" USING btree ("household_id","status");