import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * The G-62 candidate guard, built: the same-PR legal rule's DETECTION,
 * computed from the schema instead of held by memory. G-62 happened
 * because "a new data category updates the legal documents in the same
 * PR" had no census: four tables shipped with every CI-guarded
 * obligation met and the remembered one missed. This guard computes
 * the set of household-referencing tables from tables.ts (the
 * staff-disclosure pattern: never trust a hand-kept list) and requires
 * every one to be either NAMED in docs/legal/CHILD_DATA.md's
 * surface-by-surface table or EXCUSED here with a written reason. A
 * new household table now fails CI until someone states its child-data
 * treatment or writes down why it cannot hold one, which is rule 1 of
 * the doc made structural.
 *
 * Not covered (stated per the CLAUDE.md table's honesty column): the
 * legal/README and privacy-notice prose, which name categories rather
 * than tables and stay on the same-PR rule plus review; and whether a
 * named treatment is CORRECT, which no census can read.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const tablesSrc = readFileSync(path.join(here, "tables.ts"), "utf8");
const childDataDoc = readFileSync(path.join(here, "../../../docs/legal/CHILD_DATA.md"), "utf8");

/** Tables that reference a household but are excused from a CHILD_DATA
 * row, each with the written reason the escape-hatch rule requires. */
const ALLOWLIST: Record<string, string> = {
  household:
    "listed explicitly rather than passing by accident (the word 'household' appears " +
    "throughout the doc's prose, so the name match would always succeed): the row " +
    "carries the family codename and the referral note, which names the referring " +
    "ADULT and is cleared on erasure; no capture path stores child content here",
  vault_item:
    "sealed ciphertext and wrapped keys; the system cannot read the content, and its " +
    "classification happens at capture through the sensitivity tier, not through " +
    "readable prose; the crypto-shred is its erasure treatment",
  audit_event:
    "append-only accountability rows carrying ids, hashes, vocabulary kinds, and " +
    "ADR-006 subject tokens by design (G-59 removed direct identifiers); " +
    "--scrub-audit-detail exists for counsel-directed residue",
  audit_subject_token:
    "the ADR-006 audit-identity mapping; its value copies what its SOURCE surface " +
    "already classifies (an assignment email, an exclusion person-ref, the latter " +
    "covered by the anticipation_exclusion row), and deleting the mapping IS the " +
    "erasure mechanism",
  household_role_assignment:
    "user id, household id, role enum, and a boolean; no free-text column exists " +
    "at all",
  time_segment:
    "no free text exists on the row by construction (0054: kinds and sources are " +
    "vocabularies, derived_from is an id pointer, the rest is timestamps)",
};

function detectHouseholdTables(): string[] {
  const out: string[] = [];
  const blocks = tablesSrc.split(/export const \w+ = pgTable\("(\w+)"/);
  for (let i = 1; i < blocks.length; i += 2) {
    const table = blocks[i]!;
    const body = (blocks[i + 1] ?? "").split("pgTable")[0]!;
    if (body.includes('"household_id"') || table === "household") out.push(table);
  }
  return out;
}

test("every household-referencing table has a CHILD_DATA treatment row or a written excusal (G-62)", () => {
  const detected = detectHouseholdTables();
  // The inputs case: an implausibly small census means the DETECTION
  // broke, not that the schema went quiet.
  assert.ok(detected.length >= 30,
    `household-table detection returned ${detected.length} tables; the schema carries far more. ` +
    `The detection regex is broken, which would let every future table pass unseen.`);
  const problems: string[] = [];
  for (const table of detected) {
    if (table in ALLOWLIST) continue;
    if (!new RegExp(`\\b${table}\\b`).test(childDataDoc)) {
      problems.push(table);
    }
  }
  assert.deepEqual(problems, [],
    `household table(s) with no CHILD_DATA.md treatment row and no written excusal: ` +
    `${problems.join(", ")} - state the child-data treatment in the doc's table, or ` +
    `allowlist here with a written reason (G-62; rule 1 of the doc)`);
  // Stale excusals: an allowlisted table that left the schema means the
  // reason no longer excuses anything.
  const stale = Object.keys(ALLOWLIST).filter((t) => !detected.includes(t));
  assert.deepEqual(stale, [], `allowlisted table(s) no longer in the schema: ${stale.join(", ")}`);
});
