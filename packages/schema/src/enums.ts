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

/** The 24 fixed sections (REQ-011: never deleted, never renumbered).
 * Canonical names from WK-PLAY-001 via the verified export tool. */
export const SECTION_NAMES: Record<number, string> = {
  1: "Critical Flags & Household Summary", 2: "The Household's People & Rhythm",
  3: "Children", 4: "Pets & Animals", 5: "Residents, Staff & Regular Visitors",
  6: "The Property", 7: "Access & Vehicles", 8: "Privacy & Boundaries",
  9: "Safety & Emergency Readiness", 10: "Systems", 11: "Appliances & Equipment",
  12: "Kitchen & Food", 13: "Care of Fine Things", 14: "Laundry & Linens",
  15: "Supplies & Consumables", 16: "Rooms & Zone Standards", 17: "The Visit",
  18: "Patterns & Observations", 19: "Seasons & Travel", 20: "Vendors & Services",
  21: "Occasions, Traditions & Hospitality", 22: "Scope & Communication",
  23: "Anticipation & The Horizon", 24: "Governance",
};

/** REQ-014 registry vocabulary (mirrors the registry_kind pg enum). */
export const registryKindSchema = z.enum([
  "dates", "sizes", "appliance", "vendor", "subscription", "commitment", "horizon",
]);
export type RegistryKind = z.infer<typeof registryKindSchema>;

/** Per-kind detail payloads, validated at the application boundary
 * (ADR-002: structure lives in zod, storage stays one jsonb column). */
export const registryDetailSchemas: Record<RegistryKind, z.ZodTypeAny> = {
  dates: z.object({ person: z.string().optional(), occasion: z.string(), note: z.string().optional() }).passthrough(),
  sizes: z.object({ person: z.string(), item: z.string(), size: z.string(), updated: z.string().optional() }).passthrough(),
  appliance: z.object({ location: z.string().optional(), model: z.string().optional(), installYear: z.number().optional(), filterSize: z.string().optional() }).passthrough(),
  vendor: z.object({ service: z.string(), contact: z.string().optional(), rhythm: z.string().optional() }).passthrough(),
  subscription: z.object({ provider: z.string(), what: z.string().optional(), renewal: z.string().optional() }).passthrough(),
  commitment: z.object({ what: z.string(), prep: z.string().optional() }).passthrough(),
  horizon: z.object({ transition: z.string(), window: z.string().optional() }).passthrough(),
};
