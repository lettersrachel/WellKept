CREATE TABLE "capture_artifact" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"captured_by" text NOT NULL,
	"visit_command_id" uuid,
	"extraction_status" text DEFAULT 'none' NOT NULL,
	"status" text DEFAULT 'captured' NOT NULL,
	"disposition" text,
	"work_item_id" uuid,
	"filed_at" timestamp with time zone,
	"filed_by" text,
	CONSTRAINT "capture_artifact_kind_known" CHECK ("capture_artifact"."kind" IN ('text','voice','photo','scan')),
	CONSTRAINT "capture_artifact_extraction_known" CHECK ("capture_artifact"."extraction_status" IN ('none','pending','extracted')),
	CONSTRAINT "capture_artifact_status_known" CHECK ("capture_artifact"."status" IN ('captured','filed','dismissed')),
	CONSTRAINT "capture_artifact_filing_is_whole" CHECK (("capture_artifact"."status" IN ('filed','dismissed') AND "capture_artifact"."disposition" IS NOT NULL AND "capture_artifact"."filed_at" IS NOT NULL AND "capture_artifact"."filed_by" IS NOT NULL) OR ("capture_artifact"."status" = 'captured' AND "capture_artifact"."disposition" IS NULL AND "capture_artifact"."filed_at" IS NULL AND "capture_artifact"."filed_by" IS NULL)),
	CONSTRAINT "capture_artifact_work_item_is_filed" CHECK ("capture_artifact"."work_item_id" IS NULL OR "capture_artifact"."status" = 'filed')
);
--> statement-breakpoint
ALTER TABLE "capture_artifact" ADD CONSTRAINT "capture_artifact_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_artifact" ADD CONSTRAINT "capture_artifact_captured_by_auth_user_id_fk" FOREIGN KEY ("captured_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_artifact" ADD CONSTRAINT "capture_artifact_work_item_id_work_item_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_artifact" ADD CONSTRAINT "capture_artifact_filed_by_auth_user_id_fk" FOREIGN KEY ("filed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capture_artifact_household_idx" ON "capture_artifact" USING btree ("household_id","status");