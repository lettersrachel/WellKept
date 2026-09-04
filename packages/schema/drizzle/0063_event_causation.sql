-- 0063: Q-3b, the domain-event catalog completion (RFC-ATTR-01
-- Amendment 1 A1.3, Ruling 2 section 4; the re-cut queue's Q-3b row).
-- causation_id joins the s4 envelope: correlation_id ties a chain,
-- causation_id names the direct parent event. The composite self-FK
-- (household_id, causation_id) -> (household_id, id) is the 0056
-- situation pattern turned inward: a cross-tenant causation link is
-- UNREPRESENTABLE. The unique index adds no constraint on data (id is
-- already the primary key); it is the referenceable key Postgres
-- requires.
--
-- PRODUCER, PER COLUMN (the G-85 rule):
--   causation_id: the emitOutboxEvent plumbing ships in this same PR
--     and the integration tests write it; NO PRODUCTION SITE passes a
--     non-null value yet. The first real producers are the Q-12b
--     reconciliation consumers. Schema ahead of its writer,
--     deliberately, stated here at the only moment the answer is known.
--
-- READ before applying, and REORDERED BY HAND: drizzle-kit emitted the
-- composite FK BEFORE the unique index it references, exactly the 0058
-- failure shape Postgres refuses ("there is no unique constraint
-- matching given keys"). The order below is column, index, FK.
-- Regenerating this file undoes the reorder; do not regenerate.
--
-- Erasure: unchanged. The one household-keyed DELETE removes parent and
-- child together, and FK enforcement is end-of-statement, proven in the
-- SQL suite rather than assumed.
ALTER TABLE "event_outbox" ADD COLUMN "causation_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "event_outbox_household_id_key" ON "event_outbox" USING btree ("household_id","id");--> statement-breakpoint
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_causation_same_household_fk" FOREIGN KEY ("household_id","causation_id") REFERENCES "public"."event_outbox"("household_id","id") ON DELETE no action ON UPDATE no action;
