import { test } from "vitest";
import assert from "node:assert";
import { conditionRatePer30Days, isPromotionCandidate, DEFAULT_FLAG_PROMOTION } from "./flags.ts";

const day = (n: number) => new Date(Date.UTC(2026, 6, n, 12, 0, 0));
const look = (value: number, d: number, superseded = false) =>
  ({ value, observedAt: day(d), supersededAt: superseded ? day(d) : null });

// W-5: proven in both directions per the doctrine, plus the posture case
// (an unset knob promotes NOTHING however steep the decline).

test("the rate is condition points lost per 30 days, oldest to newest, superseded rows excluded", () => {
  // 4 -> 2 over 15 days = 4 points/30 days.
  assert.equal(conditionRatePer30Days([look(4, 1), look(2, 16)]), 4);
  // A superseded fat-finger does not poison the series (the W-1 cliff).
  assert.equal(conditionRatePer30Days([look(4, 1), look(1, 2, true), look(2, 16)]), 4);
  // One live look, or no span, is a line, not a trend.
  assert.equal(conditionRatePer30Days([look(4, 1)]), null);
  assert.equal(conditionRatePer30Days([look(4, 1), look(2, 1)]), null);
});

test("GREEN: a degrading series past the minimum promotes once the knob is set", () => {
  const knob = { minObservations: 3, rateThreshold: 2 };
  assert.ok(isPromotionCandidate([look(5, 1), look(4, 8), look(2, 16)], knob));
});

test("RED: below the threshold, below the minimum count, or improving never promotes", () => {
  const knob = { minObservations: 3, rateThreshold: 2 };
  // Slow decline (1 point/30d) stays below a 2/30d threshold.
  assert.ok(!isPromotionCandidate([look(5, 1), look(5, 16), look(4, 31)], knob));
  // Two looks, however steep: a rate from two points is a line (decision 3).
  assert.ok(!isPromotionCandidate([look(5, 1), look(1, 8)], knob));
  // Superseded rows do not count toward the minimum.
  assert.ok(!isPromotionCandidate([look(5, 1), look(4, 8, true), look(2, 16)], knob));
  // Improving conditions never promote.
  assert.ok(!isPromotionCandidate([look(2, 1), look(3, 8), look(5, 16)], knob));
});

test("POSTURE: nothing promotes while rateThreshold is null, the shipped default", () => {
  assert.equal(DEFAULT_FLAG_PROMOTION.rateThreshold, null);
  // The steepest possible decline, well past every count: still not a candidate.
  const cliff = [look(5, 1), look(3, 3), look(2, 5), look(1, 7)];
  assert.ok(!isPromotionCandidate(cliff, DEFAULT_FLAG_PROMOTION));
});
