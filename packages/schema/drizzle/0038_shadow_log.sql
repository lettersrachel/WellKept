CREATE TYPE "public"."shadow_score" AS ENUM('true_signal', 'noise', 'unknowable');--> statement-breakpoint
CREATE TABLE "shadow_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"trigger_key" text NOT NULL,
	"signal" text NOT NULL,
	"confidence_pct" integer NOT NULL,
	"evidence" jsonb NOT NULL,
	"proposed_class" text NOT NULL,
	"inputs_hash" text NOT NULL,
	"evaluated_at" timestamp with time zone NOT NULL,
	"score" "shadow_score",
	"scored_by" text,
	"scored_at" timestamp with time zone,
	CONSTRAINT "shadow_log_confidence_bounded" CHECK ("shadow_log"."confidence_pct" >= 0 AND "shadow_log"."confidence_pct" <= 100),
	CONSTRAINT "shadow_log_class_known" CHECK ("shadow_log"."proposed_class" IN ('A0','A1','A2','A3','A4','A5')),
	CONSTRAINT "shadow_log_score_is_whole" CHECK (("shadow_log"."score" IS NULL AND "shadow_log"."scored_by" IS NULL AND "shadow_log"."scored_at" IS NULL) OR ("shadow_log"."score" IS NOT NULL AND "shadow_log"."scored_by" IS NOT NULL AND "shadow_log"."scored_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "shadow_log" ADD CONSTRAINT "shadow_log_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shadow_log" ADD CONSTRAINT "shadow_log_scored_by_auth_user_id_fk" FOREIGN KEY ("scored_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shadow_log_household_idx" ON "shadow_log" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "shadow_log_trigger_idx" ON "shadow_log" USING btree ("trigger_key","evaluated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shadow_log_distinct_evaluation" ON "shadow_log" USING btree ("trigger_key","household_id","inputs_hash");