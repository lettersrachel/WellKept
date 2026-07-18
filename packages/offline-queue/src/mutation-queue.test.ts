import { test } from "vitest";
import assert from "node:assert/strict";
import { OfflineMutationQueue } from "./index";

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
