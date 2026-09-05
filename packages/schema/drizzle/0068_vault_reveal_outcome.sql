-- Q-11l: the vault reveal's outcome becomes a CLOSED, TYPED vocabulary.
-- Founder ruling 5 September 2026 (docs/FOUNDER_RULINGS_2026-09-05_G53_G13.md),
-- on G-53.
--
-- THE ROW'S PREMISE WAS STALE AND THE CORRECTION IS RECORDED RATHER THAN
-- SILENTLY OUTGROWN. G-53 and the queue row both read as though the reveal
-- records only the attempt. It has recorded an outcome since commit 42176a9
-- earlier in this run, as a SECOND audit_event of kind `s3_reveal_outcome`.
-- What was actually wrong was three things: the vocabulary was not the ruled
-- one, `denied` had no producer at all, and nothing closed the set.
--
-- PRODUCER PER COLUMN (G-85):
--
--   reveal_outcome   WRITTEN BY apps/web/src/app/api/reveal/route.ts, on every
--                    path that resolves a reveal: `delivered` when the value
--                    was returned, `not_found` when no vault item existed,
--                    `failed` when the decrypt threw, and `denied` on the
--                    authorization refusal, which is NEW here and is the
--                    reason this is more than a rename.
--
-- WHY FOUR VALUES, kept beside the enum in tables.ts as the ruling instructs
-- and summarised here: "who viewed this" is asked by counsel and by members,
-- so the answer must separate someone who SAW a value from someone who tried
-- and got nothing, and separate a refusal from a broken record. Collapsing
-- not_found into failed hides a data-integrity problem inside an access log;
-- collapsing denied into either makes a refusal look like an error.
--
-- THE CHECK IS WHAT CLOSES THE SET. Before this the outcome lived in `detail`
-- jsonb, where a fifth value was one keystroke and nothing objected. The
-- constraint ties the column to the kind in both directions: an
-- `s3_reveal_outcome` row must carry a typed outcome, and no other row may
-- carry one. An outcome row with no outcome would otherwise read exactly like
-- the attempt row it exists to resolve.
--
-- AN AUTHORIZATION REFUSAL PREVIOUSLY LEFT NO TRACE AT ALL. `route.ts` returned
-- 403 before writing anything, so the trail could say who attempted and never
-- who was turned away. A `denied` row stands ALONE, with no attempt row before
-- it, and that is correct rather than an asymmetry: no decryption was
-- attempted, so there is nothing to have attempted. The audit invariant is
-- untouched, because it governs the path where a value is about to be
-- decrypted.
--
-- THE BACKFILL IS A MAPPING, NOT A RENAME OF MEANING. The three provisional
-- values map onto the ruled ones with their meanings intact:
-- delivered -> delivered, no_vault_item -> not_found, decrypt_failed -> failed.
-- A row whose `detail.outcome` is absent or unrecognised maps to NULL and the
-- CHECK then REFUSES THE WHOLE MIGRATION atomically, which is the intended
-- failure: it says a row exists that nobody can classify, rather than
-- classifying it by guess.
--
-- PRECONDITION, to be read against production BEFORE applying:
--   SELECT coalesce(detail->>'outcome','(absent)') AS v, count(*)
--     FROM audit_event WHERE kind = 's3_reveal_outcome' GROUP BY 1;
-- Zero rows locally at authoring time. Every value returned must be one of the
-- three mapped above, or the migration will refuse.
--
-- READ BEFORE APPLYING (the standing rule): drizzle-kit emitted CREATE TYPE,
-- then ADD COLUMN, then ADD CONSTRAINT, which is the order Postgres requires.
-- The backfill is inserted BY HAND between the column and the constraint,
-- because a constraint added before the rows are classified would refuse rows
-- this migration is about to fix. Regenerating undoes that; do not regenerate.
-- Purely additive to the schema: one new type, one new nullable column, one
-- new CHECK, nothing dropped or altered.

CREATE TYPE "public"."vault_reveal_outcome" AS ENUM('delivered', 'denied', 'not_found', 'failed');--> statement-breakpoint
ALTER TABLE "audit_event" ADD COLUMN "reveal_outcome" "vault_reveal_outcome";--> statement-breakpoint
UPDATE "audit_event" SET "reveal_outcome" = CASE "detail"->>'outcome'
  WHEN 'delivered' THEN 'delivered'
  WHEN 'no_vault_item' THEN 'not_found'
  WHEN 'decrypt_failed' THEN 'failed'
END::"public"."vault_reveal_outcome"
WHERE "kind" = 's3_reveal_outcome';
--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_reveal_outcome_belongs_to_its_kind" CHECK (("audit_event"."kind" = 's3_reveal_outcome') = ("audit_event"."reveal_outcome" IS NOT NULL));