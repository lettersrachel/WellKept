CREATE TABLE "task_definition" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"provisional" boolean DEFAULT true NOT NULL,
	"canonical_task_id" text,
	"created_by" text NOT NULL,
	"tombstoned_at" timestamp with time zone,
	CONSTRAINT "task_definition_provisional_xor_canonical" CHECK (("task_definition"."provisional" = true AND "task_definition"."canonical_task_id" IS NULL) OR ("task_definition"."provisional" = false AND "task_definition"."canonical_task_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "task_definition" ADD CONSTRAINT "task_definition_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_definition_name_unique" ON "task_definition" USING btree ("name");