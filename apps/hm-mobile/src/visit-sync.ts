/**
 * Mobile twin of apps/web's visit-sync: same @wellkept/offline-queue
 * contract, AsyncStorage instead of IndexedDB. State tracked only through
 * the queue's public pending()/conflicts(); rehydration re-enqueues, and
 * idempotencyKey (what the server dedupes on) survives exactly.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  OfflineMutationQueue,
  type QueueCommand,
  type QueueConflict,
  type QueueItem,
  type Transport,
} from "@wellkept/offline-queue";

interface PersistedRecord {
  recordId: string;
  sequence: number;
  command: QueueCommand;
  conflictReason: string | null;
}

const keyFor = (householdId: string) => `wk-offline:${householdId}`;

async function readAll(householdId: string): Promise<PersistedRecord[]> {
  const raw = await AsyncStorage.getItem(keyFor(householdId));
  const records = raw ? (JSON.parse(raw) as PersistedRecord[]) : [];
  return records.sort((a, b) => a.sequence - b.sequence);
}

async function writeAll(householdId: string, records: PersistedRecord[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(householdId), JSON.stringify(records));
}

export interface VisitSync {
  queue: OfflineMutationQueue;
  enqueueAndPersist(command: QueueCommand): Promise<QueueItem>;
  sync(transport: Transport): Promise<{ sent: QueueItem[]; conflicts: QueueConflict[] }>;
}

export async function createVisitSync({ householdId }: { householdId: string }): Promise<VisitSync> {
  const queue = new OfflineMutationQueue();
  let records = await readAll(householdId);

  // Rehydrate from a previous offline session.
  const rehydrated: PersistedRecord[] = [];
  for (const record of records) {
    const item = queue.enqueue(record.command);
    rehydrated.push({ recordId: item.id, sequence: item.sequence, command: record.command, conflictReason: record.conflictReason });
  }
  records = rehydrated;
  await writeAll(householdId, records);

  async function enqueueAndPersist(command: QueueCommand) {
    const item = queue.enqueue(command);
    records.push({ recordId: item.id, sequence: item.sequence, command, conflictReason: null });
    await writeAll(householdId, records);
    return item;
  }

  async function sync(transport: Transport) {
    const pendingBefore = queue.pending().map((item) => item.id);
    const sent = await queue.drain(transport);
    const conflicts = queue.conflicts();
    const conflictIds = new Set(conflicts.map((c) => c.mutationId));
    const stillPending = new Set(queue.pending().map((item) => item.id));
    records = records.filter((r) => {
      if (conflictIds.has(r.recordId)) {
        r.conflictReason = conflicts.find((c) => c.mutationId === r.recordId)?.reason ?? "conflict";
        return true; // conflicts stay visible until reviewed
      }
      return stillPending.has(r.recordId) || !pendingBefore.includes(r.recordId);
    });
    await writeAll(householdId, records);
    return { sent, conflicts };
  }

  return { queue, enqueueAndPersist, sync };
}
