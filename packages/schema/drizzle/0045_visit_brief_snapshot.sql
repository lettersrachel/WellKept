CREATE TABLE "visit_brief_snapshot" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"briefed_user" text NOT NULL,
	"role" text NOT NULL,
	"stranger_mode" boolean DEFAULT false NOT NULL,
	"content_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "visit_brief_snapshot_role_known" CHECK ("visit_brief_snapshot"."role" IN ('house_manager','backup_hm','corporate_admin'))
);
--> statement-breakpoint
ALTER TABLE "visit_brief_snapshot" ADD CONSTRAINT "visit_brief_snapshot_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_brief_snapshot" ADD CONSTRAINT "visit_brief_snapshot_briefed_user_auth_user_id_fk" FOREIGN KEY ("briefed_user") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_brief_snapshot_household_idx" ON "visit_brief_snapshot" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "visit_brief_snapshot_distinct_content" ON "visit_brief_snapshot" USING btree ("household_id","briefed_user","stranger_mode","content_hash");