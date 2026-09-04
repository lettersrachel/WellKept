import { test, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { eventOutbox, household, emitOutboxEvent } from "@wellkept/schema";
import { drainEventOutbox } from "@wellkept/trigger-engine";
import { db } from "./db";

/**
 * Q-3b (0063), proven against the real database: causation_id rides
 * the s4 envelope through emitOutboxEvent, the composite self-FK makes
 * cross-tenant causation UNREPRESENTABLE (the 0056 situation pattern
 * turned inward), the erasure shape survives (one household-keyed
 * DELETE removes parent and child together, FK enforcement being
 * end-of-statement), and a family-catalog kind flows through the drain
 * exactly as any registered kind, which is the queue row's second
 * acceptance clause. Every stored claim is read back by SELECT (G-72).
 */

const A = randomUUID();
const B = randomUUID();

afterAll(async () => {
  await db.delete(eventOutbox).where(inArray(eventOutbox.householdId, [A, B]));
  await db.delete(household).where(inArray(household.id, [A, B]));
});

async function ensureHouseholds() {
  await db.insert(household).values([
    { id: A, name: "Q-3b causation test A", tier: "essential" },
    { id: B, name: "Q-3b causation test B", tier: "essential" },
  ]).onConflictDoNothing();
}

test("emitOutboxEvent stores causation; a caused chain reads back whole", async () => {
  await ensureHouseholds();
  const parentId = await emitOutboxEvent(db, {
    householdId: A, kind: "expectation.probe", payload: { n: 1 },
    provenance: "test:q3b", objectId: randomUUID(),
  });
  const correlation = randomUUID();
  const childId = await emitOutboxEvent(db, {
    householdId: A, kind: "expectation.result", payload: { n: 2 },
    provenance: "test:q3b", objectId: randomUUID(),
    correlationId: correlation, causationId: parentId,
  });
  const [child] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, childId));
  assert.equal(child!.causationId, parentId, "the stored row names its parent");
  assert.equal(child!.correlationId, correlation, "correlation and causation are separate facts");
  const [parent] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, parentId));
  assert.equal(parent!.causationId, null, "an uncaused event stays null, the honest default");
});

test("cross-tenant causation is unrepresentable, and so is a parent that does not exist", async () => {
  await ensureHouseholds();
  const parentB = await emitOutboxEvent(db, {
    householdId: B, kind: "expectation.probe", payload: {},
    provenance: "test:q3b", objectId: randomUUID(),
  });
  // Drizzle wraps the pg error; the constraint name lives in the CAUSE,
  // so the predicate reads err.cause rather than err.message.
  const refusedByFk = (err: unknown) =>
    /event_outbox_causation_same_household_fk/.test(String((err as { cause?: unknown }).cause ?? err));
  await assert.rejects(
    emitOutboxEvent(db, {
      householdId: A, kind: "expectation.result", payload: {},
      provenance: "test:q3b", objectId: randomUUID(), causationId: parentB,
    }),
    refusedByFk,
    "household A naming household B's event must refuse at the constraint",
  );
  await assert.rejects(
    emitOutboxEvent(db, {
      householdId: A, kind: "expectation.result", payload: {},
      provenance: "test:q3b", objectId: randomUUID(),
      causationId: "00000000-0000-7000-8000-00000000dead",
    }),
    refusedByFk,
    "a parent that does not exist must refuse",
  );
});

test("the erasure shape: one household-keyed DELETE removes parent and child together", async () => {
  await ensureHouseholds();
  const parentId = await emitOutboxEvent(db, {
    householdId: A, kind: "expectation.probe", payload: {},
    provenance: "test:q3b", objectId: randomUUID(),
  });
  await emitOutboxEvent(db, {
    householdId: A, kind: "expectation.result", payload: {},
    provenance: "test:q3b", objectId: randomUUID(), causationId: parentId,
  });
  await db.delete(eventOutbox).where(eq(eventOutbox.householdId, A));
  const left = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, A));
  assert.equal(left.length, 0, "the erasure statement clears causation chains in one pass");
});

test("acceptance: a family-catalog kind, emitted with causation, drains as a registered kind", async () => {
  await ensureHouseholds();
  const parentId = await emitOutboxEvent(db, {
    householdId: A, kind: "expectation.window_opened", payload: {},
    provenance: "test:q3b", objectId: randomUUID(),
  });
  const eventId = await emitOutboxEvent(db, {
    householdId: A, kind: "expectation.window_passed", payload: { probe: true },
    provenance: "test:q3b", objectId: randomUUID(), causationId: parentId,
  });
  const seen: Array<{ householdId: string; payload: Record<string, unknown> }> = [];
  await drainEventOutbox(db, {
    consumers: {
      "expectation.window_passed": async (_db, householdId, payload) => {
        seen.push({ householdId, payload });
      },
    },
  });
  assert.equal(seen.length, 1, "the family kind was consumed exactly once");
  assert.equal(seen[0]!.householdId, A);
  const [row] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, eventId));
  assert.ok(row!.processedAt, "the consumed row is stamped processed, read back by SELECT");
  assert.equal(row!.causationId, parentId, "causation survived the drain untouched");
  const [parent] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, parentId));
  assert.equal(parent!.processedAt, null, "the unconsumed parent kind keeps its left-waiting semantics");
});
