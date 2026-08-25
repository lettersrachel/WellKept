import { test } from "vitest";
import assert from "node:assert/strict";
import { CloseFlowError, FloorNotDeferrable, createCloseFlow, restoreCloseFlow, type CloseFlow, type ProvisionTier } from "./index";

function complete(flow: CloseFlow, { lifeChange = false } = {}) {
  flow.confirmTask("kitchen");
  flow.confirmTask("linen");
  flow.captureHours({ startedAt: "2026-07-18T13:00:00Z", endedAt: "2026-07-18T15:00:00Z" });
  flow.addPhoto("photo-1");
  flow.setChangesNoticed("none");
  flow.setLifeChangeSignal(lifeChange);
  flow.setZoneDrift({ answer: "none" });
  flow.addDeferral({ noticed: "hairline crack, garage floor", reason: "stable and cosmetic; sealing waits for fall", revisitCondition: "at the fall weatherproofing visit" });
  flow.setReportSentence(0, "Kitchen reset complete.");
  flow.setReportSentence(1, "Linens are refreshed.");
  flow.setReportSentence(2, "No heads-up today.");
  flow.setAnythingMissing("none");
}

test("close flow rejects submit until every P0 capture requirement is complete", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen", "linen"] });
  assert.deepEqual(flow.missingRequiredSteps(), [
    "tasks", "hours", "photos", "changes_noticed", "life_change_signal", "zone_drift", "three_sentence_report",
    "anything_missing",
  ]);
  assert.throws(() => flow.submit(), CloseFlowError);
});

test("completed flow queues an exactly three-sentence visit and optional dot", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen", "linen"] });
  complete(flow);
  flow.addDot("Lisa mentioned her sister visits in August.");
  const commands = flow.submit();
  assert.equal(commands[0]!.type, "visit.submit");
  assert.equal((commands[0]!.payload.report as string[]).length, 3);
  assert.equal(commands[1]!.type, "dot.create");
});

test("life-change signal adds a corporate route command and zone drift requires a photo", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen", "linen"] });
  assert.throws(() => flow.setZoneDrift({ answer: "bathroom is drifting" }), CloseFlowError);
  complete(flow, { lifeChange: true });
  assert.equal(flow.submit().at(-1)!.type, "signal.route");
});

test("AC: deferrals ride the visit.submit payload and belong to the visit by construction", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen", "linen"] });
  complete(flow);
  const commands = flow.submit();
  const deferrals = commands[0]!.payload.deferrals as Array<{ noticed: string; revisitCondition: string | null }>;
  assert.equal(deferrals.length, 1);
  assert.equal(deferrals[0]!.revisitCondition, "at the fall weatherproofing visit");
});

test("AC: a deferral without its intended timing refuses, at capture as well as at the database", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen"] });
  assert.throws(() => flow.addDeferral({ noticed: "hairline crack", reason: "stable and cosmetic" }),
    /intended timing/);
});

test("AC: a floor cannot be deferred; non-floor provisions can; unknown refs fail loudly", () => {
  const tiers = new Map<string, ProvisionTier>([
    ["STD-022.3.3", "floor_1"],
    ["STD-015.1.4", "method"],
  ]);
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen"], provisionTiers: tiers });
  // The specific failure the brief names: a deferral is not a route
  // around a floor.
  assert.throws(
    () => flow.addDeferral({ noticed: "med cabinet check", reason: "next visit", revisitDate: "2026-08-04", methodRef: "STD-022.3.3" }),
    FloorNotDeferrable,
  );
  // Non-floor standards-backed work defers fine.
  flow.addDeferral({ noticed: "supply list order", reason: "before the rush", revisitDate: "2026-08-04", methodRef: "STD-015.1.4" });
  assert.equal(flow.state.deferrals.length, 1);
  // An unknown ref is malformed input, never silently accepted.
  assert.throws(
    () => flow.addDeferral({ noticed: "x y z", reason: "words for the client", revisitDate: "2026-08-04", methodRef: "STD-999.9.9" }),
    /unknown provision/,
  );
});

test("double submit throws; input validation fails closed", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen"] });
  flow.confirmTask("kitchen");
  assert.throws(() => flow.confirmTask("not-a-task"), CloseFlowError);
  assert.throws(() => flow.captureHours({ startedAt: "2026-07-18T15:00:00Z", endedAt: "2026-07-18T13:00:00Z" }), CloseFlowError);
  assert.throws(() => flow.setChangesNoticed("   "), CloseFlowError);
  assert.throws(() => createCloseFlow({ householdId: "", requiredTaskIds: ["a"] }), CloseFlowError);
});

test("restoreCloseFlow resumes a draft exactly, and a submitted flow refuses to restore", () => {
  const flow = createCloseFlow({ householdId: "hh-1", requiredTaskIds: ["a", "b"] });
  flow.confirmTask("a");
  flow.setChangesNoticed("grout wear near the rear shower wall");
  flow.addDot("Owen mentioned the science fair is in March");
  const snapshot = flow.state;

  const resumed = restoreCloseFlow(snapshot);
  assert.deepEqual(resumed.state, snapshot);
  resumed.confirmTask("b");
  assert.deepEqual(resumed.state.completedTaskIds, ["a", "b"]);
  assert.equal(resumed.state.dots.length, 1);

  const done = createCloseFlow({ householdId: "hh-1", requiredTaskIds: ["a"] });
  done.confirmTask("a");
  done.captureHours({ startedAt: "2026-08-24T09:00:00Z", endedAt: "2026-08-24T11:00:00Z" });
  done.addPhoto("p1");
  done.setChangesNoticed("none");
  done.setLifeChangeSignal(false);
  done.setZoneDrift({ answer: "none" });
  done.setReportSentence(0, "One.");
  done.setReportSentence(1, "Two.");
  done.setReportSentence(2, "Three.");
  done.setAnythingMissing("none");
  done.submit();
  assert.throws(() => restoreCloseFlow(done.state), /submitted flow does not restore/);
});

test("s2.3: the batch gesture confirms only what remains, exactly once, and the closing question is required both directions", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen", "linen", "pantry"] });
  flow.confirmTask("kitchen");
  // One gesture covers the REST of the HOM's own planned work.
  assert.equal(flow.confirmRemainingAsExpected(), 2);
  assert.deepEqual([...flow.state.completedTaskIds].sort(), ["kitchen", "linen", "pantry"]);
  // A second batch is a no-op ritual, refused rather than silently absorbed.
  assert.throws(() => flow.confirmRemainingAsExpected(), CloseFlowError);

  // The closing question: blank refuses; none is a valid answer; the
  // step gates submit exactly like the other required steps.
  assert.throws(() => flow.setAnythingMissing("   "), CloseFlowError);
  assert.ok(flow.missingRequiredSteps().includes("anything_missing"));
  flow.captureHours({ startedAt: "2026-08-25T13:00:00Z", endedAt: "2026-08-25T15:00:00Z" });
  flow.addPhoto("p1");
  flow.setChangesNoticed("none");
  flow.setLifeChangeSignal(false);
  flow.setZoneDrift({ answer: "none" });
  flow.setReportSentence(0, "a."); flow.setReportSentence(1, "b."); flow.setReportSentence(2, "c.");
  assert.deepEqual(flow.missingRequiredSteps(), ["anything_missing"]);
  flow.setAnythingMissing("the pantry shelf is pulling from the wall");
  const commands = flow.submit();
  assert.equal(commands[0]!.payload.anythingMissing, "the pantry shelf is pulling from the wall");
});

test("s2.3: the close draft renders the as-planned line and itemizes only genuine exceptions", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen", "linen"] });
  flow.confirmRemainingAsExpected();
  flow.setChangesNoticed("none");
  flow.setZoneDrift({ answer: "none" });
  flow.addDot("Sam asked about gutter timing.");
  flow.addDeferral({ noticed: "sun-faded hallway paint", reason: "waiting for the fall repaint window", revisitCondition: "at the fall repaint" });
  flow.setAnythingMissing("none");
  const draft = flow.closeDraft();
  assert.equal(draft.plannedCount, 2);
  assert.equal(draft.completedAsPlanned, 2);
  // "none" answers are the quiet path, never listed as exceptions.
  assert.equal(draft.exceptions.changesNoticed, null);
  assert.equal(draft.exceptions.zoneDrift, null);
  assert.equal(draft.exceptions.dotsCount, 1);
  assert.equal(draft.exceptions.deferrals.length, 1);
  assert.equal(draft.anythingMissing, "none");
});

test("s2.3: a draft persisted before the closing question existed restores with the step unanswered", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["a"] });
  const legacy = flow.state as unknown as Record<string, unknown>;
  delete legacy.anythingMissing;
  const resumed = restoreCloseFlow(legacy as never);
  assert.equal(resumed.state.anythingMissing, null);
  assert.ok(resumed.missingRequiredSteps().includes("anything_missing"));
});
