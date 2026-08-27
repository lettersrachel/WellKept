-- 0058, the systems walk-through.
--
-- HAND-REORDERED after generation, deliberately: drizzle-kit emitted the
-- two composite FOREIGN KEYs BEFORE the unique index they reference, and
-- Postgres refuses with "there is no unique constraint matching given
-- keys for referenced table". The unique index now precedes them. Keep
-- this order if the file is ever regenerated.
ALTER TABLE "capture_artifact" ADD COLUMN "registry_entry_id" uuid;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "install_date" date;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "install_date_granularity" text;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "serial_verbatim" text;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "derivation_source" text;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "derived_year" integer;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "install_confidence" text;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "photo_pass_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "ask_pass_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "visit_photo" ADD COLUMN "registry_entry_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "registry_entry_household_id_key" ON "registry_entry" USING btree ("household_id","id");
--> statement-breakpoint
ALTER TABLE "capture_artifact" ADD CONSTRAINT "capture_artifact_registry_entry_same_household_fk" FOREIGN KEY ("household_id","registry_entry_id") REFERENCES "public"."registry_entry"("household_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visit_photo" ADD CONSTRAINT "visit_photo_registry_entry_same_household_fk" FOREIGN KEY ("household_id","registry_entry_id") REFERENCES "public"."registry_entry"("household_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD CONSTRAINT "registry_entry_install_granularity_known" CHECK ("registry_entry"."install_date_granularity" IS NULL OR "registry_entry"."install_date_granularity" IN ('year','month','day'));
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD CONSTRAINT "registry_entry_install_date_is_whole" CHECK (("registry_entry"."install_date" IS NULL AND "registry_entry"."install_date_granularity" IS NULL) OR ("registry_entry"."install_date" IS NOT NULL AND "registry_entry"."install_date_granularity" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD CONSTRAINT "registry_entry_install_confidence_known" CHECK ("registry_entry"."install_confidence" IS NULL OR "registry_entry"."install_confidence" IN ('confirmed','derived','uncertain'));
--> statement-breakpoint
ALTER TABLE "registry_entry" ADD CONSTRAINT "registry_entry_install_assessment_is_whole" CHECK (("registry_entry"."derivation_source" IS NULL AND "registry_entry"."install_confidence" IS NULL AND "registry_entry"."derived_year" IS NULL) OR ("registry_entry"."derivation_source" IS NOT NULL AND "registry_entry"."install_confidence" IS NOT NULL));
