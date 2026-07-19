CREATE TABLE "field_event_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"section" integer NOT NULL,
	"new_value" text NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "field_event_outbox_unprocessed_idx" ON "field_event_outbox" USING btree ("processed_at","created_at");