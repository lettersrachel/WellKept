CREATE TYPE "public"."field_flag" AS ENUM('none', 'CRITICAL', 'CAUTION', 'DELIGHT');--> statement-breakpoint
CREATE TYPE "public"."provenance" AS ENUM('asked', 'observed', 'verified_by_touch', 'client_written', 'unconfirmed');--> statement-breakpoint
CREATE TYPE "public"."sensitivity" AS ENUM('s1', 's2', 's3');--> statement-breakpoint
CREATE TYPE "public"."status_tag" AS ENUM('ONBOARDING-90', 'STEADY', 'LIFE-EVENT', 'WATCH', 'RENEWAL-WINDOW', 'CHAMPION');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('essential', 'family_ops', 'concierge');--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"actor_user" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"kind" text NOT NULL,
	"field_id" uuid,
	"old_value_hash" text,
	"new_value_hash" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "client_edit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"proposed_value" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dot" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"verbatim" text NOT NULL,
	"heard_at" timestamp with time zone NOT NULL,
	"heard_by" uuid NOT NULL,
	"promoted_field_id" uuid
);
--> statement-breakpoint
CREATE TABLE "gesture" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"trigger_source" text NOT NULL,
	"idea" text NOT NULL,
	"cultural_fit_checked" boolean DEFAULT false NOT NULL,
	"hm_notified" boolean DEFAULT false NOT NULL,
	"executed_at" timestamp with time zone,
	"cost_cents" integer
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"tier" "tier" NOT NULL,
	"status_tag" "status_tag" DEFAULT 'ONBOARDING-90' NOT NULL,
	"is_nda" boolean DEFAULT false NOT NULL,
	"founding_rate_lock_until" timestamp with time zone,
	"membership_terms" jsonb,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "movable_observance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"date" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_field" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"section" integer NOT NULL,
	"name" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"sensitivity" "sensitivity" NOT NULL,
	"provenance" "provenance" DEFAULT 'unconfirmed' NOT NULL,
	"provenance_date" timestamp with time zone,
	"provenance_actor" uuid,
	"confirmed" boolean DEFAULT false NOT NULL,
	"flag" "field_flag" DEFAULT 'none' NOT NULL,
	"photo_refs" jsonb,
	"tombstoned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prompt_pack_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"trigger_rule_id" uuid NOT NULL,
	"pack_name" text NOT NULL,
	"item_text" text NOT NULL,
	"fire_at" timestamp with time zone NOT NULL,
	"fired_at" timestamp with time zone,
	"suppressed_by_tag" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stranger_test" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"covered_by" uuid NOT NULL,
	"friction_notes" jsonb NOT NULL,
	"passed" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trigger_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid,
	"family" text NOT NULL,
	"binds_to_field_name" text,
	"definition" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"ciphertext" text NOT NULL,
	"key_ref" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"hm_user" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"changes_noticed" text,
	"life_change_signal" boolean,
	"signal_detail" text,
	"zone_drift_notes" text DEFAULT '' NOT NULL,
	"report_sentence_1" text DEFAULT '' NOT NULL,
	"report_sentence_2" text DEFAULT '' NOT NULL,
	"report_sentence_3" text DEFAULT '' NOT NULL,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"sync_conflict" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_event_household_idx" ON "audit_event" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "client_edit_household_idx" ON "client_edit" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "dot_household_idx" ON "dot" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "gesture_household_idx" ON "gesture" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "playbook_field_household_idx" ON "playbook_field" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "playbook_field_section_idx" ON "playbook_field" USING btree ("household_id","section");--> statement-breakpoint
CREATE INDEX "prompt_pack_item_household_idx" ON "prompt_pack_item" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "vault_item_household_idx" ON "vault_item" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "visit_household_idx" ON "visit" USING btree ("household_id");