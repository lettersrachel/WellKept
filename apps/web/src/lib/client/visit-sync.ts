/**
 * Wires OfflineMutationQueue (in-memory, tested contract) to IndexedDB
 * persistence and a fetch transport WITHOUT modifying the queue: state is
 * tracked purely through the queue's public pending()/dead()/conflicts()
 * methods after every drain. Rehydration re-enqueues persisted commands —
 * the queue-local item id changes, but idempotencyKey (what the server
 * dedupes on) survives exactly, so this is safe even mid-flight. Ported
 * from the July 12 foundation repo.
 *
 * AF (sync-defect sessions): attempts and the dead state persist with the
 * record, so a reload cannot silently resurrect a dead-lettered command as
 * a healthy one; the operator's retry/discard travel through here so the
 * disk copy stays honest. Discard deletes the record ONLY after the caller
 * has written the audit row (no audit, no discard).
 */
import { OfflineMutationQueue, type QueueCommand, type QueueConflict, type QueueItem, type Transport } from "@wellkept/offline-queue";
import { deleteRecords, getRecordsForHousehold, putRecord } from "./offline-store";

/** The dead-letter cap: with the 5s-base, 5-minute-cap backoff this is
 * roughly ten minutes of automatic retrying before the operator is asked.
 * An engineering parameter, reported to the founder as a proposal in the
 * AF session notes, not a product threshold. */
export const MAX_SEND_ATTEMPTS = 8;

export interface VisitSync {
  queue: OfflineMutationQueue;
  enqueueAndPersist(command: QueueCommand): Promise<QueueItem>;
  sync(transport: Transport): Promise<{ attempted: boolean; sent: QueueItem[]; conflicts: QueueConflict[] }>;
  /** Operator action: fresh attempts for a dead item, persisted. */
  retryDead(itemId: string): Promise<QueueItem | null>;
  /** Operator action: remove a dead item AFTER the audit row is written.
   * Returns the removed item, or null if it was not dead. */
  discardDead(itemId: string): Promise<QueueItem | null>;
}

export async function createVisitSync({ householdId }: { householdId: string }): Promise<VisitSync> {
  const queue = new OfflineMutationQueue();

  const persistedRecords = await getRecordsForHousehold(householdId);
  await deleteRecords(persistedRecords.map((record) => record.recordId));
  for (const record of persistedRecords) {
    const item = queue.enqueue(record.command, {
      attempts: record.attempts ?? 0,
      state: record.state === "dead" ? "dead" : "pending",
    });
    await putRecord({
      recordId: item.id, householdId, sequence: item.sequence,
      command: record.command, conflictReason: record.conflictReason ?? null,
      attempts: item.attempts, state: item.state === "dead" ? "dead" : "pending",
    });
  }

  async function persistBookkeeping() {
    for (const item of [...queue.pending(), ...queue.dead()]) {
      await putRecord({
        recordId: item.id, householdId, sequence: item.sequence,
        command: { type: item.type, idempotencyKey: item.idempotencyKey, payload: item.payload },
        conflictReason: null,
        attempts: item.attempts, state: item.state === "dead" ? "dead" : "pending",
      });
    }
  }

  async function enqueueAndPersist(command: QueueCommand) {
    const item = queue.enqueue(command);
    await putRecord({
      recordId: item.id, householdId, sequence: item.sequence, command,
      conflictReason: null, attempts: 0, state: "pending",
    });
    return item;
  }

  async function sync(transport: Transport) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { attempted: false, sent: [], conflicts: [] };
    }
    const before = [...queue.pending(), ...queue.dead()].map((item) => item.id);
    const sent = await queue.drain(transport, { maxAttempts: MAX_SEND_ATTEMPTS });
    const conflictsAfter = queue.conflicts();
    const conflictIds = new Set(conflictsAfter.map((conflict) => conflict.mutationId));
    const stillHeld = new Set([...queue.pending(), ...queue.dead()].map((item) => item.id));
    const sentIds = before.filter((id) => !stillHeld.has(id) && !conflictIds.has(id));
    await deleteRecords(sentIds);
    await persistBookkeeping();
    for (const conflict of conflictsAfter) {
      if (!conflictIds.has(conflict.mutationId)) continue;
      await putRecord({
        recordId: conflict.mutationId, householdId, sequence: 0,
        command: { idempotencyKey: conflict.mutationId, type: "conflict-marker", payload: { householdId } },
        conflictReason: conflict.reason,
      });
    }
    return { attempted: true, sent, conflicts: conflictsAfter };
  }

  async function retryDead(itemId: string) {
    const revived = queue.retryDead(itemId);
    if (revived) await persistBookkeeping();
    return revived;
  }

  async function discardDead(itemId: string) {
    const removed = queue.discardDead(itemId);
    if (removed) await deleteRecords([itemId]);
    return removed;
  }

  return { queue, enqueueAndPersist, sync, retryDead, discardDead };
}
