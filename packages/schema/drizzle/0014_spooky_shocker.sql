CREATE TYPE "public"."prompt_outcome_kind" AS ENUM('acted', 'dismissed', 'not_applicable', 'already_done');--> statement-breakpoint
CREATE TABLE "anticipation_exclusion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"target" text NOT NULL,
	"reason" text,
	"requested_by" text NOT NULL,
	"approved_by" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_outcome" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"prompt_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"provision_ref" text,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"outcome" "prompt_outcome_kind" NOT NULL,
	"fired_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone NOT NULL,
	"target_date" date,
	"lead_days" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_observation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"season_month" smallint NOT NULL,
	"season_week" smallint,
	"anchor_kind" text NOT NULL,
	"anchor_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"field_ref" text,
	"provision_ref" text,
	"recurrence" text NOT NULL,
	"confidence" text NOT NULL,
	"source_event_id" uuid,
	"superseded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "consent_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "consent_doc_version" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "consent_recorded_by" text;--> statement-breakpoint
ALTER TABLE "prompt_pack_item" ADD COLUMN "target_date" date;--> statement-breakpoint
ALTER TABLE "anticipation_exclusion" ADD CONSTRAINT "anticipation_exclusion_approved_by_auth_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_outcome" ADD CONSTRAINT "prompt_outcome_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anticipation_exclusion_household_idx" ON "anticipation_exclusion" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_outcome_prompt_user_unique" ON "prompt_outcome" USING btree ("prompt_id","user_id");--> statement-breakpoint
CREATE INDEX "prompt_outcome_rule_idx" ON "prompt_outcome" USING btree ("rule_id","answered_at");--> statement-breakpoint
CREATE INDEX "prompt_outcome_household_idx" ON "prompt_outcome" USING btree ("household_id","answered_at");--> statement-breakpoint
CREATE INDEX "season_observation_household_month_idx" ON "season_observation" USING btree ("household_id","season_month");