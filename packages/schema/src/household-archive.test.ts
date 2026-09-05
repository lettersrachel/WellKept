import { test } from "vitest";
import assert from "node:assert";
import {
  archiveTableSet, householdReferencingTables, archivePersonEmail,
  ARCHIVE_EXCLUSIONS, ARCHIVE_PROJECTIONS, ARCHIVE_KNOWN_LOSSES, ARCHIVE_PHOTO_LOSS,
  ARCHIVE_SCOPES, MEMBER_SCOPE, MEMBER_ROW_FILTERS, PORTABILITY_CATEGORIES, CORPORATE_ONLY,
  REFERENCED_GLOBAL_TABLES,
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
  assert.ok(archiveTableSet("corporate").length >= FLOOR - Object.keys(ARCHIVE_EXCLUSIONS).length);
});

test("everything household-keyed is IN the archive unless it is written down as out", () => {
  const all = new Set(householdReferencingTables());
  const inArchive = new Set(archiveTableSet("corporate").map((t) => t.table));
  const missing = [...all].filter((t) => !inArchive.has(t) && !ARCHIVE_EXCLUSIONS[t]);
  assert.deepEqual(missing, [],
    `household-keyed table(s) absent from the archive with no written reason: ${missing.join(", ")}. ` +
    "The archive claims to restore a COMPLETE household; a table may only be out by decision.");
});

test("the S3 rule holds by construction: vault_item is never in the archive", () => {
  // The authorization: secured values enter only under a separate
  // authorized reveal, never the default archive.
  assert.ok(ARCHIVE_EXCLUSIONS.vault_item, "vault_item must be excluded with a written reason");
  for (const scope of ARCHIVE_SCOPES) assert.ok(!archiveTableSet(scope).some((t) => t.table === "vault_item"));
  assert.ok(householdReferencingTables().includes("vault_item"),
    "if vault_item ever stops being household-keyed this test would pass vacuously; it is in the census");
});

test("the audit identity mapping is out, so a restored archive cannot dereference a token to a person", () => {
  assert.ok(ARCHIVE_EXCLUSIONS.audit_subject_token);
  for (const scope of ARCHIVE_SCOPES) assert.ok(!archiveTableSet(scope).some((t) => t.table === "audit_subject_token"));
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
  const joined = [...ARCHIVE_KNOWN_LOSSES, ARCHIVE_PHOTO_LOSS].join(" ");
  for (const subject of ["vault_item", "visit_photo", "audit_subject_token"]) {
    assert.ok(joined.includes(subject), `the known-loss list does not mention ${subject}`);
  }
});

/**
 * The 5 September rulings. Ruling 1: people are pseudonymised. Ruling 2:
 * task_definition joins the archive. Ruling 3: the export takes an
 * explicit scope and the member scope carries only what the portability
 * line names.
 */

test("the member scope is an ALLOW-list: a new table joins corporate automatically and member never", () => {
  const corporate = new Set(archiveTableSet("corporate").map((t) => t.table));
  const member = new Set(archiveTableSet("member").map((t) => t.table));
  assert.ok(member.size < corporate.size,
    "the member scope must be narrower than the corporate one; equal sets mean the allow-list is not being applied");
  for (const t of member) {
    assert.ok(corporate.has(t), `${t} is in the member scope and not the corporate one, which cannot be right`);
    assert.ok(MEMBER_SCOPE[t], `${t} reached the member scope without naming its portability category`);
  }
  // The other direction: a member-scope entry naming a table that no
  // longer carries a household column would otherwise sit unnoticed.
  for (const t of Object.keys(MEMBER_SCOPE)) {
    assert.ok(member.has(t),
      `MEMBER_SCOPE names ${t}, which is not in the computed member set. Either the table lost its household column or it is excluded from every scope.`);
  }
});

test("the four tables the founder named by hand are out of the member scope", () => {
  const member = new Set(archiveTableSet("member").map((t) => t.table));
  for (const t of ["paused_decision", "shadow_log", "capture_artifact", "decision_right"]) {
    assert.ok(!member.has(t), `${t} must not reach a member archive (founder ruling, 5 September 2026)`);
    assert.ok(archiveTableSet("corporate").some((x) => x.table === t),
      `${t} must still be in the corporate archive; if it left, this case passes for the wrong reason`);
  }
});

test("every member-scope entry names one of the portability line's own phrases", () => {
  const allowed = new Set<string>(PORTABILITY_CATEGORIES);
  assert.equal(PORTABILITY_CATEGORIES.length, 9);
  for (const [table, spec] of Object.entries(MEMBER_SCOPE)) {
    assert.ok(allowed.has(spec.category),
      `${table} claims the category "${spec.category}", which the portability line does not name`);
    assert.ok(spec.why && spec.why.trim().length > 40, `${table} is admitted with no substantive reason`);
  }
});

test("the member scope filters playbook_field to s1, so s2 internal ops never travels", () => {
  // The row-level half. A table can be member-visible while some of its
  // ROWS are not, and playbook_field is the whole household record.
  assert.equal(MEMBER_ROW_FILTERS.playbook_field, "sensitivity = 's1'");
  assert.ok(archiveTableSet("member").some((t) => t.table === "playbook_field"),
    "the filter is meaningless if the table is not in the member scope; that would pass vacuously");
});

test("the referenced global tables are named with the column they are reached through", () => {
  const spec = REFERENCED_GLOBAL_TABLES.task_definition;
  assert.ok(spec, "task_definition joins the archive (founder ruling, 5 September 2026, ruling 2)");
  assert.equal(spec.via, "household_task_profile");
  assert.equal(spec.column, "task_definition_id");
  // It is NOT household-keyed, which is why it needs naming at all.
  assert.ok(!householdReferencingTables().includes("task_definition"),
    "if task_definition ever gains a household column it joins by the computed rule and this entry becomes wrong");
});

test("a restored person carries an address that can never route", () => {
  const email = archivePersonEmail("abc123");
  assert.ok(email.endsWith("@archived.invalid"),
    "the pseudonymous address must sit under the RFC 2606 reserved .invalid TLD");
  assert.ok(!email.includes("@wellkept"), "a pseudonym must not look like a real company address");
});

test("the known losses say that people are pseudonymised", () => {
  const joined = ARCHIVE_KNOWN_LOSSES.join(" ").toLowerCase();
  assert.ok(joined.includes("pseudonymised"),
    "a restore that silently renames every person is a loss a reader must be told about");
});

/**
 * Founder ruling, 5 September 2026 (Q-8b acceptance, ruling 1): the
 * member allow-list is TOTAL over the corporate table set. Every table
 * carries an explicit decision and a table with no entry FAILS rather
 * than defaulting quietly to corporate-only, so "considered and left
 * out" leaves a trace. The erasure-coverage floor applied to a second
 * question, and the same property: the author must decide, not omit.
 */
test("every corporate table carries an explicit member decision, or the guard fails", () => {
  const corporate = archiveTableSet("corporate").map((t) => t.table);
  assert.ok(corporate.length >= FLOOR - Object.keys(ARCHIVE_EXCLUSIONS).length,
    "a broken table set would make this case pass vacuously");
  const undecided = corporate.filter((t) => !MEMBER_SCOPE[t] && !CORPORATE_ONLY[t]);
  assert.deepEqual(undecided, [],
    `table(s) in the corporate archive with no member decision: ${undecided.join(", ")}. ` +
    "Add the table to MEMBER_SCOPE with the portability phrase that admits it, or to CORPORATE_ONLY " +
    "with the reason it stays out. Leaving it out has to be written down, which is the whole point.");
});

test("no table is BOTH in the member scope and corporate-only", () => {
  const both = Object.keys(MEMBER_SCOPE).filter((t) => CORPORATE_ONLY[t]);
  assert.deepEqual(both, [], `contradictory decision for: ${both.join(", ")}`);
});

test("every corporate-only decision carries a substantive reason", () => {
  for (const [table, reason] of Object.entries(CORPORATE_ONLY)) {
    assert.ok(reason && reason.trim().length > 40,
      `${table} is held out of the member scope with no substantive reason`);
  }
});

test("a corporate-only entry naming a table that is not in the archive is stale", () => {
  // The reverse direction. A decision about a table that no longer
  // exists reads as coverage and is not.
  const corporate = new Set(archiveTableSet("corporate").map((t) => t.table));
  for (const t of Object.keys(CORPORATE_ONLY)) {
    assert.ok(corporate.has(t),
      `CORPORATE_ONLY names ${t}, which is not in the corporate archive. Either it lost its household column or it is excluded from every scope, and the decision here is stale.`);
  }
});
