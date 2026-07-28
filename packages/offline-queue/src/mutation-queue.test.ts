import { test } from "vitest";
import assert from "node:assert/strict";
import { OfflineMutationQueue, backoffDelayMs } from "./index";

test("queue preserves order across network failure and records last-write-wins conflicts", async () => {
  const queue = new OfflineMutationQueue();
  queue.enqueue({ type: "visit.submit", idempotencyKey: "one", payload: { householdId: "h" } });
  queue.enqueue({ type: "dot.create", idempotencyKey: "two", payload: { householdId: "h" } });

  let calls = 0;
  await queue.drain(async () => {
    calls += 1;
    if (calls === 1) throw new Error("offline");
  });
  assert.equal(queue.pending().length, 2);

  const sent = await queue.drain(async (item) =>
    item.type === "visit.submit" ? { conflict: true, reason: "server version changed" } : {},
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.type, "dot.create");
  assert.equal(queue.conflicts().length, 1);
  assert.equal(queue.pending().length, 0);
});

test("AF: a failing head blocks the tail, dead-letters at the cap, and the dead head still blocks", async () => {
  const queue = new OfflineMutationQueue();
  queue.enqueue({ type: "visit.submit", idempotencyKey: "head", payload: { householdId: "h" } });
  queue.enqueue({ type: "dot.create", idempotencyKey: "tail", payload: { householdId: "h" } });

  const attempted: string[] = [];
  const failingHead = async (item: { idempotencyKey: string }) => {
    attempted.push(item.idempotencyKey);
    if (item.idempotencyKey === "head") throw new Error("boom");
    return {};
  };

  // Two failed drains under a cap of 3: head stays pending, tail never tried.
  await queue.drain(failingHead, { maxAttempts: 3 });
  await queue.drain(failingHead, { maxAttempts: 3 });
  assert.deepEqual(attempted, ["head", "head"]);
  assert.equal(queue.pending().length, 2);
  assert.equal(queue.dead().length, 0);

  // Third failure reaches the cap: head is dead, tail STILL blocked.
  await queue.drain(failingHead, { maxAttempts: 3 });
  assert.equal(queue.dead().length, 1);
  assert.equal(queue.pending().length, 1); // the tail, undrained
  const sent = await queue.drain(async () => ({}), { maxAttempts: 3 });
  assert.equal(sent.length, 0, "a dead head must block the tail until the operator acts");
});

test("AF: operator retry gives fresh attempts and a subsequent success drains in order; discard removes only dead items", async () => {
  const queue = new OfflineMutationQueue();
  const head = queue.enqueue({ type: "visit.submit", idempotencyKey: "head", payload: { householdId: "h" } });
  queue.enqueue({ type: "dot.create", idempotencyKey: "tail", payload: { householdId: "h" } });

  await queue.drain(async () => { throw new Error("down"); }, { maxAttempts: 1 });
  assert.equal(queue.dead().length, 1);

  // Discard refuses non-dead items.
  assert.equal(queue.discardDead("not-an-id"), null);
  const tailItem = queue.pending()[0]!;
  assert.equal(queue.discardDead(tailItem.id), null, "a pending item is not discardable");

  // Retry revives with a fresh attempt budget, then a healthy transport
  // drains both, head first.
  const revived = queue.retryDead(head.id);
  assert.equal(revived?.attempts, 0);
  const order: string[] = [];
  const sent = await queue.drain(async (item) => { order.push(item.idempotencyKey); return {}; }, { maxAttempts: 3 });
  assert.equal(sent.length, 2);
  assert.deepEqual(order, ["head", "tail"]);

  // Dead-letter again, then discard returns the removed item (the caller's
  // audit write depends on getting it back).
  const head2 = queue.enqueue({ type: "visit.submit", idempotencyKey: "head2", payload: { householdId: "h" } });
  await queue.drain(async () => { throw new Error("down"); }, { maxAttempts: 1 });
  const removed = queue.discardDead(head2.id);
  assert.equal(removed?.idempotencyKey, "head2");
  assert.equal(queue.dead().length, 0);
});

test("AF: restore re-enters attempts and dead state across a rehydration", async () => {
  const queue = new OfflineMutationQueue();
  const item = queue.enqueue(
    { type: "visit.submit", idempotencyKey: "k", payload: { householdId: "h" } },
    { attempts: 7, state: "dead" },
  );
  assert.equal(item.state, "dead");
  assert.equal(item.attempts, 7);
  assert.equal(queue.dead().length, 1);
});

test("AF: backoff is exponential and bounded", () => {
  assert.equal(backoffDelayMs(0), 5_000);
  assert.equal(backoffDelayMs(1), 10_000);
  assert.equal(backoffDelayMs(3), 40_000);
  assert.equal(backoffDelayMs(50), 300_000, "the cap holds however long the streak");
  assert.equal(backoffDelayMs(2, { baseMs: 1_000, capMs: 3_000 }), 3_000);
});
