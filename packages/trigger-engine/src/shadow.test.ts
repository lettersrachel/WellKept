import { test } from "vitest";
import assert from "node:assert/strict";
import { AUTHORITY_CAP, AUTHORITY_CLASSES, AuthorityCapExceeded, assertWithinCap } from "./authority";
import { canonicalHash, evaluateInShadow, surfacesBeyondShadow, type ShadowSignal, type ShadowSink, type ShadowTrigger } from "./shadow";

/**
 * WK-DEV-007 section 3, each rail in both directions: the A0 cap, the
 * deterministic replayable evaluation, the never-mutates contract, the
 * per-trigger kill switch, and the promotion gate between the shadow
 * log and any human surface.
 */
const memorySink = () => {
  const rows: ShadowSignal[] = [];
  return { rows, sink: { record: async (s: ShadowSignal) => { rows.push(s); } } as ShadowSink };
};

const grout: ShadowTrigger = {
  key: "grout-wear",
  evaluate: (inputs) => ({
    signal: `condition trending down on ${String(inputs.subject)}`,
    confidence: 0.7,
    evidence: [`looks: ${JSON.stringify(inputs.looks)}`],
    proposedClass: "A0",
  }),
};

test("the cap: A0 passes, every class above throws naming the register requirement", () => {
  assert.equal(AUTHORITY_CAP, "A0");
  assertWithinCap("A0");
  for (const c of AUTHORITY_CLASSES.slice(1)) {
    assert.throws(() => assertWithinCap(c), AuthorityCapExceeded);
    assert.throws(() => assertWithinCap(c), /two-key register entry/);
  }
});

test("deterministic and replayable: same inputs, same signal, same hash; key order never matters", async () => {
  const { rows, sink } = memorySink();
  const inputs = { subject: "grout", looks: [4, 3, 3] };
  const a = await evaluateInShadow(grout, "hh-1", inputs, sink, { evaluatedAt: "2026-08-24T21:00:00Z" });
  const b = await evaluateInShadow(grout, "hh-1", { looks: [4, 3, 3], subject: "grout" }, sink, { evaluatedAt: "2026-08-24T21:00:00Z" });
  assert.ok(a && b);
  assert.deepEqual(a, b);
  assert.equal(a.inputsHash, await canonicalHash(inputs));
  assert.equal(rows.length, 2, "every evaluation lands in the sink, nothing else");
});

test("evaluation never mutates household data: a mutating trigger throws instead of corrupting", async () => {
  const mutant: ShadowTrigger = {
    key: "mutant",
    evaluate: (inputs) => {
      (inputs as { subject: string }).subject = "overwritten";
      return { signal: "x", confidence: 1, evidence: [], proposedClass: "A0" };
    },
  };
  const { sink } = memorySink();
  const inputs = { subject: "grout" };
  await assert.rejects(evaluateInShadow(mutant, "hh-1", inputs, sink));
  assert.equal(inputs.subject, "grout", "the caller's object is untouched either way");
});

test("the per-trigger kill switch silences one trigger; absence of the flag means ON", async () => {
  const { rows, sink } = memorySink();
  const killed = await evaluateInShadow(grout, "hh-1", { subject: "grout", looks: [] }, sink, { flags: { "trigger:grout-wear": false } });
  assert.equal(killed, null);
  assert.equal(rows.length, 0);
  const alive = await evaluateInShadow(grout, "hh-1", { subject: "grout", looks: [] }, sink, { flags: {} });
  assert.ok(alive);
});

test("the promotion gate: unpromoted signals never surface; promoted A0 surfaces; promoted above-A0 THROWS", () => {
  const a0: ShadowSignal = { triggerKey: "grout-wear", householdId: "hh-1", signal: "s", confidence: 0.7, evidence: [], proposedClass: "A0", inputsHash: "h", evaluatedAt: "t" };
  assert.equal(surfacesBeyondShadow(a0, {}), false, "no promotion flag, no surface");
  assert.equal(surfacesBeyondShadow(a0, { "promoted:grout-wear": true }), true);
  const a1 = { ...a0, proposedClass: "A1" as const };
  assert.throws(() => surfacesBeyondShadow(a1, { "promoted:grout-wear": true }), AuthorityCapExceeded,
    "a promoted trigger proposing beyond A0 is a defect, not a filter case");
});
