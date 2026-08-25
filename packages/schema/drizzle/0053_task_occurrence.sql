CREATE TABLE "task_occurrence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"work_requirement_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"outcome" text NOT NULL,
	"actual_minutes" integer,
	"variance_note" text,
	"recorded_by" text NOT NULL,
	CONSTRAINT "task_occurrence_outcome_known" CHECK ("task_occurrence"."outcome" IN ('as_expected','exception')),
	CONSTRAINT "task_occurrence_zero_is_not_unknown" CHECK ("task_occurrence"."actual_minutes" IS NULL OR "task_occurrence"."actual_minutes" > 0),
	CONSTRAINT "task_occurrence_variance_is_whole" CHECK (("task_occurrence"."outcome" = 'exception' AND "task_occurrence"."variance_note" IS NOT NULL) OR ("task_occurrence"."outcome" <> 'exception' AND "task_occurrence"."variance_note" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "task_occurrence" ADD CONSTRAINT "task_occurrence_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_occurrence" ADD CONSTRAINT "task_occurrence_work_requirement_id_work_requirement_id_fk" FOREIGN KEY ("work_requirement_id") REFERENCES "public"."work_requirement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_occurrence" ADD CONSTRAINT "task_occurrence_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_occurrence_requirement_idx" ON "task_occurrence" USING btree ("work_requirement_id","occurred_on");