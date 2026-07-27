ALTER TABLE "registry_entry" ADD COLUMN "installed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "lifespan_months" integer;--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "maintenance_interval_months" integer;--> statement-breakpoint
ALTER TABLE "registry_entry" ADD COLUMN "last_serviced_at" timestamp with time zone;