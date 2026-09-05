import { test } from "vitest";
import assert from "node:assert";
import {
  archiveTableSet, householdReferencingTables,
  ARCHIVE_EXCLUSIONS, ARCHIVE_PROJECTIONS, ARCHIVE_KNOWN_LOSSES,
} from "./household-archive.ts";

/**
 * Q-8b. The archive's table set is COMPUTED, so these cases pin the
 * DESIGN rather than a list: that everything household-keyed is in by
 * default, that each exclusion is written down, and that the two rules
 * with a privacy consequence hold.
 *
 * The floor exists because a broken introspection returns a small set
 * and would pass every comparison below vacuously.
 */
const FLOOR = 35;

test("preconditions: the census is computed and non-trivial", () => {
  const all = householdReferencingTables();
  assert.ok(all.length >= FLOOR,
    `household census returned ${all.length} tables, below the floor of ${FLOOR}; a broken derivation passes every case vacuously`);
  assert.ok(archiveTableSet().length >= FLOOR - Object.keys(ARCHIVE_EXCLUSIONS).length);
});

test("everything household-keyed is IN the archive unless it is written down as out", () => {
  const all = new Set(householdReferencingTables());
  const inArchive = new Set(archiveTableSet().map((t) => t.table));
  const missing = [...all].filter((t) => !inArchive.has(t) && !ARCHIVE_EXCLUSIONS[t]);
  assert.deepEqual(missing, [],
    `household-keyed table(s) absent from the archive with no written reason: ${missing.join(", ")}. ` +
    "The archive claims to restore a COMPLETE household; a table may only be out by decision.");
});

test("the S3 rule holds by construction: vault_item is never in the archive", () => {
  // The authorization: secured values enter only under a separate
  // authorized reveal, never the default archive.
  assert.ok(ARCHIVE_EXCLUSIONS.vault_item, "vault_item must be excluded with a written reason");
  assert.ok(!archiveTableSet().some((t) => t.table === "vault_item"));
  assert.ok(householdReferencingTables().includes("vault_item"),
    "if vault_item ever stops being household-keyed this test would pass vacuously; it is in the census");
});

test("the audit identity mapping is out, so a restored archive cannot dereference a token to a person", () => {
  assert.ok(ARCHIVE_EXCLUSIONS.audit_subject_token);
  assert.ok(!archiveTableSet().some((t) => t.table === "audit_subject_token"));
});

test("every exclusion carries a real reason, not an empty string", () => {
  for (const [table, reason] of Object.entries(ARCHIVE_EXCLUSIONS)) {
    assert.ok(reason && reason.trim().length > 40, `${table} is excluded with no substantive reason`);
  }
});

test("the photo projection names what it DROPS, so a new column stays in the manifest", () => {
  const p = ARCHIVE_PROJECTIONS.visit_photo;
  assert.ok(p, "visit_photo must be projected rather than exported whole");
  assert.equal(p.dropForHash, "data");
  // The shape that matters: no keep-list anywhere, because a keep-list
  // is the drift shape this module exists to avoid.
  for (const proj of Object.values(ARCHIVE_PROJECTIONS)) {
    assert.ok(!("keep" in proj), "a projection must name its dropped column, never a keep-list");
  }
});

test("the known losses are stated in the archive rather than left to be discovered", () => {
  assert.ok(ARCHIVE_KNOWN_LOSSES.length >= 3);
  const joined = ARCHIVE_KNOWN_LOSSES.join(" ");
  for (const subject of ["vault_item", "visit_photo", "audit_subject_token"]) {
    assert.ok(joined.includes(subject), `the known-loss list does not mention ${subject}`);
  }
});
