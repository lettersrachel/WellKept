CREATE TABLE "visit_command" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"household_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit_command" ADD CONSTRAINT "visit_command_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_command_household_received_idx" ON "visit_command" USING btree ("household_id","received_at");