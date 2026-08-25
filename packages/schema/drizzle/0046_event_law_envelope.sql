ALTER TABLE "event_outbox" ADD COLUMN "event_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD COLUMN "correlation_id" uuid;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD COLUMN "object_id" uuid;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD COLUMN "actor" text;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD COLUMN "sensitivity" "sensitivity" DEFAULT 's1' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD COLUMN "provenance" text DEFAULT 'pre_event_law' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_actor_auth_user_id_fk" FOREIGN KEY ("actor") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;