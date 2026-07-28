CREATE TABLE "deferral" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"noticed" text NOT NULL,
	"reason" text NOT NULL,
	"revisit_date" date,
	"revisit_condition" text,
	"decided_by" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_id" uuid,
	CONSTRAINT "deferral_has_revisit_trigger" CHECK ("deferral"."revisit_date" IS NOT NULL OR "deferral"."revisit_condition" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "deferral" ADD CONSTRAINT "deferral_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deferral" ADD CONSTRAINT "deferral_decided_by_auth_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deferral" ADD CONSTRAINT "deferral_visit_id_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deferral_household_idx" ON "deferral" USING btree ("household_id","decided_at");