CREATE TABLE "app_setting_version" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"value" jsonb NOT NULL,
	"prior_value" jsonb,
	"set_by" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_setting_version" ADD CONSTRAINT "app_setting_version_set_by_auth_user_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_setting_version_key_version_unique" ON "app_setting_version" USING btree ("key","version");