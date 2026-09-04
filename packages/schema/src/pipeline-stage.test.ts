import { test } from "vitest";
import assert from "node:assert";
import { PIPELINE_STAGES, isPipelineStage } from "./pipeline-stage.ts";
import { pipelineStageEnum } from "./tables.ts";

/**
 * Q-5. The vocabulary module and the database enum are two written copies
 * of one list, which is the drift shape the conventions name. Pinned
 * against each other here so neither can move alone.
 *
 * PRECONDITIONS first: both inputs must be real and non-empty, because an
 * empty list compared against an empty list passes every case below.
 */

test("preconditions: both copies of the vocabulary are present and non-empty", () => {
  assert.ok(Array.isArray(PIPELINE_STAGES) && PIPELINE_STAGES.length > 0,
    "PIPELINE_STAGES is empty; every comparison below would pass vacuously");
  assert.ok(Array.isArray(pipelineStageEnum.enumValues) && pipelineStageEnum.enumValues.length > 0,
    "the pipeline_stage pgEnum has no values; every comparison below would pass vacuously");
});

test("the module and the database enum are the same list, in the spec's order", () => {
  assert.deepEqual([...pipelineStageEnum.enumValues], [...PIPELINE_STAGES],
    "pipeline-stage.ts and the pipeline_stage pgEnum have drifted apart");
});

test("the vocabulary is exactly the Four-Stage spec's four values", () => {
  // The spec's section 3 sentence, verbatim in its own order. A fifth
  // value is a spec change and lands as a migration plus a reviewed edit
  // here, never as a silent addition.
  assert.deepEqual([...PIPELINE_STAGES], ["anticipate", "identify", "decide", "monitor"]);
});

test("isPipelineStage accepts the four and refuses everything else", () => {
  for (const s of PIPELINE_STAGES) assert.equal(isPipelineStage(s), true, `${s} should be a stage`);
  // The near misses that matter: the spec's own flow sentence names a
  // fifth movement, "execution", which is NOT in the tag vocabulary.
  // This assertion PINS that absence so a later session cannot add a
  // fifth value believing it was always meant to be there. The
  // discrepancy is G-121, a spec defect routed to Q-18, not a bug here.
  assert.equal(isPipelineStage("execution"), false);
  assert.equal(isPipelineStage("Anticipate"), false);
  assert.equal(isPipelineStage(""), false);
  assert.equal(isPipelineStage(null), false);
  assert.equal(isPipelineStage(undefined), false);
  assert.equal(isPipelineStage(4), false);
  assert.equal(isPipelineStage({ stage: "decide" }), false);
});
