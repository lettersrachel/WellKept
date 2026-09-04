-- 0062: Q-1 mail_outcome (Part C ruling, 4 September 2026: Q-1's single
-- migration; the package row claiming "none" was corrected in the re-cut
-- queue). Deliverability outcomes from the mail provider's webhooks: one
-- row per provider event, so a bounced client report or a spam complaint
-- is a record corporate can see instead of a silent nothing.
--
-- PRODUCER, PER COLUMN (the G-85 rule): every column is written by ONE
-- producer, the /api/webhooks/resend route (apps/web), in this same PR,
-- after Svix-scheme signature verification. No other write path exists.
--   provider_event_id: the svix delivery id, the dedupe key (unique).
--   kind: the provider's event type VERBATIM (email.bounced, ...). No
--     CHECK deliberately: a vendor's vocabulary grows on the vendor's
--     schedule, and an evidence table stores what arrived rather than
--     refusing tomorrow's real event. Not a founder taxonomy; not ours.
--   recipient, message_id, payload, occurred_at: copied from the
--     verified event body; the payload is the row's own provenance.
--   household_id: resolved by the route from the recipient's client
--     assignment; NULL for staff mail, sign-in links, and ambiguous
--     addresses. Nullable BY DESIGN, the 0059 precedent.
--
-- Erasure: DELETE, the TENTH documented exception (reason in
-- erase-household.mjs's own header, same PR): delivery plumbing whose
-- payload carries the household's name in a subject line and the
-- member's address; the notification / event_outbox class, no
-- business-record claim.
--
-- READ before applying: purely additive (one CREATE TABLE, one FK, three
-- indexes, in that order, nothing the old build cannot ignore). No
-- precondition on data state: the table starts empty.
CREATE TABLE "mail_outcome" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_event_id" text NOT NULL,
	"kind" text NOT NULL,
	"recipient" text NOT NULL,
	"message_id" text,
	"household_id" uuid,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mail_outcome" ADD CONSTRAINT "mail_outcome_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_outcome_provider_event_unique" ON "mail_outcome" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "mail_outcome_household_idx" ON "mail_outcome" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "mail_outcome_kind_idx" ON "mail_outcome" USING btree ("kind","created_at");