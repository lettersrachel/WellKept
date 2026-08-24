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

const row = (kind: string, payload: Record<string, unknown>, occurredAt: Date) => {
  const id = randomUUID();
  created.push(id);
  return { id, householdId: H, kind, payload, occurredAt };
};

afterAll(async () => {
  if (created.length) await db.delete(eventOutbox).where(inArray(eventOutbox.id, created));
});

test("a registered consumer processes in order; failures spend attempts; unknown kinds wait untouched", async () => {
  const first = row("test.echo", { n: 1 }, new Date(Date.now() - 3000));
  const second = row("test.echo", { n: 2 }, new Date(Date.now() - 2000));
  const boom = row("test.boom", { n: 3 }, new Date(Date.now() - 1000));
  const orphan = row("future.kind", { n: 4 }, new Date());
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
});
