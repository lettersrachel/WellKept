CREATE TYPE "public"."cost_category" AS ENUM('supplies', 'materials', 'mileage', 'other');--> statement-breakpoint
CREATE TABLE "cost_entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"category" "cost_category" NOT NULL,
	"amount_cents" integer NOT NULL,
	"incurred_on" date NOT NULL,
	"recorded_by" text NOT NULL,
	"miles" integer,
	"note" text,
	"receipt_photo_id" uuid
);
--> statement-breakpoint
ALTER TABLE "cost_entry" ADD CONSTRAINT "cost_entry_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cost_entry_household_incurred_idx" ON "cost_entry" USING btree ("household_id","incurred_on");