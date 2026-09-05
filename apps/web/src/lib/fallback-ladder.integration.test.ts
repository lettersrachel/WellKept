import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { household, authUser, decisionRight, fallbackPlan, walkFallbackLadder } from "@wellkept/schema";
import { db } from "./db";

/**
 * Q-12b-3 on the REAL database.
 *
 * THIS SUITE EXISTS BECAUSE OF THE STANDING RULE THAT WHERE A FUNCTION
 * READS A TABLE, AT LEAST ONE PROOF READS THE TABLE. `routeByDecisionRights`
 * shipped with seven unit tests, all green for a week, and every one of them
 * passed an array the test built; not one read a `decision_right` row. The
 * ladder walks on top of that router, so the rights below are INSERTED and
 * then SELECTED back rather than constructed, and the plans are real rows.
 */
const H = randomUUID();
const U = `fb-test-${H.slice(0, 8)}`;
const CEILING_KEY = `spend_ceiling_${H.slice(0, 8)}`;
const WORDS_KEY = `substitute_rule_${H.slice(0, 8)}`;

async function rightsFromDb() {
  const rows = await db.select().from(decisionRight).where(eq(decisionRight.householdId, H));
  return rows.map((r) => ({ rightKey: r.rightKey, valueCents: r.valueCents, valueText: r.valueText }));
}

async function planFromDb(id: string) {
  const [p] = await db.select().from(fallbackPlan).where(eq(fallbackPlan.id, id));
  assert.ok(p, "the plan must be readable from the database");
  return {
    preferredOption: p.preferredOption, approvedSubstitute: p.approvedSubstitute,
    establishedBackup: p.establishedBackup, vettedBench: p.vettedBench,
    decisionRightKey: p.decisionRightKey, amountCents: p.amountCents,
  };
}

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `FB Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
  await db.insert(decisionRight).values([
    {
      id: randomUUID(), householdId: H, rightKey: CEILING_KEY, valueCents: 15000,
      valueText: null, materiality: "money_legal", status: "recommended",
      authority: "Q-12b-3 integration test",
    },
    {
      id: randomUUID(), householdId: H, rightKey: WORDS_KEY, valueCents: null,
      valueText: "approved_substitute_only", materiality: "convenience", status: "recommended",
      authority: "Q-12b-3 integration test",
    },
  ]);
});

afterAll(async () => {
  await db.delete(fallbackPlan).where(eq(fallbackPlan.householdId, H));
  await db.delete(decisionRight).where(eq(decisionRight.householdId, H));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("a plan under the household's own ceiling reaches its first option on record", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who covers the Tuesday visit",
    preferredOption: "Marta", approvedSubstitute: "Ana",
    decisionRightKey: CEILING_KEY, amountCents: 9000, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "preferred");
  assert.match(result.why, /at or below every/);
});

test("with no preferred option the walk skips the empty rung rather than refusing", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who waters the greenhouse",
    preferredOption: null, approvedSubstitute: null, establishedBackup: "the Hollis service",
    decisionRightKey: CEILING_KEY, amountCents: 500, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "established_backup");
});

test("above the household's ceiling nothing is permitted, so the ladder reaches ask", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who replaces the failed pump",
    preferredOption: "Marta", decisionRightKey: CEILING_KEY, amountCents: 90000, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "ask");
  assert.match(result.why, /above the household's ceiling/);
});

test("a right recorded in words is not a ceiling, so the ladder reaches ask", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who takes the Thursday slot",
    preferredOption: "Marta", approvedSubstitute: "Ana",
    decisionRightKey: WORDS_KEY, amountCents: 100, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "ask");
  assert.match(result.why, /recorded in words/);
  // The words themselves are read from the row, so a mapping that does not
  // exist cannot be silently supplied by the test.
  assert.match(result.why, /approved_substitute_only/);
});

test("an unknown amount is not below a ceiling", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who meets the delivery",
    preferredOption: "Marta", decisionRightKey: CEILING_KEY, amountCents: null, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "ask");
  assert.match(result.why, /unknown amount/);
});

test("a plan naming a right this household does not hold reaches ask, the null-threshold default", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who signs for the crate",
    preferredOption: "Marta", decisionRightKey: "a_right_nobody_granted", amountCents: 100, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "ask");
  assert.match(result.why, /no decision right a_right_nobody_granted on record/);
});

test("a plan naming no right at all reaches ask, and says so in its own words", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who locks up",
    preferredOption: "Marta", decisionRightKey: null, amountCents: 100, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "ask");
  assert.match(result.why, /names no decision right/);
});

test("a ceiling of zero permits a zero-cost step, because zero is an instruction and not an unknown", async () => {
  const zeroKey = `zero_ceiling_${H.slice(0, 8)}`;
  await db.insert(decisionRight).values({
    id: randomUUID(), householdId: H, rightKey: zeroKey, valueCents: 0, valueText: null,
    materiality: "money_legal", status: "recommended", authority: "Q-12b-3 integration test",
  });
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who opens the gate",
    preferredOption: "Marta", decisionRightKey: zeroKey, amountCents: 0, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "preferred");
});

test("a plan permitted but carrying no option on any rung still reaches ask", async () => {
  const id = randomUUID();
  await db.insert(fallbackPlan).values({
    id, householdId: H, choice: "who does the thing nobody named",
    decisionRightKey: CEILING_KEY, amountCents: 100, recordedBy: U,
  });
  const result = walkFallbackLadder({ plan: await planFromDb(id), rights: await rightsFromDb() });
  assert.equal(result.step, "ask");
  assert.match(result.why, /no option on any rung/);
});

test("the evaluation writes no person, which the column list itself proves", async () => {
  const cols = await db.execute(
    `select column_name from information_schema.columns where table_name = 'fallback_plan'` as never,
  ) as unknown as { rows: Array<{ column_name: string }> };
  const names = cols.rows.map((r) => r.column_name);
  assert.ok(names.includes("recorded_by"), "the plan's author is recorded");
  // Deliberate absence, the task_occurrence pattern: no column exists that
  // could attribute the READING of a household's own grant to a person.
  for (const forbidden of ["reached_by", "evaluated_by", "read_by"]) {
    assert.ok(!names.includes(forbidden), `${forbidden} must not exist: who read the grant is not a fact about the grant`);
  }
});
