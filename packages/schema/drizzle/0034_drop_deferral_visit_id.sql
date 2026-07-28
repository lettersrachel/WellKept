ALTER TABLE "deferral" DROP CONSTRAINT "deferral_visit_id_visit_id_fk";
--> statement-breakpoint
ALTER TABLE "deferral" DROP COLUMN "visit_id";