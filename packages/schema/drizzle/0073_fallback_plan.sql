-- 0073  fallback_plan  ·  Q-12b-3  ·  reconciliation, year-two, SHADOW
--
-- Spec: RFC-ATTR-01 Amendment 1 section A1.3, which names the five values
-- verbatim and reads "Absent; new migration required".
--
-- READ BEFORE APPLYING. Purely additive: one CREATE TYPE, one CREATE
-- TABLE, two FKs, two indexes. No DROP, no ALTER COLUMN, no RENAME,
-- nothing made NOT NULL on an existing table. No backfill is needed: the
-- table is new, so every CHECK is satisfied by construction on an empty
-- table. No composite FK is emitted here, so the 0058 ordering hazard
-- does not arise; statement order as generated is correct.
--
-- BOTH CHECKS OVER THE NULLABLE `reached_step` USE `IS NOT DISTINCT
-- FROM`, NEVER `=`, and that is G-135 applied one table later on the same
-- day. A `=` comparison against a nullable column yields NULL, and a
-- CHECK passes on NULL, so the constraint would have accepted exactly the
-- rows it exists to refuse. The earlier instance cost a rollback and a
-- regeneration; this one cost a keystroke.
--
-- PRODUCER, PER COLUMN (G-85).
--   fallback_plan.household_id        written by recordFallbackPlan (corporate action, drill-in)
--   fallback_plan.choice              written by recordFallbackPlan, in the operator's words
--   fallback_plan.preferred_option    written by recordFallbackPlan; NULL means the household has
--                                     no such option, which is a real answer
--   fallback_plan.approved_substitute written by recordFallbackPlan
--   fallback_plan.established_backup  written by recordFallbackPlan
--   fallback_plan.vetted_bench        written by recordFallbackPlan
--   fallback_plan.decision_right_key  written by recordFallbackPlan; the caller names the right
--   fallback_plan.amount_cents        written by recordFallbackPlan; NULL is the honest unknown
--   fallback_plan.reached_step        written by evaluateFallbackPlan; NULL until evaluated, and
--                                     NULL is not a step
--   fallback_plan.reached_at          written by evaluateFallbackPlan
--   fallback_plan.reached_why         written by evaluateFallbackPlan
--   fallback_plan.recorded_by         written by recordFallbackPlan (write provenance)
--
-- THE LADDER'S ORDER IS THE VOCABULARY'S OWN and nothing here invents it.
-- Whether a household's ladder SKIPS a rung is a per-household question,
-- REPORTED on the queue row per the founder's instruction and not built.
--
-- NOTHING EXECUTES: reaching a step means the household's Decision Rights
-- PERMIT it, and no execution engine exists in this tree to act on that.

CREATE TYPE "public"."fallback_step" AS ENUM('preferred', 'approved_substitute', 'established_backup', 'vetted_bench', 'ask');--> statement-breakpoint
CREATE TABLE "fallback_plan" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"choice" text NOT NULL,
	"preferred_option" text,
	"approved_substitute" text,
	"established_backup" text,
	"vetted_bench" text,
	"decision_right_key" text,
	"amount_cents" integer,
	"reached_step" "fallback_step",
	"reached_at" timestamp with time zone,
	"reached_why" text,
	"recorded_by" text NOT NULL,
	CONSTRAINT "fallback_plan_evaluation_is_whole" CHECK (("fallback_plan"."reached_step" IS NULL AND "fallback_plan"."reached_at" IS NULL AND "fallback_plan"."reached_why" IS NULL)
        OR ("fallback_plan"."reached_step" IS NOT NULL AND "fallback_plan"."reached_at" IS NOT NULL AND "fallback_plan"."reached_why" IS NOT NULL)),
	CONSTRAINT "fallback_plan_reached_step_exists" CHECK ("fallback_plan"."reached_step" IS NULL
        OR "fallback_plan"."reached_step" IS NOT DISTINCT FROM 'ask'
        OR ("fallback_plan"."reached_step" IS NOT DISTINCT FROM 'preferred' AND "fallback_plan"."preferred_option" IS NOT NULL)
        OR ("fallback_plan"."reached_step" IS NOT DISTINCT FROM 'approved_substitute' AND "fallback_plan"."approved_substitute" IS NOT NULL)
        OR ("fallback_plan"."reached_step" IS NOT DISTINCT FROM 'established_backup' AND "fallback_plan"."established_backup" IS NOT NULL)
        OR ("fallback_plan"."reached_step" IS NOT DISTINCT FROM 'vetted_bench' AND "fallback_plan"."vetted_bench" IS NOT NULL)),
	CONSTRAINT "fallback_plan_amount_is_not_negative" CHECK ("fallback_plan"."amount_cents" IS NULL OR "fallback_plan"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "fallback_plan" ADD CONSTRAINT "fallback_plan_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fallback_plan" ADD CONSTRAINT "fallback_plan_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fallback_plan_household_idx" ON "fallback_plan" USING btree ("household_id","reached_step");--> statement-breakpoint
CREATE UNIQUE INDEX "fallback_plan_one_per_choice" ON "fallback_plan" USING btree ("household_id","choice");