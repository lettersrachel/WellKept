// standards.ts : the standards store vocabulary and boundary schemas
// (WK-APP-003 Addendum A1 S3). Provision contents are corporate_admin
// editable in-app; tier assignments are policy and take founder sign-off.
import { z } from "zod";
import { tierSchema } from "./enums.ts";

export const provisionTierSchema = z.enum([
  "floor_1", "floor_2", "process", "method", "preference",
]);
export type ProvisionTier = z.infer<typeof provisionTierSchema>;

export const provisionKindSchema = z.enum(["rule", "table_row", "callout"]);
export type ProvisionKind = z.infer<typeof provisionKindSchema>;

/** Floors are enforced, not displayed (WK-STD-000 S1 via Addendum A1 S5). */
export const FLOOR_TIERS = ["floor_1", "floor_2"] as const satisfies readonly ProvisionTier[];

/** Mirrors the GENERATED overridable column; app code must agree with the DB. */
export function isOverridable(tier: ProvisionTier): boolean {
  return !(FLOOR_TIERS as readonly string[]).includes(tier);
}

/** STD-006.4.1 = document, section, ordinal. Never renumbered (DEV-005 S2). */
export const provisionIdSchema = z.string().regex(/^STD-\d{3}\.\d+\.\d+$/);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * One row of provisions_seed.json exactly as the extraction emits it
 * (strict: schema drift in a re-emitted seed fails loudly, same rule as
 * missing sensitivity in the field importer). doc_title/section_title are
 * document-level metadata carried by the seed but not stored on the
 * provision row; the store's columns are the Addendum S3 contract.
 */
export const provisionSeedRowSchema = z.object({
  provision_id: provisionIdSchema,
  document: z.string().regex(/^STD-\d{3}$/),
  doc_title: z.string().min(1),
  section: z.number().int().nonnegative(), // 0 = document preamble
  section_title: z.string(),
  ordinal: z.number().int().positive(),
  text: z.string().trim().min(1),
  tier: provisionTierSchema,
  scope: z.array(z.string().min(1)).min(1),
  kind: provisionKindSchema,
  pilot_default: z.boolean(),
  version: z.number().int().positive(),
  effective_date: isoDateSchema,
}).strict().refine(
  (r) => r.provision_id === `${r.document}.${r.section}.${r.ordinal}`,
  { message: "provision_id must equal document.section.ordinal" },
);
export type ProvisionSeedRow = z.infer<typeof provisionSeedRowSchema>;

/** The stored provision row at the application boundary (standard_provision). */
export const standardProvisionSchema = z.object({
  id: provisionIdSchema,
  document: z.string().regex(/^STD-\d{3}$/),
  section: z.number().int().nonnegative(), // 0 = document preamble
  ordinal: z.number().int().positive(),
  text: z.string().trim().min(1),
  tier: provisionTierSchema,
  scope: z.array(z.string().min(1)).min(1),
  kind: provisionKindSchema,
  version: z.number().int().positive(),
  effectiveDate: isoDateSchema,
  supersededBy: provisionIdSchema.nullable(),
  sourceNote: z.string().nullable(),
  pilotDefault: z.boolean(),
  reviewDate: isoDateSchema.nullable(),
}).strict();
export type StandardProvision = z.infer<typeof standardProvisionSchema>;

/**
 * WK-SOP-019: the store is Internal-class — no sensitivity matrix, no vault.
 * Read is HM/corporate only (the client portal shows NO provisions); write is
 * corporate_admin alone. These constants are the standards-store rule the T4
 * routes enforce; the permission-matrix package stays untouched (its own
 * change-control requires founder sign-off, and the S1/S2/S3 matrix does not
 * apply here).
 */
export const STANDARDS_READ_ROLES = Object.freeze([
  "house_manager", "backup_hm", "corporate_ops", "corporate_admin", "cfo_readonly",
]);
export const STANDARDS_WRITE_ROLES = Object.freeze(["corporate_admin"]);

/**
 * The payload test, extended for the standards store (brief T7): throws if
 * anything provision-shaped appears anywhere in a client-session response.
 * Recognizes provisions by their public id form (STD-nnn.s.o) under an
 * id/provision_id/provisionId key, however deeply nested. Fail loud, not
 * filter: a provision in a client payload is a build error, not data to
 * clean. Run against every client route's response body, same discipline as
 * assertClientPayloadSafe (US-05).
 */
export function assertNoProvisionRows(payload: unknown, path = "payload"): true {
  if (Array.isArray(payload)) {
    payload.forEach((v, i) => assertNoProvisionRows(v, `${path}[${i}]`));
    return true;
  }
  if (payload && typeof payload === "object") {
    const ID_KEYS = ["id", "provision_id", "provisionId"];
    const REF_KEYS = ["governing_provisions", "governingProvisions", "method_ref", "methodRef"];
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      const values = Array.isArray(v) ? v : [v];
      if ([...ID_KEYS, ...REF_KEYS].includes(k)) {
        for (const item of values) {
          if (typeof item === "string" && provisionIdSchema.safeParse(item).success) {
            throw new Error(`SEVERE: provision reference (${item}) reached a client payload at ${path}.${k}`);
          }
        }
      }
      assertNoProvisionRows(v, `${path}.${k}`);
    }
  }
  return true;
}

/**
 * Addendum A2 finding 10: prompt_outcome.note and season_observation.summary
 * carry household detail (s2) and must never serialise into a client route.
 * Same discipline as assertNoProvisionRows — recognizes the rows by their
 * distinctive column pairs, however deeply nested, and fails loud.
 */
export function assertNoAnticipationRows(payload: unknown, path = "payload"): true {
  if (Array.isArray(payload)) {
    payload.forEach((v, i) => assertNoAnticipationRows(v, `${path}[${i}]`));
    return true;
  }
  if (payload && typeof payload === "object") {
    const keys = new Set(Object.keys(payload as Record<string, unknown>));
    const has = (...ks: string[]) => ks.every((k) => keys.has(k));
    if (has("anchorKind", "summary") || has("anchor_kind", "summary")) {
      throw new Error(`SEVERE: a season_observation row reached a client payload at ${path}`);
    }
    if (has("outcome", "promptId") || has("outcome", "prompt_id")) {
      throw new Error(`SEVERE: a prompt_outcome row reached a client payload at ${path}`);
    }
    // W-5: a condition flag is a staff observation about the household's
    // property (s2 by nature); it never reaches a client payload.
    if (has("concern", "raisedBy") || has("concern", "raised_by")) {
      throw new Error(`SEVERE: a condition_flag row reached a client payload at ${path}`);
    }
    // W-6: a deferral's CONTENT is client-facing by design, but its staff
    // attribution is not. A payload carrying noticed + decidedBy (or, AB,
    // noticed + resolvedBy) is an unprojected row, not the client shape.
    if (has("noticed", "decidedBy") || has("noticed", "decided_by")
      || has("noticed", "resolvedBy") || has("noticed", "resolved_by")) {
      throw new Error(`SEVERE: an unprojected deferral row (staff attribution) reached a client payload at ${path}`);
    }
    // AD (W-7): a paused decision is INTERNAL, with no client projection
    // at all, so the whole row is the violation, not just attribution.
    if (has("decision", "pausedBy") || has("decision", "paused_by")
      || has("decision", "research")) {
      throw new Error(`SEVERE: a paused_decision row reached a client payload at ${path}`);
    }
    // RFC-PRIM-01 build 3: a decision_record routes to staff only until
    // the client freeze lifts; no client projection exists.
    if (has("question", "recommendation") || has("authorityClass", "audience") || has("authority_class", "audience")) {
      throw new Error(`SEVERE: a decision_record row reached a client payload at ${path}`);
    }
    // RFC-PRIM-01 build 2: an attention_record's reason derives from
    // household content (s2); no client projection exists.
    if (has("audience", "urgency") || has("audience", "sourceKind") || has("audience", "source_kind")) {
      throw new Error(`SEVERE: an attention_record row reached a client payload at ${path}`);
    }
    // RFC-PRIM-01: a work_item is staff work about the household (s2 by
    // default, no client projection); any recognizable row is the
    // violation. The key pair is the primitive's own shape.
    if (has("title", "dependsOn") || has("title", "depends_on")
      || has("windowCondition", "blockedReason") || has("window_condition", "blocked_reason")) {
      throw new Error(`SEVERE: a work_item row reached a client payload at ${path}`);
    }
    // WK-DEV-009 s2.1: a brief snapshot is the staff projection verbatim
    // (s2 by construction); no client projection exists, so any
    // recognizable row is the violation.
    if (has("contentHash", "strangerMode") || has("content_hash", "stranger_mode")
      || has("briefedUser", "payload") || has("briefed_user", "payload")) {
      throw new Error(`SEVERE: a visit_brief_snapshot row reached a client payload at ${path}`);
    }
    // WK-DEV-009 s8: a capture artifact is the HOM's own words about the
    // household (s2), pre-filing; no client projection exists, so any
    // recognizable row is the violation. The key pair is the object's
    // own shape (content plus who captured, or the filing pair).
    if (has("content", "capturedBy") || has("content", "captured_by")
      || has("extractionStatus", "disposition") || has("extraction_status", "disposition")) {
      throw new Error(`SEVERE: a capture_artifact row reached a client payload at ${path}`);
    }
    // WK-DEV-007 s3: shadow-log output is engine-internal (founder, CFO,
    // developer only); no client projection exists, so any recognizable
    // row is the violation.
    if (has("triggerKey", "inputsHash") || has("trigger_key", "inputs_hash")
      || has("proposedClass", "confidence") || has("proposed_class", "confidence_pct")) {
      throw new Error(`SEVERE: a shadow_log row reached a client payload at ${path}`);
    }
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      assertNoAnticipationRows(v, `${path}.${k}`);
    }
  }
  return true;
}

/** Floors render in the red-block treatment; everything else renders quiet
 * (Addendum A1 S3: floors are visually distinct, never merely styled text). */
export type ProvisionTreatment = "red-block" | "quiet";
export function provisionTreatment(tier: ProvisionTier): ProvisionTreatment {
  return isOverridable(tier) ? "quiet" : "red-block";
}

export type ProvisionView = "hm" | "corporate" | "client";

export interface BoundProvision {
  id: string;
  document: string;
  text: string;
  tier: ProvisionTier;
  treatment: ProvisionTreatment;
  /** corporate view only (Addendum A1 S3). */
  sourceNote?: string | null;
}

/**
 * The briefing read path's render model (brief T4): resolve a field's
 * governing_provisions for one portal view. The rules, in order:
 * - client NEVER sees provisions (WK-SOP-019; the T7 payload guard enforces
 *   the same rule at the response boundary);
 * - everything stays dark until standards.seed_reviewed is true (tier
 *   assignments are policy and unreviewed tiers must not drive rendering);
 * - floors sort first and carry the red-block treatment;
 * - a dangling id renders as absent rather than crashing a field tool
 *   mid-visit; the seed-integrity test is the loud gate for those.
 */
export function bindProvisions(
  ids: readonly string[] | null | undefined,
  byId: ReadonlyMap<string, StandardProvision>,
  view: ProvisionView,
  seedReviewed: boolean,
): BoundProvision[] {
  if (view === "client" || !seedReviewed || !ids?.length) return [];
  const out: BoundProvision[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p) continue;
    out.push({
      id: p.id,
      document: p.document,
      text: p.text,
      tier: p.tier,
      treatment: provisionTreatment(p.tier),
      ...(view === "corporate" ? { sourceNote: p.sourceNote } : {}),
    });
  }
  out.sort((a, b) =>
    (a.treatment === b.treatment ? a.id.localeCompare(b.id) : a.treatment === "red-block" ? -1 : 1));
  return out;
}

/** Seed row -> stored row. Loses doc_title/section_title by design (see above). */
export function seedRowToProvision(row: ProvisionSeedRow): StandardProvision {
  return standardProvisionSchema.parse({
    id: row.provision_id,
    document: row.document,
    section: row.section,
    ordinal: row.ordinal,
    text: row.text,
    tier: row.tier,
    scope: row.scope,
    kind: row.kind,
    version: row.version,
    effectiveDate: row.effective_date,
    supersededBy: null,
    sourceNote: null,
    pilotDefault: row.pilot_default,
    reviewDate: null,
  });
}
