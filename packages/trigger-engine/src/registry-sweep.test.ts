import { test } from "vitest";
import assert from "node:assert/strict";
import { sweepRegistryDates, nextAnnualOccurrence, sweepItemId, type RegistryEntryLike } from "./registry-sweep";

const NOW = new Date("2026-07-19T14:00:00Z");
const E = (kind: string, label: string, keyDate: string, cadence: string | null = "annual"): RegistryEntryLike =>
  ({ id: label, householdId: "hh-1", kind, label, keyDate: new Date(keyDate), cadence });

test("annual recurrence: past month/day rolls to next year, upcoming stays this year", () => {
  assert.equal(nextAnnualOccurrence(new Date("2019-06-01"), NOW).getUTCFullYear(), 2027); // June passed
  const aug = nextAnnualOccurrence(new Date("2018-08-02"), NOW);
  assert.equal(aug.getUTCFullYear(), 2026);
  assert.equal(aug.getUTCMonth(), 7);
});

test("a birthday exactly 14 days out enters the radar window; T-3 stays quiet", () => {
  const drafts = sweepRegistryDates([E("dates", "Mia — birthday", "2026-08-02")], { now: NOW, statusTag: "STEADY" });
  assert.equal(drafts.length, 1);
  assert.match(drafts[0]!.itemText, /Occasion radar: Mia — birthday on August 2/);
  assert.equal(drafts[0]!.packName, "dates-radar");
  assert.equal(drafts[0]!.suppressedByTag, false);
});

test("inside T-3 both windows are open; far dates emit nothing", () => {
  const close = sweepRegistryDates([E("dates", "Party", "2025-07-21")], { now: NOW, statusTag: "STEADY" });
  assert.equal(close.length, 2); // T-14 and T-3 both open
  const far = sweepRegistryDates([E("dates", "Gram", "2025-10-03")], { now: NOW, statusTag: "STEADY" });
  assert.equal(far.length, 0);
});

test("subscriptions get T-30; horizons are one-shot and skip once passed", () => {
  const sub = sweepRegistryDates([E("subscription", "Trupanion", "2026-08-10", "annual renewal")], { now: NOW, statusTag: "STEADY" });
  assert.equal(sub.length, 1);
  assert.match(sub[0]!.itemText, /Renewal ahead/);
  const past = sweepRegistryDates([E("horizon", "Old move", "2026-06-01", null)], { now: NOW, statusTag: "STEADY" });
  assert.equal(past.length, 0);
  const ahead = sweepRegistryDates([E("horizon", "Kindergarten", "2026-08-10", null)], { now: NOW, statusTag: "STEADY" });
  assert.equal(ahead.length, 1);
});

test("LIFE-EVENT holds sweep items; sizes/vendor kinds (no windows) emit nothing", () => {
  const held = sweepRegistryDates([E("dates", "Mia — birthday", "2026-08-02")], { now: NOW, statusTag: "LIFE-EVENT" });
  assert.equal(held[0]!.suppressedByTag, true);
  const none = sweepRegistryDates([E("sizes", "Owen — shoes", "2026-08-02")], { now: NOW, statusTag: "STEADY" });
  assert.equal(none.length, 0);
});

test("sweep ids are deterministic and distinct across occurrences", async () => {
  const a = await sweepItemId("r:hh", "2026-08-02", "text");
  const b = await sweepItemId("r:hh", "2026-08-02", "text");
  const c = await sweepItemId("r:hh", "2027-08-02", "text");
  assert.equal(a, b);
  assert.notEqual(a, c);
});
