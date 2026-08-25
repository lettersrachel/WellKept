CREATE TYPE "public"."work_item_status" AS ENUM('open', 'blocked', 'done', 'abandoned');--> statement-breakpoint
CREATE TABLE "work_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"owner_id" text,
	"sensitivity" "sensitivity" DEFAULT 's2' NOT NULL,
	"due_date" date,
	"window_condition" text,
	"depends_on" jsonb,
	"status" "work_item_status" DEFAULT 'open' NOT NULL,
	"blocked_reason" text,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "work_item_kind_known" CHECK ("work_item"."kind" IN ('vendor','followup','runway','internal')),
	CONSTRAINT "work_item_source_known" CHECK ("work_item"."source" IN ('hm_capture','corporate','system')),
	CONSTRAINT "work_item_block_is_reasoned" CHECK ("work_item"."status" <> 'blocked' OR "work_item"."blocked_reason" IS NOT NULL),
	CONSTRAINT "work_item_resolution_is_whole" CHECK (("work_item"."status" IN ('done','abandoned') AND "work_item"."resolution" IS NOT NULL AND "work_item"."resolved_at" IS NOT NULL AND "work_item"."resolved_by" IS NOT NULL) OR ("work_item"."status" NOT IN ('done','abandoned') AND "work_item"."resolution" IS NULL AND "work_item"."resolved_at" IS NULL AND "work_item"."resolved_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "work_item" ADD CONSTRAINT "work_item_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item" ADD CONSTRAINT "work_item_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item" ADD CONSTRAINT "work_item_resolved_by_auth_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_item_household_idx" ON "work_item" USING btree ("household_id","status");