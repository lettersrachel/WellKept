CREATE TYPE "public"."decision_outcome" AS ENUM('accepted', 'declined');--> statement-breakpoint
CREATE TABLE "decision_record" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"question" text NOT NULL,
	"recommendation" text NOT NULL,
	"alternatives" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"authority_class" text NOT NULL,
	"audience" text NOT NULL,
	"work_item_id" uuid,
	"attention_record_id" uuid,
	"routed_by" text NOT NULL,
	"expires_at" timestamp with time zone,
	"outcome" "decision_outcome",
	"outcome_note" text,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"expired_at" timestamp with time zone,
	CONSTRAINT "decision_record_class_known" CHECK ("decision_record"."authority_class" IN ('A0','A1','A2','A3','A4','A5')),
	CONSTRAINT "decision_record_audience_known" CHECK ("decision_record"."audience" IN ('hom','corporate','founder')),
	CONSTRAINT "decision_record_outcome_is_whole" CHECK (("decision_record"."outcome" IS NOT NULL AND "decision_record"."decided_at" IS NOT NULL AND "decision_record"."decided_by" IS NOT NULL) OR ("decision_record"."outcome" IS NULL AND "decision_record"."decided_at" IS NULL AND "decision_record"."decided_by" IS NULL)),
	CONSTRAINT "decision_record_decided_xor_expired" CHECK (NOT ("decision_record"."outcome" IS NOT NULL AND "decision_record"."expired_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_work_item_id_work_item_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_attention_record_id_attention_record_id_fk" FOREIGN KEY ("attention_record_id") REFERENCES "public"."attention_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_routed_by_auth_user_id_fk" FOREIGN KEY ("routed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_decided_by_auth_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decision_record_household_idx" ON "decision_record" USING btree ("household_id");