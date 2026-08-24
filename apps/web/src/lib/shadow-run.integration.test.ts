import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { household, authUser, conditionFlag, objectObservation, shadowLog } from "@wellkept/schema";
import { runShadowPass } from "@wellkept/trigger-engine";
import { db } from "./db";

/**
 * WK-DEV-007 section 3 on the REAL database: the shadow pass reads an
 * open flag's look series, records the would-have-surfaced signal to
 * shadow_log through the table sink, dedupes identical re-evaluations
 * (one row per distinct input state), respects the per-trigger kill
 * switch, and records a NEW row when the inputs actually change.
 */
const H = randomUUID();
const U = `shadow-test-${H.slice(0, 8)}`;
const FLAG = randomUUID();

const look = (value: number, daysAgo: number) => ({
  id: randomUUID(), householdId: H, conditionFlagId: FLAG, measure: "condition" as const,
  value, observedAt: new Date(Date.now() - daysAgo * 86_400_000), recordedBy: U,
});

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `Shadow Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
  await db.insert(conditionFlag).values({
    id: FLAG, householdId: H, subject: "grout", location: "guest bathroom",
    concern: "cracking along the rear shower wall", raisedBy: U, revisitCondition: "after the deep clean",
  });
  await db.insert(objectObservation).values([look(4, 21), look(3, 14), look(3, 7)]);
});

afterAll(async () => {
  await db.delete(shadowLog).where(eq(shadowLog.householdId, H));
  await db.delete(objectObservation).where(eq(objectObservation.householdId, H));
  await db.delete(conditionFlag).where(eq(conditionFlag.householdId, H));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("the pass records the signal once, dedupes replays, obeys the kill switch, and logs anew when inputs change", async () => {
  const first = await runShadowPass(db, { evaluatedAt: "2026-08-24T22:00:00Z" });
  assert.ok(first.evaluated >= 1);

  const mine = () => db.select().from(shadowLog).where(eq(shadowLog.householdId, H));
  let rows = await mine();
  assert.equal(rows.length, 1, "one distinct evaluation, one row");
  const row = rows[0]!;
  assert.equal(row.triggerKey, "condition-decline");
  assert.equal(row.proposedClass, "A0");
  assert.equal(row.confidence, 50);
  assert.ok(row.signal.includes("grout"));
  assert.equal(row.score, null, "unscored at birth; scoring is the founder's");
  assert.ok(row.inputsHash.length === 64, "the replayable inputs hash rides the row");

  // Replay with identical inputs: the sink dedupes, nothing doubles.
  await runShadowPass(db, { evaluatedAt: "2026-08-24T23:00:00Z" });
  rows = await mine();
  assert.equal(rows.length, 1, "identical inputs must not add scoring noise");

  // Kill switch: the REL-01 flag silences the trigger with no deploy.
  await db.insert(objectObservation).values([look(2, 1)]);
  const killed = await runShadowPass(db, { flags: { "trigger:condition-decline": false } });
  assert.equal(killed.recorded, 0);
  rows = await mine();
  assert.equal(rows.length, 1, "a killed trigger records nothing even on new inputs");

  // The inputs changed (a fourth, lower look): a NEW distinct evaluation.
  await runShadowPass(db, {});
  rows = await mine();
  assert.equal(rows.length, 2, "changed inputs are a new fact worth scoring");
  const fresh = rows.find((r) => r.inputsHash !== row.inputsHash)!;
  assert.ok(fresh.confidence > row.confidence, "a steeper decline proposes higher confidence");
});
