import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  household, authUser, conditionFlag, objectObservation, deferral,
  pausedDecision, visitCommand,
} from "@wellkept/schema";
import { db } from "./db";
import { applyVisitCommand } from "./visit-command-store";

/**
 * Input spine build 1, proven against the REAL database (local dev and the
 * CI gates job both run migrated postgres before this suite). Each new
 * command type: applies with route-stamped attribution, replays its
 * idempotencyKey without double-writing, and records a conflict with a
 * named reason instead of dropping a bad or target-missing command. The
 * database's own CHECKs (resolution_is_whole, close_is_reasoned) are live
 * under these writes, which is the point of testing here instead of
 * against a mock.
 */
const H = randomUUID();
const U = `spine-test-${H.slice(0, 8)}`;
const created: { flags: string[]; commands: string[] } = { flags: [], commands: [] };

const apply = (type: Parameters<typeof applyVisitCommand>[0]["type"], payload: Record<string, unknown>, key = randomUUID()) => {
  created.commands.push(key);
  return applyVisitCommand({
    idempotencyKey: key, type,
    payload: { householdId: H, submittedBy: U, submittedByRole: "house_manager", ...payload },
  }).then((r) => ({ ...r, key }));
};

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `Spine Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
});

afterAll(async () => {
  await db.delete(objectObservation).where(eq(objectObservation.householdId, H));
  await db.delete(conditionFlag).where(eq(conditionFlag.householdId, H));
  await db.delete(deferral).where(eq(deferral.householdId, H));
  await db.delete(pausedDecision).where(eq(pausedDecision.householdId, H));
  if (created.commands.length) await db.delete(visitCommand).where(inArray(visitCommand.id, created.commands));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("flag.create applies attributed, replays idempotently, and refuses by reason", async () => {
  const flagId = randomUUID();
  created.flags.push(flagId);
  const key = randomUUID();
  const first = await apply("flag.create", {
    id: flagId, subject: "grout", location: "guest bathroom",
    concern: "cracking along the rear shower wall", revisitCondition: "after the next deep clean",
  }, key);
  assert.equal(first.conflict, false);
  const [row] = await db.select().from(conditionFlag).where(eq(conditionFlag.id, flagId));
  assert.ok(row, "flag row missing");
  assert.equal(row.raisedBy, U);
  assert.equal(row.status, "open");

  // replay: recorded outcome, no second row
  created.commands.push(key);
  const replay = await applyVisitCommand({ idempotencyKey: key, type: "flag.create", payload: { householdId: H, submittedBy: U, id: flagId, subject: "x", location: "y", concern: "zzzz", revisitCondition: "c" } });
  assert.equal(replay.conflict, false);
  const rows = await db.select().from(conditionFlag).where(eq(conditionFlag.householdId, H));
  assert.equal(rows.length, 1);

  // invalid: conflict with the validator's named reason, command row kept
  const bad = await apply("flag.create", { subject: "g", location: "y", concern: "zzzz", revisitCondition: "c" });
  assert.equal(bad.conflict, true);
  const [badCmd] = await db.select().from(visitCommand).where(eq(visitCommand.id, bad.key));
  assert.equal(badCmd?.status, "conflict");
  assert.equal(badCmd?.reason, "bad_input:text");
});

test("flag.look and flag.close mirror the action semantics against a live flag", async () => {
  const flagId = created.flags[0]!;
  const look = await apply("flag.look", { flagId, value: "4", note: "holding" });
  assert.equal(look.conflict, false);
  const obs = await db.select().from(objectObservation).where(eq(objectObservation.conditionFlagId, flagId));
  assert.equal(obs.length, 1);
  assert.equal(obs[0]!.recordedBy, U);
  assert.equal(obs[0]!.value, 4);

  const close = await apply("flag.close", { flagId, closeReason: "regrouted and sealed" });
  assert.equal(close.conflict, false);
  const [closed] = await db.select().from(conditionFlag).where(eq(conditionFlag.id, flagId));
  assert.equal(closed?.status, "closed");
  assert.equal(closed?.closedBy, U);

  // a look on the now-closed flag is a named conflict, not a silent no-op
  const late = await apply("flag.look", { flagId, value: "2" });
  assert.equal(late.conflict, true);
  const [lateCmd] = await db.select().from(visitCommand).where(eq(visitCommand.id, late.key));
  assert.equal(lateCmd?.reason, "missing_flag");
});

test("deferral.resolve and pausedDecision.resolve write the whole resolution triple", async () => {
  const dId = randomUUID();
  await db.insert(deferral).values({
    id: dId, householdId: H, noticed: "gutter joint", reason: "sealed area needs dry weather",
    revisitCondition: "first dry week", decidedBy: U, decidedAt: new Date(),
  });
  const ok = await apply("deferral.resolve", { deferralId: dId, resolution: "done" });
  assert.equal(ok.conflict, false);
  const [d] = await db.select().from(deferral).where(eq(deferral.id, dId));
  assert.equal(d?.resolution, "done");
  assert.equal(d?.resolvedBy, U);
  assert.ok(d?.resolvedAt);

  // already resolved: named conflict
  const again = await apply("deferral.resolve", { deferralId: dId, resolution: "superseded" });
  assert.equal(again.conflict, true);

  const pId = randomUUID();
  await db.insert(pausedDecision).values({
    id: pId, householdId: H, decision: "water softener vendor", research: "two quotes on file, waiting on a third",
    revisitCondition: "third quote arrives", pausedBy: U, pausedAt: new Date(),
  });
  const pok = await apply("pausedDecision.resolve", { pausedDecisionId: pId, resolution: "no_longer_needed" });
  assert.equal(pok.conflict, false);
  const [p] = await db.select().from(pausedDecision).where(eq(pausedDecision.id, pId));
  assert.equal(p?.resolution, "no_longer_needed");
  assert.equal(p?.resolvedBy, U);
});

test("cross-household targets conflict instead of applying (isolation at the sink)", async () => {
  // a deferral in ANOTHER household, targeted from ours: missing, never touched
  const otherH = randomUUID();
  const otherD = randomUUID();
  await db.insert(household).values({ id: otherH, name: `Spine Other ${otherH.slice(0, 8)}`, tier: "essential", isFixture: true });
  try {
    await db.insert(deferral).values({
      id: otherD, householdId: otherH, noticed: "other home item", reason: "belongs to another household",
      revisitCondition: "never from here", decidedBy: U, decidedAt: new Date(),
    });
    const res = await apply("deferral.resolve", { deferralId: otherD, resolution: "done" });
    assert.equal(res.conflict, true);
    const [untouched] = await db.select().from(deferral).where(eq(deferral.id, otherD));
    assert.equal(untouched?.resolvedAt, null);
  } finally {
    await db.delete(deferral).where(eq(deferral.id, otherD));
    await db.delete(household).where(eq(household.id, otherH));
  }
});
