import { test } from "vitest";
import assert from "node:assert/strict";
import { conditionDeclineTrigger } from "./shadow-run";

/**
 * The first real shadow trigger, pure part, both directions. The v1
 * parameters are proposals; these tests pin the MECHANISM (decline
 * detected, non-decline silent), not the calibration.
 */
const base = { subject: "grout", location: "guest bathroom" };

test("a falling look series signals, confidence rising with the drop and capped", () => {
  const gentle = conditionDeclineTrigger.evaluate({ ...base, looks: [4, 3, 3] });
  assert.ok(gentle);
  assert.equal(gentle.proposedClass, "A0");
  assert.equal(gentle.confidence, 0.5);
  assert.ok(gentle.signal.includes("grout"));

  const steep = conditionDeclineTrigger.evaluate({ ...base, looks: [5, 4, 3, 2, 1] });
  assert.ok(steep);
  assert.ok(steep.confidence > gentle.confidence);

  const cliff = conditionDeclineTrigger.evaluate({ ...base, looks: [9, 1, 0, 0] });
  assert.ok(cliff);
  assert.equal(cliff.confidence, 0.9, "never certain from a series alone");
});

test("the silent directions: short, flat, improving, and recovering series all return null", () => {
  assert.equal(conditionDeclineTrigger.evaluate({ ...base, looks: [4, 3] }), null, "fewer than 3 looks");
  assert.equal(conditionDeclineTrigger.evaluate({ ...base, looks: [3, 3, 3] }), null, "flat is not decline");
  assert.equal(conditionDeclineTrigger.evaluate({ ...base, looks: [2, 3, 4] }), null, "improving");
  assert.equal(conditionDeclineTrigger.evaluate({ ...base, looks: [4, 2, 3] }), null, "a recovery breaks the decline");
  assert.equal(conditionDeclineTrigger.evaluate({ ...base, looks: [] }), null, "no looks at all");
});
