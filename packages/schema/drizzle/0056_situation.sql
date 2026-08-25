CREATE TABLE "situation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"label" text NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "situation_status_known" CHECK ("situation"."status" IN ('open','resolved')),
	CONSTRAINT "situation_resolution_is_whole" CHECK (("situation"."status" = 'resolved' AND "situation"."resolution" IS NOT NULL AND "situation"."resolved_at" IS NOT NULL AND "situation"."resolved_by" IS NOT NULL) OR ("situation"."status" <> 'resolved' AND "situation"."resolution" IS NULL AND "situation"."resolved_at" IS NULL AND "situation"."resolved_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "attention_record" ADD COLUMN "situation_id" uuid;--> statement-breakpoint
ALTER TABLE "situation" ADD CONSTRAINT "situation_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "situation" ADD CONSTRAINT "situation_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "situation" ADD CONSTRAINT "situation_resolved_by_auth_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "situation_household_idx" ON "situation" USING btree ("household_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "situation_household_id_key" ON "situation" USING btree ("household_id","id");--> statement-breakpoint
ALTER TABLE "attention_record" ADD CONSTRAINT "attention_record_situation_same_household_fk" FOREIGN KEY ("household_id","situation_id") REFERENCES "public"."situation"("household_id","id") ON DELETE no action ON UPDATE no action;