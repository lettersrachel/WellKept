-- W-4 (WORK_QUEUE): children's sizes are child data (WK-SOP-019) and must
-- not be client-visible. Existing rows move to s2 BEFORE the constraint
-- lands, so the migration is self-contained against any database state.
UPDATE "registry_entry" SET "sensitivity" = 's2', "updated_at" = now() WHERE "kind" = 'sizes' AND "sensitivity" = 's1';--> statement-breakpoint
ALTER TABLE "registry_entry" ADD CONSTRAINT "registry_sizes_not_client_visible" CHECK ("registry_entry"."kind" <> 'sizes' OR "registry_entry"."sensitivity" <> 's1');
