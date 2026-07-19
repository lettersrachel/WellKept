CREATE TABLE "user_totp" (
	"user_id" text PRIMARY KEY NOT NULL,
	"secret_box" text NOT NULL,
	"wrapped_key" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_session" ADD COLUMN "mfa_satisfied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_totp" ADD CONSTRAINT "user_totp_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;