CREATE TABLE "estimate_snapshot" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"work_requirement_id" uuid NOT NULL,
	"estimated_minutes" integer,
	"basis" text NOT NULL,
	"estimated_by" text NOT NULL,
	CONSTRAINT "estimate_snapshot_zero_is_not_unknown" CHECK ("estimate_snapshot"."estimated_minutes" IS NULL OR "estimate_snapshot"."estimated_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "estimate_snapshot" ADD CONSTRAINT "estimate_snapshot_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_snapshot" ADD CONSTRAINT "estimate_snapshot_work_requirement_id_work_requirement_id_fk" FOREIGN KEY ("work_requirement_id") REFERENCES "public"."work_requirement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_snapshot" ADD CONSTRAINT "estimate_snapshot_estimated_by_auth_user_id_fk" FOREIGN KEY ("estimated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estimate_snapshot_requirement_idx" ON "estimate_snapshot" USING btree ("work_requirement_id","created_at");