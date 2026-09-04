-- Q-6-1: the Decision Rights block. Four-Stage Application Spec section
-- 1 (stamped plan-of-record), split from Q-6 by founder ruling 4
-- September 2026 into two sessions of one migration each. This is the
-- routing TABLE; Q-6-2 reads it and proves the four routing directions.
-- NOTHING routes on it yet.
--
-- THE QUEUE ROW SAID "none" FOR THIS ITEM'S MIGRATION AND WAS WRONG.
-- Reported before building, per the authorization's own rule, and the
-- census is why: no table carries a Commitment Ledger; decision_record
-- is one routed choice with no accountable-owner, member-decision or
-- verification state, so the Handled invariant's clauses have nowhere
-- to live; and NO table carries a spend ceiling of any kind, the only
-- money columns in the schema being records of what something cost
-- rather than limits on what may be spent without asking.
--
-- PRODUCER PER COLUMN (G-85), per column and not per table:
--
--   household_id, right_key   WRITTEN BY packages/schema/src/load-decision-rights.ts
--   value_cents, value_text   (`pnpm db:decision-rights`), which reads the
--   materiality, status       FROZEN values CSV rather than restating its
--   authority, note           figures in source. It is the only writer today.
--
--   confirmed_at              NO PRODUCER YET. Confirming a right is a
--   confirmed_by              corporate act that belongs with the ledger,
--                             because confirming one without a ledger to
--                             route into changes nothing. Both nullable
--                             with no default, per the rule added with
--                             0065: a column recording WHO SAID SOMETHING
--                             never carries a default, so a missing
--                             producer and a real answer look different in
--                             the data.
--
-- `status` is NOT NULL WITH NO DEFAULT for the same reason one step over:
-- a default would let a row become `recommended` without the loader
-- saying so, and recommended-versus-confirmed is exactly the distinction
-- this table exists to keep visible.
--
-- ZERO IS MEANINGFUL HERE, unlike estimate_snapshot, and the CHECK says
-- so: a ceiling of zero means spend nothing without asking, which is a
-- real instruction a household might give. The ABSENT ROW is the
-- unknown. Only a negative ceiling is refused. Recorded because the
-- neighbouring precedent points the other way and a later reader would
-- otherwise carry it across.
--
-- THE VALUE IS TWO COLUMNS, WHOLE OR ABSENT IN EXACTLY ONE SHAPE. The
-- seed rows carry two kinds of value and one column cannot hold both
-- honestly: a spend ceiling is money (integer cents, the standing rule)
-- and `approved_substitute_only` is a word. A single text column would
-- store "15000" beside a phrase and quietly lose the money rule.
--
-- THE TIER IS NOT STORED. The household carries its tier and the loader
-- reads it to choose a column. Storing it again would mean a tier change
-- silently rewrites rights the household may since have confirmed, which
-- is the wrong direction: these are the household's rights now, and a
-- tier change is a conversation rather than a migration.
--
-- FREEZE POSTURE (WK-DEV-007, Part C section 2.2): no member-facing
-- surface ships and none is built and hidden behind a flag. No client
-- projection exists at all, so any recognizable decision_right row in a
-- client payload is a violation, and assertNoAnticipationRows carries
-- that signature (the paused_decision posture).
--
-- READ BEFORE APPLYING (the standing rule): drizzle-kit emitted the two
-- CREATE TYPEs, then the table with its three CHECKs inline, then the two
-- foreign keys, then the indexes. Both FKs reference PRIMARY KEYs on
-- tables that already exist, so unlike 0058 and 0063 there is no
-- composite-key-before-its-index hazard and no reorder was needed.
-- Purely additive: two new types, one new table, nothing altered.

CREATE TYPE "public"."decision_right_status" AS ENUM('recommended', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."materiality" AS ENUM('safety_access', 'money_legal', 'convenience');--> statement-breakpoint
CREATE TABLE "decision_right" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"right_key" text NOT NULL,
	"value_cents" integer,
	"value_text" text,
	"materiality" "materiality",
	"status" "decision_right_status" NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text,
	"authority" text NOT NULL,
	"note" text,
	CONSTRAINT "decision_right_value_is_one_shape" CHECK (("decision_right"."value_cents" IS NOT NULL AND "decision_right"."value_text" IS NULL) OR ("decision_right"."value_cents" IS NULL AND "decision_right"."value_text" IS NOT NULL)),
	CONSTRAINT "decision_right_ceiling_is_not_negative" CHECK ("decision_right"."value_cents" IS NULL OR "decision_right"."value_cents" >= 0),
	CONSTRAINT "decision_right_confirmation_is_whole" CHECK (("decision_right"."status" = 'confirmed' AND "decision_right"."confirmed_at" IS NOT NULL AND "decision_right"."confirmed_by" IS NOT NULL) OR ("decision_right"."status" = 'recommended' AND "decision_right"."confirmed_at" IS NULL AND "decision_right"."confirmed_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "decision_right" ADD CONSTRAINT "decision_right_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_right" ADD CONSTRAINT "decision_right_confirmed_by_auth_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "decision_right_household_key_unique" ON "decision_right" USING btree ("household_id","right_key");--> statement-breakpoint
CREATE INDEX "decision_right_household_idx" ON "decision_right" USING btree ("household_id","status");