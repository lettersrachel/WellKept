CREATE TYPE "public"."time_category" AS ENUM('delivery', 'travel', 'intake', 'admin', 'training');--> statement-breakpoint
CREATE TABLE "time_entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"category" time_category NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"minutes" integer NOT NULL,
	"source" text NOT NULL,
	"visit_command_id" text,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_entry_household_started_idx" ON "time_entry" USING btree ("household_id","started_at");