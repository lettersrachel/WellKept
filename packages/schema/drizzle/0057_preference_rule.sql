CREATE TABLE "preference_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"rule" text NOT NULL,
	"provenance" text NOT NULL,
	"confidence" text,
	"review_by" date,
	"recorded_by" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"retired_reason" text,
	"retired_at" timestamp with time zone,
	"retired_by" text,
	CONSTRAINT "preference_rule_provenance_known" CHECK ("preference_rule"."provenance" IN ('explicit','observed','inferred')),
	CONSTRAINT "preference_rule_status_known" CHECK ("preference_rule"."status" IN ('active','retired')),
	CONSTRAINT "preference_rule_confidence_is_whole" CHECK (("preference_rule"."provenance" = 'explicit' AND "preference_rule"."confidence" IS NULL) OR ("preference_rule"."provenance" <> 'explicit' AND "preference_rule"."confidence" IS NOT NULL)),
	CONSTRAINT "preference_rule_retirement_is_whole" CHECK (("preference_rule"."status" = 'retired' AND "preference_rule"."retired_reason" IS NOT NULL AND "preference_rule"."retired_at" IS NOT NULL AND "preference_rule"."retired_by" IS NOT NULL) OR ("preference_rule"."status" <> 'retired' AND "preference_rule"."retired_reason" IS NULL AND "preference_rule"."retired_at" IS NULL AND "preference_rule"."retired_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "preference_rule" ADD CONSTRAINT "preference_rule_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_rule" ADD CONSTRAINT "preference_rule_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_rule" ADD CONSTRAINT "preference_rule_retired_by_auth_user_id_fk" FOREIGN KEY ("retired_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "preference_rule_household_idx" ON "preference_rule" USING btree ("household_id","status");