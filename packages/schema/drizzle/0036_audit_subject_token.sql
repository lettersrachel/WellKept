CREATE TABLE "audit_subject_token" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_subject_token_household_idx" ON "audit_subject_token" USING btree ("household_id");