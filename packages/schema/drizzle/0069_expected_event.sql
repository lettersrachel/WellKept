-- 0069  expected_event  ·  Q-12b-1  ·  reconciliation, year-two, SHADOW
--
-- Spec: intake BENCHMARK_ADOPTION section 2 (verified@Q-0b, frozen);
-- RFC-ATTR-01 Amendment 1 section A1.3 ("Absent; new migration required").
--
-- READ BEFORE APPLYING, per the standing rule. Purely additive: three
-- CREATE TYPE, one CREATE TABLE, three FKs, two indexes. No DROP, no
-- ALTER COLUMN, no RENAME, nothing made NOT NULL on an existing table.
-- NO BACKFILL IS NEEDED because no existing row is in scope: the table
-- is new and every CHECK is satisfied by construction on an empty table.
-- The composite FK references event_outbox (household_id, id), whose
-- unique index `event_outbox_household_id_key` was created by 0063 and
-- was confirmed present in the database BEFORE this file was applied, so
-- the 0058 ordering hazard (an FK emitted ahead of the index it needs)
-- does not arise here. Statement order as generated is correct.
--
-- THE SIX LAUNCH PATTERNS: the enum keys are minted, and each is written
-- here beside the spec sentence it transcribes, so the key is the
-- identifier and the sentence stays the display text (the pack_key
-- lesson). A seventh pattern is a founder decision, not an addition.
--   vendor_visit_without_invoice_or_report  <- "vendor visit without invoice or report"
--   registration_without_confirmation       <- "registration without confirmation"
--   cancellation_confirmed_then_charged_again <- "cancellation confirmed then charged again"
--   return_shipped_without_refund           <- "return shipped without refund"
--   promised_estimate_overdue               <- "promised estimate overdue"
--   annual_school_cycle_packet_missing      <- "annual school-cycle packet missing"
--
-- PRODUCER, PER COLUMN (G-85). Not per migration, and not in the future
-- tense: "what the form will write" reads as a design note afterwards.
--   household_id            written by recordExpectedEvent (corporate action, /oversight drill-in)
--   pattern                 written by recordExpectedEvent
--   expectation             written by recordExpectedEvent
--   expected_by             written by recordExpectedEvent
--   materiality             written by recordExpectedEvent; NULL when the operator did not classify it
--   amount_cents            written by recordExpectedEvent; NULL is the honest unknown
--   decision_right_key      written by recordExpectedEvent; the caller names the right, verbatim
--   reconciliation_status   written by sweepExpectedEvents (trigger-engine); NULL until the window passes
--   reconciled_at           written by sweepExpectedEvents
--   candidate_decision      written by sweepExpectedEvents, in words, carrying no person
--   candidate_routing       written by sweepExpectedEvents from routeCandidateByMateriality
--   candidate_routing_why   written by sweepExpectedEvents
--   recorded_by             written by recordExpectedEvent (write provenance)
--   matched_event_id        NO PRODUCER YET. Nothing in this tree emits a signal that
--                           MATCHES an expectation: matching an outbox event to an
--                           expectation is pattern-specific and is Q-12b-2's changeset
--                           work. The column and its composite FK ship so the match
--                           lands without a migration, and `matched` is therefore a
--                           status the sweep never writes today. Stated rather than
--                           left to be discovered on a green CI summary.
--
-- SHADOW, concretely: this computes, logs and shows in the corporate
-- portal. It writes nothing into attention_record (those reach the
-- previsit brief) and nothing into any member-reaching channel. The
-- spec's "the household is never made to check" is held structurally:
-- this table has no audience column, and decision_record's audience
-- CHECK admits only hom / corporate / founder.

CREATE TYPE "public"."candidate_routing" AS ENUM('auto_execute', 'propose', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."expected_event_pattern" AS ENUM('vendor_visit_without_invoice_or_report', 'registration_without_confirmation', 'cancellation_confirmed_then_charged_again', 'return_shipped_without_refund', 'promised_estimate_overdue', 'annual_school_cycle_packet_missing');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('matched', 'missing_expected', 'unexpected', 'changed', 'conflicting', 'stale', 'cannot_determine');--> statement-breakpoint
CREATE TABLE "expected_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"pattern" "expected_event_pattern" NOT NULL,
	"expectation" text NOT NULL,
	"expected_by" timestamp with time zone NOT NULL,
	"materiality" "materiality",
	"amount_cents" integer,
	"decision_right_key" text,
	"reconciliation_status" "reconciliation_status",
	"reconciled_at" timestamp with time zone,
	"matched_event_id" uuid,
	"candidate_decision" text,
	"candidate_routing" "candidate_routing",
	"candidate_routing_why" text,
	"recorded_by" text NOT NULL,
	CONSTRAINT "expected_event_reconciliation_is_whole" CHECK (("expected_event"."reconciliation_status" IS NULL AND "expected_event"."reconciled_at" IS NULL)
        OR ("expected_event"."reconciliation_status" IS NOT NULL AND "expected_event"."reconciled_at" IS NOT NULL)),
	CONSTRAINT "expected_event_matched_carries_its_event" CHECK ("expected_event"."reconciliation_status" IS DISTINCT FROM 'matched' OR "expected_event"."matched_event_id" IS NOT NULL),
	CONSTRAINT "expected_event_candidate_is_whole" CHECK (("expected_event"."candidate_decision" IS NULL AND "expected_event"."candidate_routing" IS NULL AND "expected_event"."candidate_routing_why" IS NULL)
        OR ("expected_event"."candidate_decision" IS NOT NULL AND "expected_event"."candidate_routing" IS NOT NULL AND "expected_event"."candidate_routing_why" IS NOT NULL)),
	CONSTRAINT "expected_event_amount_is_not_negative" CHECK ("expected_event"."amount_cents" IS NULL OR "expected_event"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "expected_event" ADD CONSTRAINT "expected_event_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expected_event" ADD CONSTRAINT "expected_event_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expected_event" ADD CONSTRAINT "expected_event_matched_event_same_household_fk" FOREIGN KEY ("household_id","matched_event_id") REFERENCES "public"."event_outbox"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expected_event_household_idx" ON "expected_event" USING btree ("household_id","reconciliation_status");--> statement-breakpoint
CREATE INDEX "expected_event_window_idx" ON "expected_event" USING btree ("expected_by","reconciliation_status");