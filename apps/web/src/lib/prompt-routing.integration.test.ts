import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { household, authUser, triggerRule, promptPackItem, decisionRight, eventOutbox } from "@wellkept/schema";
import { routePromptItem } from "@wellkept/trigger-engine";
import { db } from "./db";

/**
 * Q-6's routing clause, moved here from Q-5 by founder ruling. FOUR
 * DIRECTIONS AGAINST REAL `decision_right` ROWS, in the order the
 * founder set: the null-threshold case first.
 *
 * The pure function has had unit tests since Q-6-2 and had never once
 * been run against a row that was really in the database; it took an
 * array a test built. That is the difference this file exists for, and
 * it is the standing rule that a gate whose input comes from outside the
 * process is exercised against real inputs before it is trusted.
 */
const H = randomUUID();
const U = `route-test-${H.slice(0, 8)}`;
const RULE = randomUUID();

async function newItem(): Promise<string> {
  const id = randomUUID();
  await db.insert(promptPackItem).values({
    id, householdId: H, triggerRuleId: RULE, packKey: "test_pack", packName: "Test pack",
    itemText: "a prompt", fireAt: new Date(), stage: "anticipate",
  });
  return id;
}

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `Route Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
  await db.insert(triggerRule).values({
    id: RULE, householdId: H, family: "calendar",
    definition: { packKey: "test_pack", packName: "Test pack", items: [] },
  });
});

afterAll(async () => {
  await db.delete(eventOutbox).where(eq(eventOutbox.householdId, H));
  await db.delete(promptPackItem).where(eq(promptPackItem.householdId, H));
  await db.delete(decisionRight).where(eq(decisionRight.householdId, H));
  await db.delete(triggerRule).where(eq(triggerRule.id, RULE));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("DIRECTION 1, the null-threshold case: no right on record proposes, and the item is stamped decide", async () => {
  // The household has NO decision rights at all. This is the direction
  // that matters most, because it is the state a household is in before
  // anyone configures anything, and the safe answer has to be the one a
  // missing row falls into rather than an exception somebody wrote.
  const rights = await db.select().from(decisionRight).where(eq(decisionRight.householdId, H));
  assert.equal(rights.length, 0, "precondition: the household really has no rights on record");

  const item = await newItem();
  const r = await routePromptItem(db as never, {
    householdId: H, promptPackItemId: item, rightKey: "routine_supply_spend", amountCents: 500,
  });
  assert.equal(r.outcome, "propose");
  assert.match(r.why, /no decision right on record/);
  assert.equal(r.stamped, "decide");

  const [row] = await db.select().from(promptPackItem).where(eq(promptPackItem.id, item));
  assert.equal(row!.stage, "decide", "read back from the database, not from the return value");
});

test("DIRECTION 2, a right recorded in WORDS proposes, against a real row", async () => {
  await db.insert(decisionRight).values({
    id: randomUUID(), householdId: H, rightKey: "substitute_products",
    valueCents: null, valueText: "approved_substitute_only",
    materiality: "convenience", status: "recommended", authority: "test fixture",
  });
  const item = await newItem();
  const r = await routePromptItem(db as never, {
    householdId: H, promptPackItemId: item, rightKey: "substitute_products", amountCents: 100,
  });
  assert.equal(r.outcome, "propose");
  assert.match(r.why, /recorded in words/);
  const [row] = await db.select().from(promptPackItem).where(eq(promptPackItem.id, item));
  assert.equal(row!.stage, "decide");
});

test("DIRECTION 3, at or below a real ceiling permits acting, and NOTHING is stamped", async () => {
  await db.insert(decisionRight).values({
    id: randomUUID(), householdId: H, rightKey: "routine_supply_spend",
    valueCents: 15000, valueText: null,
    materiality: "money_legal", status: "recommended", authority: "test fixture",
  });
  const item = await newItem();
  const r = await routePromptItem(db as never, {
    householdId: H, promptPackItemId: item, rightKey: "routine_supply_spend", amountCents: 15000,
  });
  assert.equal(r.outcome, "permitted_without_asking", "the boundary is inclusive");
  assert.equal(r.stamped, null);

  // The stage is UNCHANGED, and that is the reported gap rather than an
  // oversight: the spec names five movements and gives four values, with
  // `execution` absent, so there is no value to stamp here.
  const [row] = await db.select().from(promptPackItem).where(eq(promptPackItem.id, item));
  assert.equal(row!.stage, "anticipate");
});

test("DIRECTION 4, one cent above the same real ceiling reaches the inbox as decide", async () => {
  const item = await newItem();
  const r = await routePromptItem(db as never, {
    householdId: H, promptPackItemId: item, rightKey: "routine_supply_spend", amountCents: 15001,
  });
  assert.equal(r.outcome, "propose");
  assert.match(r.why, /above the household's ceiling/);
  const [row] = await db.select().from(promptPackItem).where(eq(promptPackItem.id, item));
  assert.equal(row!.stage, "decide");
});

test("every routing decision is logged, whichever way it went", async () => {
  const events = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  const routed = events.filter((e) => e.kind === "prompt_pack_item.routed");
  assert.equal(routed.length, 4, "one event per direction, including the one that acted without asking");
  const outcomes = routed.map((e) => (e.payload as { outcome: string }).outcome).sort();
  assert.deepEqual(outcomes, ["permitted_without_asking", "propose", "propose", "propose"]);
});
