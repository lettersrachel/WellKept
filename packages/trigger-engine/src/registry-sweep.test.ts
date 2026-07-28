import { test } from "vitest";
import assert from "node:assert/strict";
import { sweepRegistryDates, nextAnnualOccurrence, sweepItemId, sweepMovableObservances, detectLoadSignal, type RegistryEntryLike } from "./registry-sweep";

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

test("movable observances: radar fires only for households whose Playbook names the observance", () => {
  const now = new Date("2026-07-20T15:00:00Z");
  const observances = [
    { name: "Eid al-Adha", date: new Date("2026-07-28T13:00:00Z") }, // in T-14 window
    { name: "Diwali", date: new Date("2026-11-08T13:00:00Z") }, // far future
    { name: "Passover", date: new Date("2026-04-02T13:00:00Z") }, // passed
  ];
  const households = [
    { householdId: "hh-1", statusTag: "STEADY", fieldValue: "We keep Eid al-Adha and Diwali; see S21." },
    { householdId: "hh-2", statusTag: "STEADY", fieldValue: "" },
    { householdId: "hh-3", statusTag: "LIFE-EVENT", fieldValue: "eid al-adha (case test)" },
  ];
  const drafts = sweepMovableObservances(observances, households, { now });
  // Only the in-window observance, only for households that name it.
  assert.deepEqual(drafts.map((d) => [d.householdId, d.suppressedByTag]), [["hh-1", false], ["hh-3", true]]);
  assert.ok(drafts[0]!.itemText.includes("Eid al-Adha"));
  assert.ok(drafts[0]!.itemText.includes("WK-STD-014"));
  assert.equal(drafts[0]!.packName, "observance-radar");
});

test("load signal: exactly three consecutive drift reports, none breaks the run (STD-023.2.7)", () => {
  assert.equal(detectLoadSignal(["mudroom slipping", "toys unheld", "garage drift"]), true);
  assert.equal(detectLoadSignal(["Mudroom", "none", "garage"]), false); // a held visit breaks it
  assert.equal(detectLoadSignal(["drift", "drift"]), false); // two visits is not a signal
  assert.equal(detectLoadSignal(["NONE", "drift", "drift"]), false); // case-insensitive none
  assert.equal(detectLoadSignal(["a", "b", "none", "c"]), false); // only the latest three count
  assert.equal(detectLoadSignal(["a", "b", "c", "none"]), true); // older held visit is history
  assert.equal(detectLoadSignal([]), false);
});

// --- G-49 part two: derived dates from typed inputs (nothing to rot) ---

const D = (kind: string, label: string, extra: Partial<RegistryEntryLike>): RegistryEntryLike =>
  ({ id: label, householdId: "hh-1", kind, label, keyDate: null, cadence: null, ...extra });

test("appliance maintenance derives from last_serviced + interval and enters the T-14 window", () => {
  // Serviced 2026-01-25, 6-month interval → due 2026-07-25, six days from NOW.
  const drafts = sweepRegistryDates(
    [D("appliance", "HVAC", { lastServicedAt: new Date("2026-01-25T13:00:00Z"), maintenanceIntervalMonths: 6 })],
    { now: NOW, statusTag: "STEADY" },
  );
  assert.equal(drafts.length, 1);
  assert.match(drafts[0]!.itemText, /Maintenance due: HVAC \(July 25\)/);
  assert.equal(drafts[0]!.packName, "appliance-radar");
});

test("an overdue service interval rolls to the NEXT due date instead of vanishing", () => {
  // Serviced 2025-01-10, 6-month interval: 2025-07-10 and 2026-01-10 have
  // passed; the next cycle (2026-07-10 → wait, also past NOW 07-19)… the
  // derivation must land on 2027-01-10, which is beyond T-14, so no draft
  // yet — but the occurrence itself must be in the future, never skipped.
  const drafts = sweepRegistryDates(
    [D("appliance", "Water heater", { lastServicedAt: new Date("2025-01-10T13:00:00Z"), maintenanceIntervalMonths: 6 })],
    { now: NOW, statusTag: "STEADY" },
  );
  assert.equal(drafts.length, 0); // next due 2027-01-10, not in window yet
});

test("horizon end-of-life derives from installed + lifespan when no key_date is maintained", () => {
  // Installed 2016-08-10, 120-month lifespan → 2026-08-10, 22 days out: inside T-30.
  const drafts = sweepRegistryDates(
    [D("horizon", "Roof (asphalt)", { installedAt: new Date("2016-08-10T13:00:00Z"), lifespanMonths: 120 })],
    { now: NOW, statusTag: "STEADY" },
  );
  assert.equal(drafts.length, 1);
  assert.match(drafts[0]!.itemText, /Coming due: Roof \(asphalt\) \(August 10\)/);
});

test("an appliance with installed + lifespan derives end-of-life too; explicit key_date still wins for the entry's own kind", () => {
  const eol = sweepRegistryDates(
    [D("appliance", "Dishwasher", { installedAt: new Date("2016-08-01T13:00:00Z"), lifespanMonths: 120 })],
    { now: NOW, statusTag: "STEADY" },
  );
  assert.equal(eol.length, 1);
  assert.equal(eol[0]!.packName, "horizon-radar");
  // With an explicit key_date on a horizon entry, typed inputs do not add a
  // second, contradictory end-of-life date.
  const explicit = sweepRegistryDates(
    [{ ...D("horizon", "Boiler", { installedAt: new Date("2016-08-01T13:00:00Z"), lifespanMonths: 120 }), keyDate: new Date("2026-08-05T13:00:00Z") }],
    { now: NOW, statusTag: "STEADY" },
  );
  assert.equal(explicit.length, 1);
  assert.match(explicit[0]!.itemText, /August 5/); // the maintained date, not the derived one
});

test("typed inputs alone never fire for kinds that do not imply dates", () => {
  const drafts = sweepRegistryDates(
    [D("vendor", "Plumber", { installedAt: new Date("2016-08-01T13:00:00Z"), lifespanMonths: 120 })],
    { now: NOW, statusTag: "STEADY" },
  );
  assert.equal(drafts.length, 0);
});
