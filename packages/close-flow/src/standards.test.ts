/**
 * standards.test.ts : floor enforcement (Addendum A1 S5; brief T5).
 * Floors cannot be recorded as adapted-per-Playbook; the attempt emits a
 * structured floor_conflict event and throws — both, always.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  CloseFlowError, FloorNotOverridable, createAdaptationRecorder,
  FLOOR_TIERS, type FloorConflictEvent, type ProvisionTier,
} from "./index";

const TIERS = new Map<string, ProvisionTier>([
  ["STD-002.1.1", "floor_1"],
  ["STD-010.2.1", "floor_2"],
  ["STD-006.4.1", "method"],
  ["STD-000.9.1", "process"],
]);

function recorder(events: FloorConflictEvent[]) {
  return createAdaptationRecorder({
    householdId: "hh-1",
    hmAssignment: "hm-assignment-1",
    provisionTiers: TIERS,
    onFloorConflict: (e) => events.push(e),
  });
}

test("floor tiers refuse the adaptation and emit floor_conflict with the full payload", () => {
  for (const [i, id] of ["STD-002.1.1", "STD-010.2.1"].entries()) {
    const events: FloorConflictEvent[] = [];
    assert.throws(() => recorder(events).recordAdaptation("field-1", id), FloorNotOverridable);
    assert.equal(events.length, 1);
    const e = events[0]!;
    assert.equal(e.type, "floor_conflict");
    assert.equal(e.household, "hh-1");
    assert.equal(e.provision_id, id);
    assert.equal(e.hm_assignment, "hm-assignment-1");
    assert.ok(!Number.isNaN(+new Date(e.occurred_at)), `event ${i} carries a real timestamp`);
  }
});

test("method and process tiers record cleanly and emit nothing", () => {
  const events: FloorConflictEvent[] = [];
  const r = recorder(events);
  for (const id of ["STD-006.4.1", "STD-000.9.1"]) {
    const rec = r.recordAdaptation("field-2", id);
    assert.equal(rec.provisionId, id);
    assert.equal(rec.fieldId, "field-2");
  }
  assert.equal(events.length, 0);
});

test("unknown provision ids fail loudly (the app-code FK check), without an event", () => {
  const events: FloorConflictEvent[] = [];
  assert.throws(() => recorder(events).recordAdaptation("field-3", "STD-999.9.9"), CloseFlowError);
  assert.throws(() => recorder(events).recordAdaptation("field-3", "STD-999.9.9"), /unknown provision/);
  assert.equal(events.length, 0);
});

test("FloorNotOverridable is a CloseFlowError; the floor list is exactly the two floors", () => {
  assert.ok(new FloorNotOverridable("STD-002.1.1") instanceof CloseFlowError);
  assert.deepEqual([...FLOOR_TIERS], ["floor_1", "floor_2"]);
});
