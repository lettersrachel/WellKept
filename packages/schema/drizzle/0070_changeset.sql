-- 0070  changeset + changeset_effect  ·  Q-12b-2  ·  reconciliation, year-two, SHADOW
--
-- Spec: intake BENCHMARK_ADOPTION section 2 (verified@Q-0b, frozen);
-- RFC-ATTR-01 Amendment 1 section A1.3 ("Absent; new migration required").
--
-- READ BEFORE APPLYING, and it caught the 0058 shape for the THIRD time.
-- drizzle-kit emitted `changeset_effect_same_household_fk` BEFORE the
-- unique index `changeset_household_id_key` that the FK references, which
-- is the exact ordering Postgres refuses with "there is no unique
-- constraint matching given keys for referenced table". THE INDEX IS
-- MOVED ABOVE THE FK BY HAND. Do not regenerate this file without
-- re-applying the move: the generator orders statements by its own model
-- of the diff, not by what Postgres requires at apply time.
--
-- Otherwise purely additive: two CREATE TYPE, two CREATE TABLE, six FKs,
-- four indexes. No DROP, no ALTER COLUMN, no RENAME, nothing made NOT
-- NULL on an existing table. NO BACKFILL IS NEEDED: both tables are new,
-- so every CHECK is satisfied by construction on an empty table.
--
-- PRODUCER, PER COLUMN (G-85).
--   changeset.household_id        written by recordChangeset (corporate action, drill-in)
--   changeset.source_kind         written by recordChangeset
--   changeset.source_id           written by recordChangeset; nullable, since a change can be
--                                 a fact nothing in this tree holds a row for yet
--   changeset.what_changed        written by recordChangeset, in the operator's words
--   changeset.detected_at         written by recordChangeset
--   changeset.classification      written by classifyChangeset; NULL until a person classifies,
--                                 and NULL is NOT permissive: the CHECK refuses an apply
--   changeset.classified_at       written by classifyChangeset
--   changeset.classified_by       written by classifyChangeset
--   changeset.applied_at          written by applyChangeset
--   changeset.applied_by          written by applyChangeset
--   changeset.member_tradeoff     written by propagateChangeset where propagation finds one.
--                                 IDENTIFIED AND DELIVERED NOWHERE: the client side is frozen
--                                 at the digest and this row is shadow, so "reaches the member"
--                                 is not something this table can do today.
--   changeset.recorded_by         written by recordChangeset (write provenance)
--   changeset_effect.*            written by propagateChangeset; the effect rows carry no person
--                                 at all, the time_segment posture
--
-- WHAT IS DELIBERATELY NOT BUILT, so no reader mistakes absence for an
-- oversight: an AUTOMATIC classifier (which changes are safe is a safety
-- taxonomy and therefore the founder's, the capture-router precedent);
-- retiring a stale work_requirement (that CHECK carries nine states and
-- `retired` is not one, so adding it is a semantics change to a shipped
-- primitive and needs her word); and delivery of the member tradeoff.

CREATE TYPE "public"."changeset_class" AS ENUM('safe_automatic', 'review_required');
--> statement-breakpoint
CREATE TYPE "public"."changeset_effect_kind" AS ENUM('invalidated', 'recomputed');
--> statement-breakpoint
CREATE TABLE "changeset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" uuid,
	"what_changed" text NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"classification" "changeset_class",
	"classified_at" timestamp with time zone,
	"classified_by" text,
	"applied_at" timestamp with time zone,
	"applied_by" text,
	"member_tradeoff" text,
	"recorded_by" text NOT NULL,
	CONSTRAINT "changeset_classification_is_whole" CHECK (("changeset"."classification" IS NULL AND "changeset"."classified_at" IS NULL AND "changeset"."classified_by" IS NULL)
        OR ("changeset"."classification" IS NOT NULL AND "changeset"."classified_at" IS NOT NULL AND "changeset"."classified_by" IS NOT NULL)),
	CONSTRAINT "changeset_application_is_whole" CHECK (("changeset"."applied_at" IS NULL AND "changeset"."applied_by" IS NULL)
        OR ("changeset"."applied_at" IS NOT NULL AND "changeset"."applied_by" IS NOT NULL)),
	CONSTRAINT "changeset_applies_only_when_safe" CHECK ("changeset"."applied_at" IS NULL OR "changeset"."classification" = 'safe_automatic')
);
--> statement-breakpoint
CREATE TABLE "changeset_effect" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"changeset_id" uuid NOT NULL,
	"dependent_kind" text NOT NULL,
	"dependent_id" uuid NOT NULL,
	"effect" "changeset_effect_kind" NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "changeset" ADD CONSTRAINT "changeset_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "changeset" ADD CONSTRAINT "changeset_classified_by_auth_user_id_fk" FOREIGN KEY ("classified_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "changeset" ADD CONSTRAINT "changeset_applied_by_auth_user_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "changeset" ADD CONSTRAINT "changeset_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "changeset_effect" ADD CONSTRAINT "changeset_effect_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "changeset_household_id_key" ON "changeset" USING btree ("household_id","id");
--> statement-breakpoint
ALTER TABLE "changeset_effect" ADD CONSTRAINT "changeset_effect_same_household_fk" FOREIGN KEY ("household_id","changeset_id") REFERENCES "public"."changeset"("household_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "changeset_household_idx" ON "changeset" USING btree ("household_id","classification");
--> statement-breakpoint
CREATE UNIQUE INDEX "changeset_effect_once_per_dependent" ON "changeset_effect" USING btree ("changeset_id","dependent_kind","dependent_id");
--> statement-breakpoint
CREATE INDEX "changeset_effect_household_idx" ON "changeset_effect" USING btree ("household_id","effect");
