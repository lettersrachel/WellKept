CREATE TYPE "public"."attention_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."attention_urgency" AS ENUM('fyi', 'soon', 'now');--> statement-breakpoint
CREATE TABLE "attention_record" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" uuid,
	"audience" text NOT NULL,
	"urgency" "attention_urgency" DEFAULT 'soon' NOT NULL,
	"deadline" date,
	"sensitivity" "sensitivity" DEFAULT 's2' NOT NULL,
	"delivered_via" text,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"status" "attention_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "attention_record_source_known" CHECK ("attention_record"."source_kind" IN ('work_item','deferral','paused_decision','condition_flag','reconciliation','system')),
	CONSTRAINT "attention_record_audience_known" CHECK ("attention_record"."audience" IN ('hom','corporate','founder')),
	CONSTRAINT "attention_record_ack_is_whole" CHECK (("attention_record"."acknowledged_at" IS NULL AND "attention_record"."acknowledged_by" IS NULL) OR ("attention_record"."acknowledged_at" IS NOT NULL AND "attention_record"."acknowledged_by" IS NOT NULL)),
	CONSTRAINT "attention_record_resolution_is_whole" CHECK (("attention_record"."status" = 'resolved' AND "attention_record"."resolution" IS NOT NULL AND "attention_record"."resolved_at" IS NOT NULL AND "attention_record"."resolved_by" IS NOT NULL) OR ("attention_record"."status" <> 'resolved' AND "attention_record"."resolution" IS NULL AND "attention_record"."resolved_at" IS NULL AND "attention_record"."resolved_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "attention_record" ADD CONSTRAINT "attention_record_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attention_record" ADD CONSTRAINT "attention_record_acknowledged_by_auth_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attention_record" ADD CONSTRAINT "attention_record_resolved_by_auth_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attention_record_household_idx" ON "attention_record" USING btree ("household_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "attention_record_one_per_source" ON "attention_record" USING btree ("source_kind","source_id");