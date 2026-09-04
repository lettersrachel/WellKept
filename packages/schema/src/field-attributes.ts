import { provenanceEnum } from "./tables.ts";

/**
 * RFC-ATTR-01 step 1: the field-attribute vocabularies, defined ONCE so
 * an eleventh ad-hoc mechanism has somewhere to point instead of
 * somewhere to grow. The RFC's proposed defaults under the RFC-PRIM-01
 * posture; the guard beside this module (field-attributes.test.ts)
 * computes every attribute-shaped column from the schema and demands a
 * written classification against these sections.
 *
 * DELIBERATELY ABSENT, and their absence is the design: materiality
 * (RFC 2.5) and consequence class (RFC 2.6) are FOUNDER TAXONOMY, the
 * capture-router precedent, and this module exports nothing for them so
 * nothing can import an invented one. They arrive by amendment when she
 * rules, and become CHECKs then.
 */

/**
 * RFC 2.1, knowing state: what IS our epistemic relationship to this
 * value. The existing provenance enum PROMOTED rather than replaced; the
 * guard asserts this list and the schema's enum never drift apart. The
 * default direction is the one that claims less: unstated is
 * `unconfirmed`, never `observed`.
 */
export const KNOWING_STATES = ["asked", "observed", "verified_by_touch", "client_written", "unconfirmed"] as const;
export type KnowingState = (typeof KNOWING_STATES)[number];

/** The schema's own enum, re-exported beside its vocabulary so parity is
 * checkable in one import. */
export const knowingStateEnum = provenanceEnum;

/**
 * RFC 2.2, source versus derived: did a person put this here, or did the
 * system compute it. Two values and not three, by the RFC's own
 * refusal: a system-observed value is `derived`, distinguished by its
 * derivation expression (2.3), not by a third class. The structural rule
 * that travels with it: a `derived` value carries a derivation
 * expression and an evidence pointer; a `source` value carries neither;
 * whole or absent both directions by CHECK (time_segment's shape,
 * generalized).
 */
export const VALUE_CLASSES = ["source", "derived"] as const;
export type ValueClass = (typeof VALUE_CLASSES)[number];

/**
 * RFC 2.4, confidence: integer 0..100 percent, nullable, NULL the honest
 * unknown, and ZERO REFUSED (the estimate_snapshot rule: zero confidence
 * is a claim, and almost never the one anyone means). Confidence is only
 * meaningful where knowing state leaves room for it; the RFC's proposed
 * CHECK nulls it under `verified_by_touch` and `client_written`.
 */
export function isValidConfidencePct(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 100;
}

/** The knowing states on which a confidence percentage is meaningful. */
export function confidenceAllowedFor(state: KnowingState): boolean {
  return state !== "verified_by_touch" && state !== "client_written";
}

/**
 * RFC 2.5 and 2.6, SIGNED OFF by the founder on 3 September 2026
 * (Ruling 2 section 2, quoted in RFC-ATTR-01 Amendment 1 A1.1: "this
 * review is the signature"). These were deliberately unexported founder
 * taxonomy until that signature; Q-4 promotes them per the queue row.
 * The COLUMNS carrying them still arrive on the next primitive that
 * needs them (RFC section 6), never as a speculative batch.
 *
 * Materiality: how much it matters if the value is wrong. Hard-stop
 * classes map ONLY to the first two.
 */
export const MATERIALITY_VALUES = ["safety_access", "money_legal", "convenience"] as const;
export type Materiality = (typeof MATERIALITY_VALUES)[number];

/** The classes whose staleness may HARD-STOP a workflow, per the signature. */
export const HARD_STOP_MATERIALITIES: readonly Materiality[] = ["safety_access", "money_legal"];

/**
 * Consequence class: what happens downstream if the value is wrong. The
 * SAME three the training doctrine uses for change propagation
 * (WK-TRN-009 loop), so one enum serves the household record and the
 * HOM development layer, by the signature's own words.
 */
export const CONSEQUENCE_CLASS_VALUES = ["editorial", "behavioral", "high_consequence"] as const;
export type ConsequenceClass = (typeof CONSEQUENCE_CLASS_VALUES)[number];
