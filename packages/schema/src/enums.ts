// implements REQ-002, REQ-010, REQ-012 enum vocabulary (WK-DEV-005 glossary)
import { z } from "zod";

export const sensitivitySchema = z.enum(["s1", "s2", "s3"]);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

export const roleSchema = z.enum([
  "client", "house_manager", "backup_hm",
  "corporate_ops", "corporate_admin", "cfo_readonly",
]);
export type Role = z.infer<typeof roleSchema>;

export const tierSchema = z.enum(["essential", "family_ops", "concierge"]);
export type Tier = z.infer<typeof tierSchema>;

export const statusTagSchema = z.enum([
  "ONBOARDING-90", "STEADY", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION",
]);
export type StatusTag = z.infer<typeof statusTagSchema>;

export const provenanceSchema = z.enum([
  "asked", "observed", "verified_by_touch", "client_written", "unconfirmed",
]);
export type Provenance = z.infer<typeof provenanceSchema>;

export const fieldFlagSchema = z.enum(["none", "CRITICAL", "CAUTION", "DELIGHT"]);
export type FieldFlag = z.infer<typeof fieldFlagSchema>;

/** N/A-confirmed is a VALUE, not an empty field (WK-DEV-005 S2). */
export const NA_CONFIRMED = "N/A-confirmed" as const;
