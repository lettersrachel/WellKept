-- M (round six): pack_key is the stable identifier exclusion matching uses;
-- pack_name becomes display copy. Backfill mints keys equal to the names,
-- so the set of matching exclusions is unchanged by this migration.
ALTER TABLE "prompt_pack_item" ADD COLUMN "pack_key" text;--> statement-breakpoint
UPDATE "prompt_pack_item" SET "pack_key" = "pack_name";--> statement-breakpoint
ALTER TABLE "prompt_pack_item" ALTER COLUMN "pack_key" SET NOT NULL;
