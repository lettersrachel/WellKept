import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  household, authUser, taskDefinition, householdTaskProfile, workRequirement,
  changeset, changesetEffect, attentionRecord, decisionRecord, eventOutbox,
} from "@wellkept/schema";
import { propagateChangeset, lockedDependents, supersedeInvalidated } from "@wellkept/trigger-engine";
import { db } from "./db";

/**
 * Q-12b-2 on the REAL database. The acceptance criterion's own example:
 * soccer moves Saturday to Sunday, dependent work is affected, and
 * nothing reaches the member.
 */
const H = randomUUID();
const U = `cs-test-${H.slice(0, 8)}`;
const DEF = randomUUID();
const PROF = randomUUID();
const FUTURE_REQ = randomUUID();
const PAST_REQ = randomUUID();
const DONE_REQ = randomUUID();
const CS = randomUUID();
const LATER_CS = randomUUID();

const iso = (d: Date) => d.toISOString().slice(0, 10);

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `CS Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
  await db.insert(taskDefinition).values({
    id: DEF, name: `saturday soccer run ${H.slice(0, 8)}`, provisional: true, createdBy: U,
  });
  await db.insert(householdTaskProfile).values({
    id: PROF, householdId: H, taskDefinitionId: DEF, active: true, cadence: "weekly", configuredBy: U,
  });
  const future = iso(new Date(Date.now() + 7 * 24 * 3600 * 1000));
  const past = iso(new Date(Date.now() - 7 * 24 * 3600 * 1000));
  await db.insert(workRequirement).values([
    { id: FUTURE_REQ, householdId: H, taskProfileId: PROF, dueOn: future, status: "scheduled", createdBy: U },
    { id: PAST_REQ, householdId: H, taskProfileId: PROF, dueOn: past, status: "scheduled", createdBy: U },
    {
      id: DONE_REQ, householdId: H, taskProfileId: PROF, dueOn: iso(new Date(Date.now() + 3 * 24 * 3600 * 1000)),
      status: "completed", completedAt: new Date(), completedBy: U, createdBy: U,
    },
  ]);
  await db.insert(changeset).values({
    id: CS, householdId: H, sourceKind: "schedule",
    whatChanged: "soccer moves Saturday to Sunday", detectedAt: new Date(), recordedBy: U,
  });
});

afterAll(async () => {
  await db.delete(eventOutbox).where(eq(eventOutbox.householdId, H));
  await db.delete(changesetEffect).where(eq(changesetEffect.householdId, H));
  await db.delete(changeset).where(eq(changeset.householdId, H));
  await db.delete(workRequirement).where(eq(workRequirement.householdId, H));
  await db.delete(householdTaskProfile).where(eq(householdTaskProfile.householdId, H));
  await db.delete(taskDefinition).where(eq(taskDefinition.id, DEF));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("propagation marks open work dated on or after the change, and nothing else", async () => {
  const { effects } = await propagateChangeset(db as never, { changesetId: CS, householdId: H });
  assert.equal(effects, 1, "only the open future requirement is a dependent");

  const rows = await db.select().from(changesetEffect).where(eq(changesetEffect.householdId, H));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.dependentId, FUTURE_REQ);
  assert.equal(rows[0]!.effect, "invalidated");
  assert.match(rows[0]!.reason, /may have made it wrong/);

  // The two exclusions, each asserted rather than implied: work already
  // done cannot be invalidated by something that happened afterwards,
  // and work dated before the change was executed against the old world
  // correctly.
  const ids = rows.map((r) => r.dependentId);
  assert.ok(!ids.includes(DONE_REQ), "completed work is not a dependent");
  assert.ok(!ids.includes(PAST_REQ), "work dated before the change is not a dependent");
});

test("THE MEMBER IS NOT TOLD, and the HOM briefing does not change", async () => {
  const attention = await db.select().from(attentionRecord).where(eq(attentionRecord.householdId, H));
  assert.equal(attention.length, 0, "an attention record would reach the previsit brief");
  const decisions = await db.select().from(decisionRecord).where(eq(decisionRecord.householdId, H));
  assert.equal(decisions.length, 0);
  const [cs] = await db.select().from(changeset).where(eq(changeset.id, CS));
  assert.equal(cs!.memberTradeoff, null, "no producer writes a tradeoff today");
});

test("propagation is idempotent: a second pass records nothing and emits nothing", async () => {
  const before = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  const again = await propagateChangeset(db as never, { changesetId: CS, householdId: H });
  assert.equal(again.effects, 0);
  const after = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  assert.equal(after.length, before.length);
  assert.equal(before.filter((e) => e.kind === "changeset.propagated").length, 1);
});

test("the lock horizon is quiet while null, and locks only inside the window once set", () => {
  const today = new Date("2026-09-05T12:00:00Z");
  const soon = { id: "a", dueOn: "2026-09-08" };
  const later = { id: "b", dueOn: "2026-10-08" };
  const undated = { id: "c", dueOn: null };
  // Null is QUIET, not permissive: with no horizon nothing is near-term.
  assert.deepEqual(lockedDependents({ horizonDays: null, today, dependents: [soon, later, undated] }), []);
  assert.deepEqual(lockedDependents({ horizonDays: 7, today, dependents: [soon, later, undated] }), ["a"]);
  assert.deepEqual(lockedDependents({ horizonDays: 60, today, dependents: [soon, later, undated] }), ["a", "b"]);
});

test("applying supersedes the open dependents, and ONLY the open ones", async () => {
  // The founder's 5 September ruling, and the two halves are asserted
  // separately because they are different claims.
  const before = await db.select().from(workRequirement).where(eq(workRequirement.id, FUTURE_REQ));
  assert.equal(before[0]!.status, "scheduled", "precondition: the dependent is still open");

  // Complete the OTHER dependent-shaped row first, so the "only open"
  // half has something real to be true about rather than being vacuous.
  await db.update(workRequirement)
    .set({ status: "completed", completedAt: new Date(), completedBy: U })
    .where(eq(workRequirement.id, PAST_REQ));

  const { superseded } = await supersedeInvalidated(db as never, { changesetId: CS, householdId: H });
  assert.equal(superseded, 1);

  const [future] = await db.select().from(workRequirement).where(eq(workRequirement.id, FUTURE_REQ));
  assert.equal(future!.status, "superseded", "read back from Postgres, not from the return value");

  // Work that was already done is left exactly as it was: rewriting it
  // would be a machine making a false claim about the past.
  const [done] = await db.select().from(workRequirement).where(eq(workRequirement.id, DONE_REQ));
  assert.equal(done!.status, "completed");

  const events = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  assert.equal(events.filter((e) => e.kind === "work_requirement.superseded").length, 1);
});

test("a superseded requirement is not a dependent of the NEXT change", async () => {
  await db.insert(changeset).values({
    id: LATER_CS, householdId: H, sourceKind: "schedule",
    whatChanged: "soccer moves again", detectedAt: new Date(), recordedBy: U,
  });
  const { effects } = await propagateChangeset(db as never, { changesetId: LATER_CS, householdId: H });
  assert.equal(effects, 0, "nothing open remains: superseded and completed are both out of the set");
});

test("superseding is idempotent and never re-supersedes", async () => {
  const again = await supersedeInvalidated(db as never, { changesetId: CS, householdId: H });
  assert.equal(again.superseded, 0, "the status filter is the guarantee, not the effect row");
});
