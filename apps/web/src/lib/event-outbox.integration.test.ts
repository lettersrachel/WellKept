import { test, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { eventOutbox } from "@wellkept/schema";
import { drainEventOutbox } from "@wellkept/trigger-engine";
import { db } from "./db";
import { outboxFieldEvent } from "./field-events";

/**
 * CAND-OUTBOX-01, proven against the real database (local and CI gates
 * alike): the generalized outbox appends transactionally, drains in
 * order through the consumer registry, spends attempts only on kinds
 * that HAVE a consumer, and leaves unknown kinds waiting untouched.
 */
const H = randomUUID();
const created: string[] = [];

// createdAt is set EXPLICITLY and distinctly, and the reason is not
// tidiness. All four rows used to be inserted in one statement, so
// created_at took the transaction timestamp and all four were identical.
// The drain orders by created_at alone (run.ts), and ORDER BY on a tie has
// no defined result, so this test asserted a sequence the executor was free
// to vary. It passed most runs and failed under parallel load, which is a
// broken TEST regardless of what the system should promise: it asserted an
// order the database never agreed to.
//
// This does NOT settle the system question, and must not be read as
// settling it. Whether the DRAIN should carry a total order
// (`createdAt, id`) is a change to shipped ordering semantics and is the
// founder's call, still open as item 2 of NEXT_SESSIONS_2026-08-28.md. If
// that ruling lands as a total order, this test can go back to identical
// timestamps and assert it, which is the stronger test.
const row = (kind: string, payload: Record<string, unknown>, occurredAt: Date, createdAt: Date) => {
  const id = randomUUID();
  created.push(id);
  return { id, householdId: H, kind, payload, occurredAt, createdAt };
};

afterAll(async () => {
  if (created.length) await db.delete(eventOutbox).where(inArray(eventOutbox.id, created));
});

test("a registered consumer processes in order; failures spend attempts; unknown kinds wait untouched", async () => {
  const t = Date.now();
  const first = row("test.echo", { n: 1 }, new Date(t - 3000), new Date(t - 3000));
  const second = row("test.echo", { n: 2 }, new Date(t - 2000), new Date(t - 2000));
  const boom = row("test.boom", { n: 3 }, new Date(t - 1000), new Date(t - 1000));
  const orphan = row("future.kind", { n: 4 }, new Date(t), new Date(t));
  await db.insert(eventOutbox).values([first, second, boom, orphan]);

  const seen: number[] = [];
  const result = await drainEventOutbox(db, {
    consumers: {
      "test.echo": async (_db, householdId, payload) => {
        assert.equal(householdId, H);
        seen.push(Number(payload.n));
      },
      "test.boom": async () => { throw new Error("consumer failed"); },
    },
  });

  assert.deepEqual(seen, [1, 2], "consumed in createdAt order");
  assert.ok(result.processed >= 2);
  assert.ok(result.unconsumed >= 1, "the orphan kind was reported, not dead-lettered");

  const [b] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, boom.id));
  assert.equal(b?.processedAt, null);
  assert.equal(b?.attempts, 1, "the failing consumer spent exactly one attempt");
  const [o] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, orphan.id));
  assert.equal(o?.attempts, 0, "no consumer, no attempts spent");
  assert.equal(o?.processedAt, null);
  const [f] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, first.id));
  assert.ok(f?.processedAt, "the consumed row is stamped");
});

test("outboxFieldEvent appends a field.changed row inside the caller's transaction", async () => {
  const fieldId = randomUUID();
  await db.transaction(async (tx) => {
    await outboxFieldEvent(tx as never, {
      householdId: H, fieldId, fieldName: "medication", section: 9,
      newValue: "updated dosage", changedAt: "2026-08-24T10:00:00.000Z",
    });
  });
  const rows = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  const mine = rows.find((r) => (r.payload as { fieldId?: string }).fieldId === fieldId);
  assert.ok(mine, "the outbox row landed");
  created.push(mine.id);
  assert.equal(mine.kind, "field.changed");
  const p = mine.payload as Record<string, unknown>;
  assert.equal(p.fieldName, "medication");
  assert.equal(p.section, 9);
  assert.equal(p.changedAt, "2026-08-24T10:00:00.000Z");
  assert.equal(mine.processedAt, null, "unprocessed until a drain consumes it");
  // WK-DEV-010 s4 (0046): the envelope rides every field event. The
  // caller passed no envelope, so the honest defaults land: s2 (the one
  // payload kind carrying plaintext values), no actor, version 1.
  assert.equal(mine.provenance, "web:field-events");
  assert.equal(mine.objectId, fieldId);
  assert.equal(mine.sensitivity, "s2");
  assert.equal(mine.actor, null);
  assert.equal(mine.eventVersion, 1);
});

test("emitOutboxEvent stamps the s4 envelope; id-only payloads default to s1", async () => {
  const { emitOutboxEvent } = await import("@wellkept/schema");
  const objectId = randomUUID();
  let eventId = "";
  await db.transaction(async (tx) => {
    eventId = await emitOutboxEvent(tx as never, {
      householdId: H, kind: "test.envelope", payload: { someId: objectId },
      provenance: "test:event-law", objectId, correlationId: objectId,
    });
  });
  created.push(eventId);
  const [row] = await db.select().from(eventOutbox).where(eq(eventOutbox.id, eventId));
  assert.ok(row, "the event landed under its returned id");
  assert.equal(row.provenance, "test:event-law");
  assert.equal(row.objectId, objectId);
  assert.equal(row.correlationId, objectId);
  assert.equal(row.sensitivity, "s1", "ids and vocabulary only is the s1 default");
  assert.equal(row.actor, null);
  assert.equal(row.eventVersion, 1);
});
