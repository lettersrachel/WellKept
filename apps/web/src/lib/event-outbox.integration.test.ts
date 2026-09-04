import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { eventOutbox, household } from "@wellkept/schema";
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

// 0064 (Q-4): event_outbox.household_id now carries a real FK, so the
// suite's household needs a parent row, the causation suite's shape.
beforeAll(async () => {
  await db.insert(household).values({ id: H, name: "outbox test household", tier: "essential" }).onConflictDoNothing();
});

afterAll(async () => {
  if (created.length) await db.delete(eventOutbox).where(inArray(eventOutbox.id, created));
  await db.delete(eventOutbox).where(eq(eventOutbox.householdId, H));
  await db.delete(household).where(eq(household.id, H));
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

test("A2 acceptance (G-114): a 500-row backlog drains to zero across consecutive runs, THROUGH an older wall of consumer-less rows, and the metric lands", async () => {
  // The starvation shape, deliberately: 150 consumer-less rows OLDER than
  // every consumable row. Under the pre-ruling drain the first batch was
  // 100 of these and processed nothing, forever; the ruling's WHERE keeps
  // them waiting OUTSIDE the window.
  const t = Date.now() - 10_000_000;
  const wall = Array.from({ length: 150 }, (_, i) =>
    row("a2.unshipped", { i }, new Date(t + i), new Date(t + i)));
  const backlog = Array.from({ length: 500 }, (_, i) =>
    row("a2.echo", { i }, new Date(t + 1_000_000 + i), new Date(t + 1_000_000 + i)));
  for (let i = 0; i < wall.length; i += 100) await db.insert(eventOutbox).values(wall.slice(i, i + 100));
  for (let i = 0; i < backlog.length; i += 100) await db.insert(eventOutbox).values(backlog.slice(i, i + 100));

  const consumers = { "a2.echo": async () => {} };
  let runs = 0;
  let last = { processed: -1, rowsWaitingAfterRun: -1 };
  // Five full batches drain 500; the guard rail stops a broken drain from
  // looping forever rather than asserting a hand-carried run count.
  while (runs < 10) {
    last = await drainEventOutbox(db, { consumers });
    runs += 1;
    if (last.processed === 0) break;
    assert.equal(last.processed, 100, "each full run drains a whole window despite the older wall");
  }
  const myIds = [...wall, ...backlog].map((r) => r.id);
  const remaining = await db.select().from(eventOutbox)
    .where(inArray(eventOutbox.id, myIds));
  const consumable = remaining.filter((r) => r.kind === "a2.echo" && r.processedAt === null);
  const waitingWall = remaining.filter((r) => r.kind === "a2.unshipped" && r.processedAt === null);
  assert.equal(consumable.length, 0, "the backlog drained to zero across consecutive runs");
  assert.equal(waitingWall.length, 150, "consumer-less rows keep waiting, none dead-lettered");
  assert.ok(waitingWall.every((r) => r.attempts === 0), "waiting rows spend no attempts");

  // The metric: emitted by the drain, counts ALL waiting rows after the
  // run (this suite's other tests may have residue, so >= the wall).
  const { appSetting } = await import("@wellkept/schema");
  const [status] = await db.select().from(appSetting).where(eq(appSetting.key, "outbox_drain_status"));
  assert.ok(status, "the drain emitted its status row");
  const v = status.value as { lastRunAt?: string; rowsWaitingAfterRun?: number };
  assert.ok(v.lastRunAt && Number.isFinite(Date.parse(v.lastRunAt)), "lastRunAt is a real instant");
  assert.ok((v.rowsWaitingAfterRun ?? -1) >= 150, "the wall is visible in the metric");
  assert.equal(v.rowsWaitingAfterRun, last.rowsWaitingAfterRun, "the stored metric is the run's own count");
});
