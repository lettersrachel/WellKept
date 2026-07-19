CREATE TABLE "visit_photo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"data" text NOT NULL,
	"bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visit_photo_household_idx" ON "visit_photo" USING btree ("household_id");