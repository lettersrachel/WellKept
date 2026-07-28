CREATE TABLE "paused_decision" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"research" text NOT NULL,
	"revisit_date" date,
	"revisit_condition" text,
	"paused_by" text NOT NULL,
	"paused_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolution" "deferral_resolution",
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "paused_decision_has_revisit_trigger" CHECK ("paused_decision"."revisit_date" IS NOT NULL OR "paused_decision"."revisit_condition" IS NOT NULL),
	CONSTRAINT "paused_decision_resolution_is_whole" CHECK (("paused_decision"."resolution" IS NULL AND "paused_decision"."resolved_at" IS NULL AND "paused_decision"."resolved_by" IS NULL) OR ("paused_decision"."resolution" IS NOT NULL AND "paused_decision"."resolved_at" IS NOT NULL AND "paused_decision"."resolved_by" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "paused_decision" ADD CONSTRAINT "paused_decision_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paused_decision" ADD CONSTRAINT "paused_decision_paused_by_auth_user_id_fk" FOREIGN KEY ("paused_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paused_decision" ADD CONSTRAINT "paused_decision_resolved_by_auth_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "paused_decision_household_idx" ON "paused_decision" USING btree ("household_id","paused_at");