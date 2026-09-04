/**
 * The Four-Stage Application Spec (2 August 2026, A121; stamped
 * plan-of-record) section 3: the stage tag. "Every trigger, prompt-pack
 * item, requirement, and queue item carries its stage as an enum:
 * anticipate, identify, decide, monitor."
 *
 * This module is the single written source of that vocabulary. The
 * database enum `pipeline_stage` and this list are pinned against each
 * other by `pipeline-stage.test.ts`, so the two cannot drift the way a
 * hand-copied vocabulary does (the `field-attributes.ts` shape, Q-4/B1).
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DEFINE, recorded here rather
 * than left to be inferred from its absence:
 *
 *  - **Legal transitions.** The spec's own flow sentence names FIVE
 *    movements (anticipation, identification, decision-routing,
 *    EXECUTION, monitoring) against this four-value tag, with
 *    `execution` absent from the tag. That is the spec disagreeing with
 *    itself two paragraphs apart, filed as the SPEC DEFECT G-121 and
 *    routed to the Q-18 reconciliation by founder ruling; deliberately
 *    not reconciled here. A transition table would have to choose which
 *    of the two readings is right, and it would have no consumer.
 *  - **The routing rule.** Below-threshold auto-execution and
 *    propose-first routing read against the Decision Rights block,
 *    which is Q-6. No threshold exists in this tree to route on, and
 *    inventing one is barred.
 *  - **The roadmap test.** "Anything tagged `decide` receives the
 *    returned-choice design review before it ships" governs FEATURES,
 *    which live in the requirements document and the build queue. It
 *    shares this vocabulary and not this mechanism; reading the column
 *    as the roadmap test would be two measurements sharing one name.
 *
 * Guardrail: stage tags are INTERNAL. No member surface ever displays
 * the schema (spec section 5). Enforced positively rather than by
 * absence, in `assertNoAnticipationRows` and `assertDeclaredClientKeys`.
 */
export const PIPELINE_STAGES = ["anticipate", "identify", "decide", "monitor"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** True for the four spec values and nothing else. */
export function isPipelineStage(value: unknown): value is PipelineStage {
  return typeof value === "string" && (PIPELINE_STAGES as readonly string[]).includes(value);
}
