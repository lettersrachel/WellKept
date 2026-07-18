/**
 * Wires OfflineMutationQueue (in-memory, tested contract) to IndexedDB
 * persistence and a fetch transport WITHOUT modifying the queue: state is
 * tracked purely through the queue's public pending()/conflicts() methods
 * after every drain. Rehydration re-enqueues persisted commands — the
 * queue-local item id changes, but idempotencyKey (what the server dedupes
 * on) survives exactly, so this is safe even mid-flight. Ported from the
 * July 12 foundation repo.
 */
import { OfflineMutationQueue, type QueueCommand, type QueueConflict, type QueueItem, type Transport } from "@wellkept/offline-queue";
import { deleteRecords, getRecordsForHousehold, putRecord } from "./offline-store";

export interface VisitSync {
  queue: OfflineMutationQueue;
  enqueueAndPersist(command: QueueCommand): Promise<QueueItem>;
  sync(transport: Transport): Promise<{ attempted: boolean; sent: QueueItem[]; conflicts: QueueConflict[] }>;
}

export async function createVisitSync({ householdId }: { householdId: string }): Promise<VisitSync> {
  const queue = new OfflineMutationQueue();

  const persistedRecords = await getRecordsForHousehold(householdId);
  await deleteRecords(persistedRecords.map((record) => record.recordId));
  for (const record of persistedRecords) {
    const item = queue.enqueue(record.command);
    await putRecord({
      recordId: item.id, householdId, sequence: item.sequence,
      command: record.command, conflictReason: record.conflictReason ?? null,
    });
  }

  async function enqueueAndPersist(command: QueueCommand) {
    const item = queue.enqueue(command);
    await putRecord({ recordId: item.id, householdId, sequence: item.sequence, command, conflictReason: null });
    return item;
  }

  async function sync(transport: Transport) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { attempted: false, sent: [], conflicts: [] };
    }
    const pendingBefore = queue.pending().map((item) => item.id);
    const sent = await queue.drain(transport);
    const conflictsAfter = queue.conflicts();
    const conflictIds = new Set(conflictsAfter.map((conflict) => conflict.mutationId));
    const stillPending = new Set(queue.pending().map((item) => item.id));
    const sentIds = pendingBefore.filter((id) => !stillPending.has(id) && !conflictIds.has(id));
    await deleteRecords(sentIds);
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

  return { queue, enqueueAndPersist, sync };
}
