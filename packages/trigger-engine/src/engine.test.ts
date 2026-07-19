import { test } from "vitest";
import assert from "node:assert/strict";
import { clampOutOfQuietHours, evaluate, ruleMatches, deterministicItemId, type FieldChangeEvent } from "./engine.ts";
import { CASCADES } from "./cascades";

const EVENT = (over: Partial<FieldChangeEvent> = {}): FieldChangeEvent => ({
  householdId: "hh-1",
  fieldId: "f-1",
  fieldName: "Medication list: refill cadence and pharmacy",
  section: 3,
  newValue: "Albuterol inhaler, refill monthly at Elm St pharmacy",
  changedAt: "2026-07-18T15:00:00Z",
  ...over,
});

test("quiet hours (REQ-052): 9pm-7am household-local pushes forward to 7am", () => {
  // 2026-07-19T03:00Z = 11pm July 18 America/New_York (EDT) — inside quiet hours.
  const clamped = clampOutOfQuietHours(new Date("2026-07-19T03:00:00Z"), "America/New_York");
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(clamped)) % 24;
  assert.ok(hour >= 7 && hour < 21, `expected 7am-9pm local, got hour ${hour}`);
  // Daytime instants pass through untouched.
  const noon = new Date("2026-07-18T16:00:00Z"); // noon EDT
  assert.equal(+clampOutOfQuietHours(noon, "America/New_York"), +noon);
});

test("the meds cascade matches medication fields and emits its pack items", () => {
  const drafts = evaluate(EVENT(), CASCADES, { statusTag: "STEADY" });
  assert.equal(drafts.length, 2);
  assert.ok(drafts.every((d) => d.packName === "meds-day"));
  assert.ok(drafts.every((d) => d.suppressedByTag === false));
  assert.ok(drafts[0]!.itemText.includes("refill pickup"));
});

test("LIFE-EVENT holds items (suppressed_by_tag), never drops them", () => {
  const drafts = evaluate(EVENT(), CASCADES, { statusTag: "LIFE-EVENT" });
  assert.equal(drafts.length, 2); // same items, held not skipped
  assert.ok(drafts.every((d) => d.suppressedByTag === true));
});

test("a cleared field emits nothing; unmatched fields emit nothing", () => {
  assert.deepEqual(evaluate(EVENT({ newValue: "  " }), CASCADES, { statusTag: "STEADY" }), []);
  assert.deepEqual(
    evaluate(EVENT({ fieldName: "Florist preferences" }), CASCADES, { statusTag: "STEADY" }),
    [],
  );
});

test("household-scoped rules only fire for their household; disabled rules never fire", () => {
  const rule = { ...CASCADES[1]!, householdId: "other-household" };
  assert.equal(ruleMatches(rule, EVENT()), false);
  assert.equal(ruleMatches({ ...CASCADES[1]!, enabled: false }, EVENT()), false);
  assert.equal(ruleMatches(CASCADES[1]!, EVENT()), true); // fleet rule matches any household
});

test("kindergarten and occasion cascades bind to their fields", () => {
  const school = evaluate(EVENT({ fieldName: "School enrollment status and start date" }), CASCADES, { statusTag: "STEADY" });
  assert.equal(school.length, 3);
  assert.equal(school[0]!.packName, "kindergarten-readiness");
  const dates = evaluate(EVENT({ fieldName: "Important-dates registry: birthdays (family and close extended)" }), CASCADES, { statusTag: "STEADY" });
  assert.equal(dates.length, 2);
  assert.equal(dates[0]!.packName, "occasion-radar");
});

test("deterministic ids: same event+rule+item collapses, anything differing separates", async () => {
  const a = await deterministicItemId(EVENT(), "rule-1", "item text");
  const b = await deterministicItemId(EVENT(), "rule-1", "item text");
  const c = await deterministicItemId(EVENT(), "rule-1", "other item");
  const d = await deterministicItemId(EVENT({ changedAt: "2026-07-19T15:00:00Z" }), "rule-1", "item text");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
});
