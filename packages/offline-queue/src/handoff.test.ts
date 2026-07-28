import { test } from "vitest";
import assert from "node:assert/strict";
import { OfflineMutationQueue } from "./index";
import { rehydrate, type HandoffStore, type PersistedRecord } from "./handoff";

/** In-memory store that LOGS every operation, so the durable-copy
 * invariant is checkable by replaying the log. */
function makeStore(initial: PersistedRecord[]) {
  const records = new Map(initial.map((r) => [r.recordId, r]));
  const log: Array<{ op: "put" | "delete"; recordId: string; key?: string }> = [];
  const store: HandoffStore = {
    async getRecordsForHousehold(householdId) {
      return [...records.values()]
        .filter((r) => r.householdId === householdId)
        .sort((a, b) => a.sequence - b.sequence);
    },
    async putRecord(record) {
      records.set(record.recordId, record);
      log.push({ op: "put", recordId: record.recordId, key: record.command.idempotencyKey });
    },
    async deleteRecords(ids) {
      for (const id of ids) {
        const r = records.get(id);
        records.delete(id);
        log.push({ op: "delete", recordId: id, key: r?.command.idempotencyKey });
      }
    },
  };
  return { store, records, log, initial: [...initial] };
}

const rec = (recordId: string, key: string, sequence: number, extra: Partial<PersistedRecord> = {}): PersistedRecord => ({
  recordId, householdId: "h", sequence,
  command: { type: "visit.submit", idempotencyKey: key, payload: { householdId: "h" } },
  conflictReason: null, ...extra,
});

test("AK: the handoff keeps a durable copy at every instant (put-new before delete-old)", async () => {
  const { store, records, log, initial } = makeStore([rec("r1", "k1", 1), rec("r2", "k2", 2)]);
  const queue = new OfflineMutationQueue();
  await rehydrate(queue, store, "h");

  assert.equal(queue.pending().length, 2);
  assert.equal(records.size, 2, "one durable copy per command after the handoff");

  // Replay the log over the initial state: after EVERY operation, every
  // claimed command must still have at least one durable copy. This is
  // the invariant the old delete-then-rewrite handoff violated (G-52).
  const live = new Map(initial.map((r) => [r.recordId, r.command.idempotencyKey]));
  for (const entry of log) {
    if (entry.op === "put") live.set(entry.recordId, entry.key!);
    else live.delete(entry.recordId);
    for (const key of ["k1", "k2"]) {
      const stillClaimed = [...live.values()].includes(key);
      // A command may be deleted only once its new copy exists.
      const wasClaimedYet = log.indexOf(entry) >= log.findIndex((e) => e.key === key);
      if (wasClaimedYet) assert.ok(stillClaimed, `command ${key} lost its durable copy mid-handoff`);
    }
  }
});

test("AK: duplicates from a crashed handoff dedupe by idempotencyKey, safe copy first", async () => {
  const { store, records } = makeStore([rec("old", "k1", 1), rec("dup", "k1", 2), rec("r3", "k2", 3)]);
  const queue = new OfflineMutationQueue();
  await rehydrate(queue, store, "h");
  assert.equal(queue.pending().length, 2, "one queue item per idempotencyKey");
  const keys = [...records.values()].map((r) => r.command.idempotencyKey).sort();
  assert.deepEqual(keys, ["k1", "k2"], "the extra k1 copy is gone, one durable copy each");
});

test("AK: conflict markers stay on disk and never enter the queue", async () => {
  const marker: PersistedRecord = {
    recordId: "m1", householdId: "h", sequence: 0,
    command: { type: "conflict-marker", idempotencyKey: "m1", payload: { householdId: "h" } },
    conflictReason: "last_write_wins",
  };
  const { store, records } = makeStore([marker, rec("r1", "k1", 1)]);
  const queue = new OfflineMutationQueue();
  await rehydrate(queue, store, "h");
  // The old handoff enqueued markers as pending commands; the server
  // 400s the type and the thrown transport error blocked the head
  // forever. Markers are the conflict RECORD, not work.
  assert.equal(queue.pending().length, 1);
  assert.equal(queue.pending()[0]!.idempotencyKey, "k1");
  assert.ok(records.has("m1"), "the marker survives as the durable conflict record");
});

test("AK: a crash before the new copy is durable loses nothing (old record survives)", async () => {
  const base = makeStore([rec("r1", "k1", 1)]);
  const failingStore: HandoffStore = {
    ...base.store,
    async putRecord() { throw new Error("tab killed mid-handoff"); },
  };
  const queue = new OfflineMutationQueue();
  await assert.rejects(rehydrate(queue, failingStore, "h"));
  assert.ok(base.records.has("r1"),
    "the old record must survive a failed put; delete-then-rewrite would already have destroyed it");
});

test("AK: attempts and dead state survive the handoff", async () => {
  const { store, records } = makeStore([rec("r1", "k1", 1, { attempts: 8, state: "dead" })]);
  const queue = new OfflineMutationQueue();
  await rehydrate(queue, store, "h");
  assert.equal(queue.dead().length, 1);
  assert.equal(queue.dead()[0]!.attempts, 8);
  const [copy] = [...records.values()];
  assert.equal(copy!.state, "dead");
  assert.equal(copy!.attempts, 8);
});
