CREATE TABLE "time_segment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"derived_from" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"recorded_by" text,
	CONSTRAINT "time_segment_kind_known" CHECK ("time_segment"."kind" IN ('access','setup','active','movement','dwell','waiting','remote','documentation','travel')),
	CONSTRAINT "time_segment_source_known" CHECK ("time_segment"."source" IN ('derived_taps','derived_close_flow','derived_travel','hom_refinement')),
	CONSTRAINT "time_segment_window_ordered" CHECK ("time_segment"."ended_at" > "time_segment"."started_at"),
	CONSTRAINT "time_segment_person_is_whole" CHECK (("time_segment"."source" = 'hom_refinement' AND "time_segment"."recorded_by" IS NOT NULL) OR ("time_segment"."source" <> 'hom_refinement' AND "time_segment"."recorded_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "time_segment" ADD CONSTRAINT "time_segment_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_segment" ADD CONSTRAINT "time_segment_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_segment_household_idx" ON "time_segment" USING btree ("household_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "time_segment_derived_once" ON "time_segment" USING btree ("derived_from","kind","source") WHERE source <> 'hom_refinement';