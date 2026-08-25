import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registryKindEnum } from "./tables";

/**
 * W-14 (founder decision 2026-07-28): child data is a NAMED SET of
 * registry kinds with a safe default, not a per-kind afterthought. Every
 * kind must be classified below; an unclassified kind fails CI, so a new
 * kind cannot ship without someone deciding which set it belongs to.
 * Every child-data kind must be covered by a database CHECK forbidding
 * s1, the way `sizes` is (migration 0026) - when a kind moves into
 * CHILD_DATA_KINDS, extend the constraint in the same change.
 */
const CHILD_DATA_KINDS = ["sizes"];
const CLIENT_SAFE_KINDS = [
  "dates", "appliance", "vendor", "subscription", "commitment", "horizon",
];

test("every registry kind is classified child-data or client-safe", () => {
  const all = registryKindEnum.enumValues as readonly string[];
  const classified = new Set([...CHILD_DATA_KINDS, ...CLIENT_SAFE_KINDS]);
  const unclassified = all.filter((k) => !classified.has(k));
  const stale = [...classified].filter((k) => !all.includes(k));
  assert.deepEqual(unclassified, [],
    `unclassified registry kind(s): ${unclassified.join(", ")} - add each to CHILD_DATA_KINDS or CLIENT_SAFE_KINDS (W-14)`);
  assert.deepEqual(stale, [], `classified kinds no longer in the enum: ${stale.join(", ")}`);
  const overlap = CHILD_DATA_KINDS.filter((k) => CLIENT_SAFE_KINDS.includes(k));
  assert.deepEqual(overlap, [], `kind in both sets: ${overlap.join(", ")}`);
});

test("every child-data kind has a CHECK forbidding client-visible sensitivity", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const tables = readFileSync(path.join(here, "tables.ts"), "utf8");
  const missing = CHILD_DATA_KINDS.filter((k) => !new RegExp(`kind[^\\n]*'${k}'[^\\n]*sensitivity`).test(tables));
  assert.deepEqual(missing, [],
    `child-data kind(s) without a sensitivity CHECK in tables.ts: ${missing.join(", ")} - extend the constraint (W-14)`);
});

test("the child-data policy document exists and classifies every capture surface (founder item 3)", () => {
  const here2 = path.dirname(fileURLToPath(import.meta.url));
  const doc = readFileSync(path.join(here2, "../../../docs/legal/CHILD_DATA.md"), "utf8");
  // The surfaces where a child can appear in the record. A new surface
  // that can hold child content gets a row in the doc's table before it
  // ships (rule 1 of the doc); this list grows with the schema.
  for (const surface of ["registry_entry", "playbook_field", "dot", "visit", "visit_photo", "incident_report", "condition_flag", "deferral", "paused_decision", "work_item", "attention_record", "decision_record", "shadow_log", "capture_artifact", "visit_brief_snapshot", "household_task_profile", "work_requirement"]) {
    assert.ok(doc.includes(surface), `CHILD_DATA.md missing a treatment row for ${surface}`);
  }
  // The doc and this test's kind sets must agree.
  for (const k of CHILD_DATA_KINDS) assert.ok(doc.includes(k), `CHILD_DATA.md does not name child kind ${k}`);
});
