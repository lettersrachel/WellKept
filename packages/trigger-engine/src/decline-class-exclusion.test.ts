import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ruleMatches, type FieldChangeEvent, type TriggerRuleRow } from "./engine.ts";
import {
  DECLINE_CLASS_TAXONOMY, DECLINE_CLASS_FIELDS, DECLINE_CLASS_EXCLUSIONS,
  SECTION_1_3_BASELINE_1AUG2026, DECLINE_CLASS_FIELDS_CONFIRMED_SAFE,
  fieldIsDeclineClass, isDeclineClassExcluded, DeclineClassViolation,
} from "./decline-class.ts";
import { CASCADES } from "./cascades.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Direction 2 (PLACEHOLDER_DIRECTIONS.md/OPEN_ITEMS_INSTRUCTIONS.md,
 * founder-approved taxonomy 1 August 2026): no trigger rule may read a
 * decline-class field without a reviewed exclusion. Proven in four
 * directions per the brief's own instruction.
 */

const EVENT = (fieldName: string, newValue = "changed"): FieldChangeEvent => ({
  householdId: "h-1", fieldId: "f-1", fieldName, section: 23, newValue, changedAt: new Date().toISOString(),
});

const RULE = (packKey: string, bindsToFieldName: string): TriggerRuleRow => ({
  id: "r-1", householdId: null, family: "signal", bindsToFieldName, enabled: true,
  definition: { packName: packKey, packKey, items: [{ text: "test item", offsetDays: 0 }] },
});

test("RED: a rule matched against a decline-class field with no exclusion throws, not skips", () => {
  const rule = RULE("test-pack", "aging-parent");
  const event = EVENT("Aging-parent horizon [S2]: parents' locations, living situations, and any early signals");
  assert.throws(() => ruleMatches(rule, event), DeclineClassViolation);
});

test("GREEN: the same fixture, with a reviewed exclusion present, matches normally", () => {
  const rule = RULE("test-pack", "aging-parent");
  const event = EVENT("Aging-parent horizon [S2]: parents' locations, living situations, and any early signals");
  const withExclusion = [{ packKey: "test-pack", reason: "test fixture", approvedBy: "test", approvedOn: "2026-08-01" }];
  assert.equal(ruleMatches(rule, event, withExclusion), true,
    "an excluded rule must match normally, not be silently skipped either - exclusion means reviewed and intended, not hidden");
});

test("GREEN: a rule bound to an ordinary field never even reaches the decline-class check", () => {
  const rule = RULE("school-pack", "school");
  const event = EVENT("School calendar and term dates");
  assert.equal(ruleMatches(rule, event), true);
});

test("against its own inputs: the taxonomy and the field registry are non-empty", () => {
  // A broken/emptied DECLINE_CLASS_FIELDS would make fieldIsDeclineClass
  // return false for everything and this whole guard would pass while
  // protecting nothing - the exact failure shape named throughout this
  // project's guard doctrine.
  assert.ok(DECLINE_CLASS_TAXONOMY.length >= 6, "the founder-approved taxonomy must not have shrunk");
  assert.ok(DECLINE_CLASS_FIELDS.length >= 3, "the three fields found in Direction 2e's report must still be registered");
  assert.equal(fieldIsDeclineClass("totally unrelated field name"), false);
  assert.equal(fieldIsDeclineClass("Resident-member health horizon: any serious diagnosis"), true);
});

test("against its own inputs: isDeclineClassExcluded distinguishes a real match from a coincidental substring", () => {
  const exclusions = [{ packKey: "real-pack", reason: "test", approvedBy: "test", approvedOn: "2026-08-01" }];
  assert.equal(isDeclineClassExcluded("real-pack", exclusions), true);
  assert.equal(isDeclineClassExcluded("real-pack-2", exclusions), false,
    "must be an exact packKey match, not a prefix or substring - a loose match here would silently widen the exclusion");
});

test("static coverage: the seeded cascade library (CASCADES) has no undetected decline-class binding today", () => {
  // The runtime check in ruleMatches only fires when a matching EVENT
  // occurs. This is the static half: every field name a currently-shipped
  // cascade could ever match, checked without needing an event at all.
  // Floor: if CASCADES were ever empty, this test would pass on nothing
  // guarded - assert it actually has content to check.
  assert.ok(CASCADES.length >= 1, "CASCADES is empty - this proof is checking nothing");
  for (const rule of CASCADES) {
    if (!rule.bindsToFieldName) continue;
    // Same substring direction ruleMatches uses: does this rule's binding
    // fragment appear inside any decline-class field's full name.
    const wouldMatchDeclineField = DECLINE_CLASS_FIELDS.some((f) =>
      f.includes(rule.bindsToFieldName!.toLowerCase()));
    if (wouldMatchDeclineField) {
      const packKey = rule.definition.packKey ?? rule.definition.packName;
      assert.ok(isDeclineClassExcluded(packKey),
        `seeded cascade "${packKey}" binds to "${rule.bindsToFieldName}", which matches a decline-class field, `
        + "with no exclusion entry - this would throw at runtime the first time the field changed");
    }
  }
});

test("real exclusion list starts empty, per the brief: nothing has been reviewed yet", () => {
  assert.deepEqual(DECLINE_CLASS_EXCLUSIONS, [],
    "if this is non-empty, someone added a real exclusion - update this test to reflect the reviewed decision, don't just delete it");
});

/**
 * Check two, the forced-decision guard (2b): any field added to Section 1
 * or 3 since the 1 August 2026 baseline must be explicitly classified -
 * present in DECLINE_CLASS_FIELDS (true) or DECLINE_CLASS_FIELDS_CONFIRMED_SAFE
 * (explicitly false) - not silently defaulted either way. This is what
 * lets an incomplete taxonomy survive being incomplete: the list can miss
 * a category and the prompt still catches the field, because a human has
 * to look at it once, at the moment they add it, rather than trusting the
 * taxonomy's authors thought of everything.
 */
test("RED/GREEN: every Section 1 or 3 field is either baselined or explicitly classified", () => {
  const template = JSON.parse(readFileSync(path.join(root, "tooling/seed/fernbrook_template_seed.json"), "utf8")) as
    { fields: { section: number; name: string }[] };
  const section13 = template.fields.filter((f) => f.section === 1 || f.section === 3);

  // Floor: this guard checks nothing if the template's shape changes
  // under it (a renamed key, a moved file) and silently finds zero fields.
  assert.ok(section13.length >= 20, `only ${section13.length} Section 1/3 fields found - the template read is broken, not the field count`);

  const baseline = new Set(SECTION_1_3_BASELINE_1AUG2026);
  // Arrays, not Sets: classification is substring matching (a field's full
  // name contains a registered fragment), so this needs .some over the
  // fragments, not exact-value .has lookups.
  const unclassifiedNewFields = section13
    .map((f) => f.name.toLowerCase())
    .filter((name) => !baseline.has(name))
    .filter((name) => !DECLINE_CLASS_FIELDS.some((t) => name.includes(t)))
    .filter((name) => !DECLINE_CLASS_FIELDS_CONFIRMED_SAFE.some((t) => name.includes(t)));

  assert.deepEqual(unclassifiedNewFields, [],
    "new Section 1/3 field(s) added since the 1 August 2026 baseline with no explicit decline_class decision. "
    + "Add each to DECLINE_CLASS_FIELDS (if it matches the taxonomy) or DECLINE_CLASS_FIELDS_CONFIRMED_SAFE "
    + "(if it doesn't) in packages/trigger-engine/src/decline-class.ts - do not add it to the baseline, "
    + "which is a snapshot of what predates this guard, not an escape hatch for what comes after.");
});

test("against its own inputs: the Section 1/3 baseline itself is non-empty and real", () => {
  // A broken baseline (emptied, or pointed at the wrong section numbers)
  // would make every existing field read as "new," which would either
  // fail CI on everything that already exists, or - if someone "fixed"
  // that by making the forced-decision check permissive - pass on
  // everything silently. Neither failure mode should be possible quietly.
  assert.ok(SECTION_1_3_BASELINE_1AUG2026.length >= 20,
    `only ${SECTION_1_3_BASELINE_1AUG2026.length} fields in the baseline - it may have been accidentally truncated`);
});
