import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseDecisionRights, splitCsvLine, isMoneyKey, usdToCents,
  MATERIALITY_NOT_A_MATERIALITY,
} from "./decision-rights-source.ts";
import { MATERIALITY_VALUES } from "./field-attributes.ts";

/**
 * Q-6-1. The seed reader over the FROZEN values CSV. These cases run
 * against the real file, not a fixture, because the whole point of
 * reading the frozen source is that no second copy exists: a fixture
 * here would BE the second copy, and would keep passing after the real
 * file changed.
 */

const CSV_PATH = join(import.meta.dirname, "../../../docs/intake/2026-09-04-founder-values/decision_rights_by_tier.csv");
const csv = () => readFileSync(CSV_PATH, "utf8");

test("preconditions: the frozen source is present, non-trivial, and parses for every shipped tier", () => {
  const raw = csv();
  assert.ok(raw.length > 200, "the frozen CSV is empty or truncated; every case below would be vacuous");
  for (const tier of ["essential", "family_ops", "concierge"]) {
    const seeds = parseDecisionRights(raw, tier);
    assert.ok(seeds.length >= 15,
      `tier ${tier} parsed ${seeds.length} rights, below the floor; a broken parse returns a small set and passes comparisons vacuously`);
  }
});

test("the tier mapping: the shipped enum's family_ops reads the source's family_operations column", () => {
  // Adoption maps, never renames. The proof that the mapping is real:
  // family_ops takes the MIDDLE column's values, not the first or last.
  const fam = parseDecisionRights(csv(), "family_ops");
  const ess = parseDecisionRights(csv(), "essential");
  const con = parseDecisionRights(csv(), "concierge");
  const perItem = (s: ReturnType<typeof parseDecisionRights>) =>
    s.find((r) => r.rightKey === "spend_without_asking_per_item_usd")!.valueCents;
  assert.equal(perItem(ess), 15_000);
  assert.equal(perItem(fam), 30_000);
  assert.equal(perItem(con), 75_000);
});

test("an unshipped tier name is refused rather than silently reading a column", () => {
  assert.throws(() => parseDecisionRights(csv(), "family_operations"),
    /unknown tier/, "the CSV's own header name must not be accepted as a shipped tier");
  assert.throws(() => parseDecisionRights(csv(), "premium"), /unknown tier/);
});

test("USD converts to integer cents, and a non-number refuses", () => {
  assert.equal(usdToCents("150"), 15_000);
  assert.equal(usdToCents("0"), 0);
  assert.throws(() => usdToCents("lots"), /not a number/);
});

test("money is keyed on the source's own _usd suffix, not on numeric-ness", () => {
  assert.equal(isMoneyKey("spend_without_asking_per_item_usd"), true);
  // The row that makes the distinction load-bearing: numeric, not money.
  assert.equal(isMoneyKey("schedule_visit_shift_hours"), false);
  const seeds = parseDecisionRights(csv(), "essential");
  const hours = seeds.find((r) => r.rightKey === "schedule_visit_shift_hours")!;
  assert.equal(hours.valueCents, null, "an hours latitude is not money and must not land in a cents column");
  assert.equal(hours.valueText, "4");
});

test("every seed carries exactly one value shape, which is what the CHECK enforces", () => {
  for (const tier of ["essential", "family_ops", "concierge"]) {
    for (const s of parseDecisionRights(csv(), tier)) {
      const one = (s.valueCents === null) !== (s.valueText === null);
      assert.ok(one, `${tier}/${s.rightKey} carries ${s.valueCents} and ${s.valueText}; the CHECK would refuse it`);
    }
  }
});

test("the source's `same` resolves to the first tier's value rather than storing the word", () => {
  const ess = parseDecisionRights(csv(), "essential");
  const con = parseDecisionRights(csv(), "concierge");
  const key = "decisions_that_always_require_member";
  const e = ess.find((r) => r.rightKey === key)!;
  const c = con.find((r) => r.rightKey === key)!;
  assert.ok(e.valueText && e.valueText.length > 40, "the essential value should be the long non-negotiable list");
  assert.equal(c.valueText, e.valueText, "`same` must resolve; storing the literal word records a right nobody wrote");
  assert.notEqual(c.valueText, "same");
});

test("the two materiality residues land NULL with a written reason, and the signed enum is not widened", () => {
  const seeds = parseDecisionRights(csv(), "essential");
  const always = seeds.find((r) => r.rightKey === "decisions_that_always_require_member")!;
  const cadence = seeds.find((r) => r.rightKey === "authority_review_cadence")!;
  assert.equal(always.materiality, null);
  assert.match(always.materialityResidueReason!, /scope rather than a fourth class/);
  assert.equal(cadence.materiality, null);
  assert.match(cadence.materialityResidueReason!, /blank/i);
  assert.equal(Object.keys(MATERIALITY_NOT_A_MATERIALITY).length, 2,
    "a third residue means the source changed and needs a written reason, not a silent NULL");
});

test("every NON-residue materiality is one of the three SIGNED values", () => {
  // The direction that catches a source change: a new materiality string
  // must fail here rather than reach a column typed by the signed enum.
  for (const tier of ["essential", "family_ops", "concierge"]) {
    for (const s of parseDecisionRights(csv(), tier)) {
      if (s.materiality === null) {
        assert.ok(s.materialityResidueReason, `${s.rightKey}: NULL materiality with no written reason`);
        continue;
      }
      assert.ok((MATERIALITY_VALUES as readonly string[]).includes(s.materiality),
        `${s.rightKey}: materiality "${s.materiality}" is not one of the signed values`);
    }
  }
});

test("the quoted field is read as ONE cell, not split on its own commas", () => {
  assert.deepEqual(splitCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
  assert.deepEqual(splitCsvLine('a,,b'), ["a", "", "b"]);
  // The real row: a naive split reads seven columns and truncates the right.
  const seeds = parseDecisionRights(csv(), "essential");
  const always = seeds.find((r) => r.rightKey === "decisions_that_always_require_member")!;
  assert.ok(always.valueText!.includes("any new vendor"), "the quoted list was truncated at its first comma");
  assert.ok(always.note, "the notes column shifted; the quoted field consumed a column");
});

test("an empty or headerless source refuses rather than seeding nothing", () => {
  assert.throws(() => parseDecisionRights("", "essential"), /no rows/);
  assert.throws(() => parseDecisionRights("right,essential\n", "essential"), /no rows|zero rights/);
  assert.throws(() => parseDecisionRights("a,b,c\n1,2,3\n", "essential"), /no "right" column|no "essential" column/);
});
