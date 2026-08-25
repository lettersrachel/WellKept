CREATE TABLE "household_task_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"task_definition_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cadence" text,
	"notes" text DEFAULT '' NOT NULL,
	"configured_by" text NOT NULL,
	"tombstoned_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "household_task_profile" ADD CONSTRAINT "household_task_profile_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_task_profile" ADD CONSTRAINT "household_task_profile_task_definition_id_task_definition_id_fk" FOREIGN KEY ("task_definition_id") REFERENCES "public"."task_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_task_profile" ADD CONSTRAINT "household_task_profile_configured_by_auth_user_id_fk" FOREIGN KEY ("configured_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "household_task_profile_household_idx" ON "household_task_profile" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "household_task_profile_one_per_task" ON "household_task_profile" USING btree ("household_id","task_definition_id");