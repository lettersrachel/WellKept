import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { KNOWING_STATES, VALUE_CLASSES, isValidConfidencePct, confidenceAllowedFor, knowingStateEnum } from "./field-attributes.ts";

/**
 * RFC-ATTR-01 step 1's guard (the count lives in the manifest, never in
 * prose): every attribute-shaped
 * column in the schema resolves against a WRITTEN classification, so an
 * eleventh provenance mechanism or a fifth confidence type cannot appear
 * silently while the founder decides the RFC's open sections. The survey
 * that motivated this found TEN provenance-shaped mechanisms and FOUR
 * confidence types in three incompatible shapes, two of which
 * deliberately do NOT migrate because they answer a different question
 * under the same word; name-matching would have gotten those wrong,
 * which is why the classification is per column and written.
 *
 * The census COMPUTES its input from tables.ts (the inputs doctrine): a
 * detection that returns a tiny set fails the floor rather than passing
 * vacuously. The floor is stated in the unit the census counts, COLUMNS,
 * not mechanisms: fifteen as of 2 September 2026, derived by running the
 * census, and one mechanism may carry several columns.
 */

const here = dirname(fileURLToPath(import.meta.url));
const TABLES = readFileSync(join(here, "tables.ts"), "utf8");

/** table.column -> which RFC-ATTR-01 section answers it, in writing. */
const CLASSIFICATION: Record<string, string> = {
  "playbook_field.provenance": "RFC 2.1 knowing state; THE promoted vocabulary itself",
  "playbook_field.provenance_date": "RFC 2.1 companion: when the knowing state was established",
  "playbook_field.provenance_actor": "RFC 2.1 companion: who established it",
  "time_entry.source": "different question, does NOT migrate: which WRITER produced the row (visit_close | manual | seed), not how a value is known",
  "registry_entry.install_confidence": "RFC 2.4 shape mismatch, migrates at RFC step 2: a three-value categorical where 2.4 is integer percent",
  "registry_entry.derivation_source": "RFC 2.3 derivation expression, already in the proposed prose-naming shape",
  "registry_entry.derived_year": "RFC 2.2/2.3 derived value with its expression beside it",
  "event_outbox.provenance": "different question, does NOT migrate: which EMITTER wrote the event, the s4 envelope's writer field",
  "season_observation.confidence": "RFC 2.1 mislabeled as confidence, migrates at RFC step 2: observed|inferred is knowing state, not a percentage",
  "shadow_log.confidence_pct": "RFC 2.4 exactly: integer percent, the shape 2.4 adopts",
  "work_item.source": "different question, does NOT migrate: which SURFACE captured the item (hm_capture | corporate | system)",
  "preference_rule.provenance": "RFC 2.1-adjacent three-class vocabulary (explicit/observed/inferred); reconciles with 2.1 at RFC step 2",
  "preference_rule.confidence": "RFC 2.4: shipped deliberately scale-less, takes its 0..100 integer scale from 2.4",
  "time_segment.source": "RFC 2.2: the strongest existing mechanism, the shape 2.2 generalizes",
  "time_segment.derived_from": "RFC 2.3: the typed evidence pointer, NOT NULL by CHECK",
};

function censusColumns(): string[] {
  const found: string[] = [];
  const tableBlocks = TABLES.matchAll(/export const \w+ = pgTable\("(\w+)",\s*\{([\s\S]*?)\n\}\s*,?\s*(?:\(t\)|\))/g);
  for (const m of tableBlocks) {
    const tableName = m[1] ?? "";
    const body = m[2] ?? "";
    for (const cm of body.matchAll(/\w+:\s*\w+\("([^"]+)"/g)) {
      const col = cm[1] ?? "";
      if (/provenance|confidence|knowing|derivation|derived/.test(col) || col === "source" || col === "derived_from") {
        found.push(`${tableName}.${col}`);
      }
    }
  }
  return found;
}

describe("RFC-ATTR-01 guard: attribute-shaped columns resolve against a written classification", () => {
  test("every detected column is classified, and the census is not vacuous", () => {
    const detected = censusColumns();
    // The floor catches a broken detection returning a tiny set (the
    // staff-disclosure lesson). Unit: COLUMNS, fifteen when derived.
    expect(detected.length, "census floor: a smaller set means the detection broke, not that mechanisms left").toBeGreaterThanOrEqual(15);
    for (const col of detected) {
      expect(
        CLASSIFICATION[col],
        `${col} is attribute-shaped and UNCLASSIFIED. A new provenance/confidence/derivation column `
        + `must point at an RFC-ATTR-01 section (or be classified "different question") in this guard's `
        + `CLASSIFICATION map, in writing, before it ships. That sentence is the whole point of this guard: `
        + `the survey found ten mechanisms grown one at a time, and this is where the eleventh stops.`,
      ).toBeTruthy();
    }
    // The reverse direction: a classified column that left the schema is
    // a stale claim, the hand-carried-list drift this repo names.
    for (const col of Object.keys(CLASSIFICATION)) {
      expect(detected, `${col} is classified but no longer detected; remove its row or fix the census`).toContain(col);
    }
  });

  test("the promoted knowing-state vocabulary and the schema's enum cannot drift apart", () => {
    expect([...knowingStateEnum.enumValues]).toEqual([...KNOWING_STATES]);
  });

  test("the 2.2 class list is exactly two values, by the RFC's own refusal of a third", () => {
    expect([...VALUE_CLASSES]).toEqual(["source", "derived"]);
  });

  test("confidence: integer percent, zero refused, NULL handled by the caller as the honest unknown", () => {
    expect(isValidConfidencePct(85)).toBe(true);
    expect(isValidConfidencePct(1)).toBe(true);
    expect(isValidConfidencePct(100)).toBe(true);
    expect(isValidConfidencePct(0), "zero confidence is a claim, and it is refused (the estimate_snapshot rule)").toBe(false);
    expect(isValidConfidencePct(101)).toBe(false);
    expect(isValidConfidencePct(42.5)).toBe(false);
  });

  test("confidence is meaningless where knowing state already settles trust", () => {
    expect(confidenceAllowedFor("verified_by_touch")).toBe(false);
    expect(confidenceAllowedFor("client_written")).toBe(false);
    expect(confidenceAllowedFor("observed")).toBe(true);
    expect(confidenceAllowedFor("unconfirmed")).toBe(true);
  });
});
