-- Q-6-2: the Commitment Ledger, with the Handled invariant as the
-- definition of closed. Four-Stage Application Spec (stamped
-- plan-of-record) plus the Handled invariant as adopted in CLAUDE.md.
-- Second half of the Q-6 split, one migration each; 0066 built the
-- routing TABLE and this one builds what routes into it.
--
-- THE RESERVED DECISION IS ANSWERED AS OPTION 2, a new ledger rather
-- than a new audience on `decision_record`, under the founder's
-- pre-committed tiebreak of 4 September. Both options are set out in
-- docs/sessions/2026-09-05_Q-6-2.md. The sharpest fact behind the call:
-- `decision_record.authority_class` is the COMPANY's A0..A5 ladder and a
-- household deciding its own affairs is not on a rung of it, so a member
-- row would carry a class that does not apply or need a null the CHECK
-- forbids. `decision_record` is untouched by this migration.
--
-- PRODUCER PER COLUMN (G-85). Every column below has a writer in this
-- same session; nothing ships inert.
--
--   household_id, title           WRITTEN BY recordCommitment
--   stage, recorded_by            (apps/web/src/lib/actions.ts)
--   accountable_owner             WRITTEN BY assignCommitmentOwner
--   member_decision_question      WRITTEN BY askMemberDecision. The ASK is
--   member_decision_asked_at      recorded corporate-side; DELIVERING it to
--                                 a member is freeze-gated and not built.
--   member_decision_resolved_at   WRITTEN BY resolveMemberDecision, which
--   member_decision_resolved_by   records the member's answer as relayed.
--                                 The member's own path is freeze-gated.
--   external_completion_on        WRITTEN BY setCommitmentFollowUp
--   follow_up_at
--   verified_at                   WRITTEN BY verifyCommitment
--   verification_pending_reason
--   closed_at, closed_by          WRITTEN BY closeCommitment
--   close_note
--
-- THE HANDLED INVARIANT IS A CHECK, not a rendering rule. A row cannot
-- be closed while an accountable owner is missing, a required member
-- decision is unresolved, an external completion is pending with no
-- follow-up, or verification is neither satisfied nor explicitly
-- pending. Adopted law that lives only in a service layer is a
-- convention; here the database refuses.
--
-- `handled` ITSELF IS NOT A COLUMN. It is computed from the four clauses
-- wherever it is needed, for the reason time_segment's duration is
-- computed rather than stored: a stored answer and its inputs drift, and
-- the drift is silent. The same holds for the four display states and
-- for M-25.
--
-- ACTIVITY IS NEVER CLOSURE, so there is deliberately no column for
-- "vendor contacted" or "email sent". Those are events and the outbox
-- already carries them.
--
-- EXTERNAL COMPLETION IS RECORDED IN WORDS rather than as a boolean. A
-- boolean asserting "something external is pending" is a claim with no
-- content, and NULL then says plainly that nothing waits on anyone
-- outside. VERIFICATION IS TWO COLUMNS rather than a status enum for the
-- same reason: "explicitly pending" has to carry its reason and cannot
-- be a word somebody selected from a list.
--
-- `stage` IS NULLABLE WITH NO DEFAULT, per the 0065 rule, and this
-- migration is where 0065's open producer question for `work_item.stage`
-- was answered by ruling: an item carries the stage of the DECISION that
-- produced it, and NULL when it was HOM-captured or corporate-authored
-- with no upstream decision.
--
-- FREEZE POSTURE (WK-DEV-007, Part C section 2.2): no member surface
-- ships and none is built behind a flag. The member decision inbox is
-- the freeze-gated half of Q-6 and waits for the 25 September two-key
-- decision. No client projection exists, so any recognizable ledger row
-- in a client payload is a violation.
--
-- READ BEFORE APPLYING (the standing rule): drizzle-kit emitted the
-- table with its four CHECKs inline, then five foreign keys, then two
-- indexes. Every FK references a PRIMARY KEY on a table that already
-- exists, so unlike 0058 and 0063 there is no
-- composite-key-before-its-index hazard and no reorder was needed.
-- Purely additive: one new table, nothing altered, no new type.

CREATE TABLE "commitment_ledger_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"stage" "pipeline_stage",
	"accountable_owner" text,
	"member_decision_question" text,
	"member_decision_asked_at" timestamp with time zone,
	"member_decision_resolved_at" timestamp with time zone,
	"member_decision_resolved_by" text,
	"external_completion_on" text,
	"follow_up_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verification_pending_reason" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"close_note" text,
	"recorded_by" text NOT NULL,
	CONSTRAINT "commitment_ledger_item_member_decision_is_whole" CHECK (("commitment_ledger_item"."member_decision_question" IS NULL AND "commitment_ledger_item"."member_decision_asked_at" IS NULL AND "commitment_ledger_item"."member_decision_resolved_at" IS NULL AND "commitment_ledger_item"."member_decision_resolved_by" IS NULL)
        OR ("commitment_ledger_item"."member_decision_question" IS NOT NULL AND "commitment_ledger_item"."member_decision_asked_at" IS NOT NULL
            AND (("commitment_ledger_item"."member_decision_resolved_at" IS NULL AND "commitment_ledger_item"."member_decision_resolved_by" IS NULL)
              OR ("commitment_ledger_item"."member_decision_resolved_at" IS NOT NULL AND "commitment_ledger_item"."member_decision_resolved_by" IS NOT NULL)))),
	CONSTRAINT "commitment_ledger_item_verification_is_one_shape" CHECK (NOT ("commitment_ledger_item"."verified_at" IS NOT NULL AND "commitment_ledger_item"."verification_pending_reason" IS NOT NULL)),
	CONSTRAINT "commitment_ledger_item_close_is_whole" CHECK (("commitment_ledger_item"."closed_at" IS NULL AND "commitment_ledger_item"."closed_by" IS NULL) OR ("commitment_ledger_item"."closed_at" IS NOT NULL AND "commitment_ledger_item"."closed_by" IS NOT NULL)),
	CONSTRAINT "commitment_ledger_item_closed_only_when_handled" CHECK ("commitment_ledger_item"."closed_at" IS NULL OR (
          "commitment_ledger_item"."accountable_owner" IS NOT NULL
      AND ("commitment_ledger_item"."member_decision_question" IS NULL OR "commitment_ledger_item"."member_decision_resolved_at" IS NOT NULL)
      AND ("commitment_ledger_item"."external_completion_on" IS NULL OR "commitment_ledger_item"."follow_up_at" IS NOT NULL)
      AND ("commitment_ledger_item"."verified_at" IS NOT NULL OR "commitment_ledger_item"."verification_pending_reason" IS NOT NULL)
    ))
);
--> statement-breakpoint
ALTER TABLE "commitment_ledger_item" ADD CONSTRAINT "commitment_ledger_item_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_ledger_item" ADD CONSTRAINT "commitment_ledger_item_accountable_owner_auth_user_id_fk" FOREIGN KEY ("accountable_owner") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_ledger_item" ADD CONSTRAINT "commitment_ledger_item_member_decision_resolved_by_auth_user_id_fk" FOREIGN KEY ("member_decision_resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_ledger_item" ADD CONSTRAINT "commitment_ledger_item_closed_by_auth_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_ledger_item" ADD CONSTRAINT "commitment_ledger_item_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commitment_ledger_item_household_idx" ON "commitment_ledger_item" USING btree ("household_id","closed_at");--> statement-breakpoint
CREATE INDEX "commitment_ledger_item_asked_idx" ON "commitment_ledger_item" USING btree ("household_id","member_decision_asked_at");