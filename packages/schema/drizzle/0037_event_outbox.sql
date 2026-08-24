CREATE TABLE "event_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- CAND-OUTBOX-01 (reviewed hand-edit): field_event_outbox is the seed of
-- the generalized outbox; its rows carry over as kind 'field.changed' so
-- an unprocessed event survives the migration and drains normally after.
-- Processed rows come too: the outbox history stays whole.
INSERT INTO "event_outbox" ("id", "household_id", "kind", "payload", "occurred_at", "attempts", "processed_at", "created_at")
SELECT "id", "household_id", 'field.changed',
       jsonb_build_object(
         'fieldId', "field_id",
         'fieldName', "field_name",
         'section', "section",
         'newValue', "new_value",
         'changedAt', to_char("changed_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
       ),
       "changed_at", "attempts", "processed_at", "created_at"
FROM "field_event_outbox";
--> statement-breakpoint
DROP TABLE "field_event_outbox" CASCADE;--> statement-breakpoint
CREATE INDEX "event_outbox_unprocessed_idx" ON "event_outbox" USING btree ("processed_at","created_at");