CREATE TYPE "public"."provision_kind" AS ENUM('rule', 'table_row', 'callout');--> statement-breakpoint
CREATE TYPE "public"."provision_tier" AS ENUM('floor_1', 'floor_2', 'process', 'method', 'preference');--> statement-breakpoint
CREATE TABLE "provision_version" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provision_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"effective_date" date NOT NULL,
	"actor_user" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standard_provision" (
	"id" text PRIMARY KEY NOT NULL,
	"document" text NOT NULL,
	"section" integer NOT NULL,
	"ordinal" integer NOT NULL,
	"text" text NOT NULL,
	"tier" "provision_tier" NOT NULL,
	"scope" text[] NOT NULL,
	"kind" "provision_kind" NOT NULL,
	"membership_tier_gate" "tier",
	"overridable" boolean GENERATED ALWAYS AS (tier not in ('floor_1', 'floor_2')) STORED NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_date" date NOT NULL,
	"superseded_by" text,
	"source_note" text,
	"pilot_default" boolean DEFAULT false NOT NULL,
	"review_date" date,
	"tombstoned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "provision_version_provision_version_unique" ON "provision_version" USING btree ("provision_id","version");--> statement-breakpoint
CREATE INDEX "standard_provision_document_idx" ON "standard_provision" USING btree ("document","section");--> statement-breakpoint
CREATE INDEX "standard_provision_tier_idx" ON "standard_provision" USING btree ("tier");