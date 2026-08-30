-- 0059: G-111 paid time, ADOPTED by founder ruling 30 August 2026.
-- Non-household paid time gets a category and a nullable household subject
-- on time_entry, the ONE table where nullability is permitted: it is a
-- payroll record, not a household record, and the tenant invariant on every
-- other household_id is untouched.
--
-- PRODUCER, PER COLUMN/VALUE (the G-85 rule):
--   household_id (made nullable): the NOT NULL half is written by logTime
--     (actions.ts) and the visit-close sink (visit-command-store.ts), both
--     of which always set it. The NULL half has NO PRODUCER YET; the
--     non-household capture surface is its own session. Schema ahead of its
--     writer, deliberately.
--   team_meeting / playbook_maintenance / onboarding_visit / shadow_visit:
--     NO PRODUCER YET, same session. The names are WK-SOP-017's own list,
--     verbatim; nothing here invents a vocabulary.
--
-- READ BEFORE APPLYING (the 0058 lesson): the four ADD VALUEs precede the
-- CHECK, and the CHECK deliberately compares category::text to TEXT
-- literals rather than enum literals, because a value added by ALTER TYPE
-- cannot be USED as an enum literal in the same transaction. Regenerating
-- this file keeps that property only because the schema source writes the
-- CHECK with ::text; do not "simplify" it to enum literals.
--
-- PRECONDITION the CHECK's apply-time validation rests on: no row exists
-- with category in the person-scoped set and a household attached, and no
-- household-scoped row lacks one. Locally verified by query (delivery,
-- travel, admin only, all with household); production's 29 August census
-- read delivery/travel/intake/admin only, all household-scoped, zero
-- training rows. If a violating row has appeared since, this ALTER fails
-- atomically and applies nothing, which is the correct refusal.
--
-- The counsel-directed erasure DELETE (erase-household.mjs) is keyed
-- WHERE household_id = $1, so a null-household wage row is UNREACHABLE by
-- it BY CONSTRUCTION: the four-year WK-SOP-017 retention obligation is
-- protected by the shape, not by a rule someone remembers.
ALTER TYPE "public"."time_category" ADD VALUE 'team_meeting';--> statement-breakpoint
ALTER TYPE "public"."time_category" ADD VALUE 'playbook_maintenance';--> statement-breakpoint
ALTER TYPE "public"."time_category" ADD VALUE 'onboarding_visit';--> statement-breakpoint
ALTER TYPE "public"."time_category" ADD VALUE 'shadow_visit';--> statement-breakpoint
ALTER TABLE "time_entry" ALTER COLUMN "household_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_subject_shape" CHECK (("time_entry"."household_id" IS NOT NULL AND "time_entry"."category"::text IN ('delivery','travel','intake','admin'))
     OR ("time_entry"."household_id" IS NULL AND "time_entry"."category"::text IN ('training','team_meeting','playbook_maintenance','onboarding_visit','shadow_visit')));