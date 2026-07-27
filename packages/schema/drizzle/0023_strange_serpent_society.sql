CREATE TYPE "public"."observation_measure" AS ENUM('condition', 'fill_level');--> statement-breakpoint
CREATE TABLE "object_observation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"registry_entry_id" uuid NOT NULL,
	"measure" "observation_measure" NOT NULL,
	"value" integer NOT NULL,
	"note" text,
	"observed_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "object_observation" ADD CONSTRAINT "object_observation_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_observation" ADD CONSTRAINT "object_observation_registry_entry_id_registry_entry_id_fk" FOREIGN KEY ("registry_entry_id") REFERENCES "public"."registry_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_observation" ADD CONSTRAINT "object_observation_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "object_observation_household_idx" ON "object_observation" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "object_observation_series_idx" ON "object_observation" USING btree ("registry_entry_id","measure","observed_at");