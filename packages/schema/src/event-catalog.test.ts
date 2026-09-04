import { test } from "vitest";
import assert from "node:assert/strict";
import { EVENT_FAMILIES, catalogFamilyOf, isCatalogKind } from "./event-catalog.ts";

/**
 * Q-3b: the family catalog is RFC-001 §3a's list verbatim, and its
 * boundary with the live s4 kinds is honest in both directions.
 */

test("the eleven families, exactly the adopted list, in the adopted order", () => {
  assert.deepEqual([...EVENT_FAMILIES], [
    "capture", "knowledge", "expectation", "source", "commitment",
    "changeset", "work", "decision", "vendor", "ai", "delight",
  ]);
});

test("a family kind resolves to its family; the two helpers agree", () => {
  assert.equal(catalogFamilyOf("expectation.opened"), "expectation");
  assert.equal(catalogFamilyOf("changeset.applied"), "changeset");
  assert.equal(catalogFamilyOf("ai.proposal_made"), "ai");
  for (const k of ["expectation.opened", "work.assigned", "delight.reserved"]) {
    assert.equal(isCatalogKind(k), catalogFamilyOf(k) !== null);
    assert.equal(isCatalogKind(k), true);
  }
});

test("every LIVE s4 kind stays OUTSIDE the catalog: legacy namespaces never resolve", () => {
  // The emitted-kind inventory as of 2026-09-04, read from every
  // emitOutboxEvent call site. `work_item` is not the `work` family and
  // `decision_record` is not `decision`; the boundary is deliberate
  // (renaming shipped kinds is a semantics change nobody ruled).
  const live = [
    "household.departure", "work_item.opened", "work_item.resolved",
    "attention_record.opened", "attention_record.resolved",
    "attention_record.bundled", "attention_record.unbundled",
    "situation.opened", "situation.resolved",
    "preference_rule.recorded", "preference_rule.retired",
    "decision_record.routed", "decision_record.decided", "decision_record.expired",
    "capture_artifact.created", "capture_artifact.filed",
    "task_profile.configured", "work_requirement.generated",
    "work_requirement.deferred", "work_requirement.completed",
    "work_requirement.verified", "work_requirement.reopened",
    "estimate_snapshot.recorded", "task_occurrence.recorded",
    "visit.arrival", "visit.departure", "time_segment.derived",
    "field.changed",
  ];
  for (const k of live) {
    assert.equal(catalogFamilyOf(k), null, `${k} must stay outside the catalog namespace`);
    assert.equal(isCatalogKind(k), false);
  }
});

test("malformed kinds resolve to nothing rather than to a family", () => {
  assert.equal(catalogFamilyOf("expectation"), null, "a bare family word is not a kind");
  assert.equal(catalogFamilyOf(".opened"), null);
  assert.equal(catalogFamilyOf(""), null);
  assert.equal(catalogFamilyOf("EXPECTATION.opened"), null, "the catalog is lowercase; case is not forgiven");
});
