CREATE TYPE "public"."registry_kind" AS ENUM('dates', 'sizes', 'appliance', 'vendor', 'subscription', 'commitment', 'horizon');--> statement-breakpoint
CREATE TABLE "registry_entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" "registry_kind" NOT NULL,
	"label" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key_date" timestamp with time zone,
	"cadence" text,
	"sensitivity" "sensitivity" DEFAULT 's1' NOT NULL,
	"source_field_id" uuid,
	"tombstoned_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD CONSTRAINT "registry_entry_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registry_entry_household_idx" ON "registry_entry" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "registry_entry_household_kind_idx" ON "registry_entry" USING btree ("household_id","kind");