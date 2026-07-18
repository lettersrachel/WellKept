import { test } from "vitest";
import assert from "node:assert/strict";
import { CloseFlowError, createCloseFlow, type CloseFlow } from "./index";

function complete(flow: CloseFlow, { lifeChange = false } = {}) {
  flow.confirmTask("kitchen");
  flow.confirmTask("linen");
  flow.captureHours({ startedAt: "2026-07-18T13:00:00Z", endedAt: "2026-07-18T15:00:00Z" });
  flow.addPhoto("photo-1");
  flow.setChangesNoticed("none");
  flow.setLifeChangeSignal(lifeChange);
  flow.setZoneDrift({ answer: "none" });
  flow.setReportSentence(0, "Kitchen reset complete.");
  flow.setReportSentence(1, "Linens are refreshed.");
  flow.setReportSentence(2, "No heads-up today.");
}

test("close flow rejects submit until every P0 capture requirement is complete", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen", "linen"] });
  assert.deepEqual(flow.missingRequiredSteps(), [
    "tasks", "hours", "photos", "changes_noticed", "life_change_signal", "zone_drift", "three_sentence_report",
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

test("double submit throws; input validation fails closed", () => {
  const flow = createCloseFlow({ householdId: "h", requiredTaskIds: ["kitchen"] });
  flow.confirmTask("kitchen");
  assert.throws(() => flow.confirmTask("not-a-task"), CloseFlowError);
  assert.throws(() => flow.captureHours({ startedAt: "2026-07-18T15:00:00Z", endedAt: "2026-07-18T13:00:00Z" }), CloseFlowError);
  assert.throws(() => flow.setChangesNoticed("   "), CloseFlowError);
  assert.throws(() => createCloseFlow({ householdId: "", requiredTaskIds: ["a"] }), CloseFlowError);
});
