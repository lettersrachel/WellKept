CREATE TYPE "public"."membership_event_kind" AS ENUM('start', 'tier_change', 'pause', 'resume', 'cancel');--> statement-breakpoint
CREATE TYPE "public"."referral_source" AS ENUM('client_referral', 'professional_referral', 'personal_network', 'community', 'press_or_search', 'other');--> statement-breakpoint
CREATE TABLE "membership_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" "membership_event_kind" NOT NULL,
	"effective_on" date NOT NULL,
	"tier" "tier",
	"price_cents" integer,
	"reason" text,
	"initiated_by" text,
	"recorded_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "referral_source" "referral_source";--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "referral_note" text;--> statement-breakpoint
ALTER TABLE "membership_event" ADD CONSTRAINT "membership_event_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_event_household_idx" ON "membership_event" USING btree ("household_id","effective_on");