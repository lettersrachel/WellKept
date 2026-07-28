CREATE TYPE "public"."condition_flag_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "condition_flag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"registry_entry_id" uuid,
	"subject" text NOT NULL,
	"location" text NOT NULL,
	"concern" text NOT NULL,
	"raised_by" text NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revisit_date" date,
	"revisit_condition" text,
	"status" "condition_flag_status" DEFAULT 'open' NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"close_reason" text,
	CONSTRAINT "condition_flag_has_revisit_trigger" CHECK ("condition_flag"."revisit_date" IS NOT NULL OR "condition_flag"."revisit_condition" IS NOT NULL),
	CONSTRAINT "condition_flag_close_is_reasoned" CHECK ("condition_flag"."status" <> 'closed' OR ("condition_flag"."close_reason" IS NOT NULL AND "condition_flag"."closed_by" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "object_observation" ALTER COLUMN "registry_entry_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "object_observation" ADD COLUMN "condition_flag_id" uuid;--> statement-breakpoint
ALTER TABLE "condition_flag" ADD CONSTRAINT "condition_flag_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_flag" ADD CONSTRAINT "condition_flag_registry_entry_id_registry_entry_id_fk" FOREIGN KEY ("registry_entry_id") REFERENCES "public"."registry_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_flag" ADD CONSTRAINT "condition_flag_raised_by_auth_user_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_flag" ADD CONSTRAINT "condition_flag_closed_by_auth_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "condition_flag_household_idx" ON "condition_flag" USING btree ("household_id","status");--> statement-breakpoint
ALTER TABLE "object_observation" ADD CONSTRAINT "object_observation_condition_flag_id_condition_flag_id_fk" FOREIGN KEY ("condition_flag_id") REFERENCES "public"."condition_flag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "object_observation_flag_series_idx" ON "object_observation" USING btree ("condition_flag_id","measure","observed_at");--> statement-breakpoint
ALTER TABLE "object_observation" ADD CONSTRAINT "object_observation_has_subject" CHECK ("object_observation"."registry_entry_id" IS NOT NULL OR "object_observation"."condition_flag_id" IS NOT NULL);