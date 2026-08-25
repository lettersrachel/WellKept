CREATE TABLE "work_requirement" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"task_profile_id" uuid NOT NULL,
	"due_on" date,
	"context_window" text,
	"status" text DEFAULT 'generated' NOT NULL,
	"created_by" text NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	CONSTRAINT "work_requirement_has_timing" CHECK ("work_requirement"."due_on" IS NOT NULL OR "work_requirement"."context_window" IS NOT NULL),
	CONSTRAINT "work_requirement_status_known" CHECK ("work_requirement"."status" IN ('generated','activated','ready','scheduled','started','completed','verified','reopened','deferred')),
	CONSTRAINT "work_requirement_completion_is_whole" CHECK (("work_requirement"."status" IN ('completed','verified') AND "work_requirement"."completed_at" IS NOT NULL AND "work_requirement"."completed_by" IS NOT NULL) OR ("work_requirement"."status" NOT IN ('completed','verified') AND "work_requirement"."completed_at" IS NULL AND "work_requirement"."completed_by" IS NULL)),
	CONSTRAINT "work_requirement_verification_is_whole" CHECK (("work_requirement"."status" = 'verified' AND "work_requirement"."verified_at" IS NOT NULL AND "work_requirement"."verified_by" IS NOT NULL) OR ("work_requirement"."status" <> 'verified' AND "work_requirement"."verified_at" IS NULL AND "work_requirement"."verified_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "work_requirement" ADD CONSTRAINT "work_requirement_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_requirement" ADD CONSTRAINT "work_requirement_task_profile_id_household_task_profile_id_fk" FOREIGN KEY ("task_profile_id") REFERENCES "public"."household_task_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_requirement" ADD CONSTRAINT "work_requirement_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_requirement" ADD CONSTRAINT "work_requirement_completed_by_auth_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_requirement" ADD CONSTRAINT "work_requirement_verified_by_auth_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_requirement_household_idx" ON "work_requirement" USING btree ("household_id","status");