/**
 * AK (the G-52/AE fix): claiming persisted commands into a tab's queue,
 * without a loss window. The old handoff was claim-by-delete: read the
 * household's records, DELETE them, then re-put under new ids - so
 * between the delete and the re-put a command existed only in that tab's
 * memory, and a crash in the window lost it from disk. G-52 records a
 * visit command that died exactly that way.
 *
 * The new order is put-new-THEN-delete-old, so at every instant at least
 * one durable copy of every command exists. A crash between the put and
 * the delete leaves a duplicate, which is the SAFE direction: rehydration
 * dedupes by idempotencyKey (the server's own dedupe key), keeping the
 * first copy and deleting extras.
 *
 * Also fixed here, found by the rewrite: conflict-marker records used to
 * be re-enqueued as pending COMMANDS on reload; the drain would POST
 * them, the server would 400 the unknown type, and the thrown transport
 * error blocked the queue head forever. Markers are the conflict RECORD;
 * they stay on disk and never enter the queue.
 *
 * Pure over an injected store so the ordering invariant is provable in
 * this package's suite; the browser's IndexedDB module implements the
 * contract.
 */
import type { OfflineMutationQueue, QueueCommand } from "./index";

export interface PersistedRecord {
  recordId: string;
  householdId: string;
  sequence: number;
  command: QueueCommand;
  conflictReason: string | null;
  // AF: retry bookkeeping persists with the command so a reload cannot
  // resurrect a dead-lettered item as healthy.
  attempts?: number;
  state?: "pending" | "dead";
}

export interface HandoffStore {
  getRecordsForHousehold(householdId: string): Promise<PersistedRecord[]>;
  putRecord(record: PersistedRecord): Promise<void>;
  deleteRecords(recordIds: string[]): Promise<void>;
}

export async function rehydrate(
  queue: OfflineMutationQueue,
  store: HandoffStore,
  householdId: string,
): Promise<void> {
  const records = await store.getRecordsForHousehold(householdId);
  const claimed = new Set<string>();
  for (const record of records) {
    // Conflict markers are the durable conflict record, not commands;
    // they never enter the queue (see header: the 400-blocked-head bug).
    if (record.command.type === "conflict-marker") continue;
    if (claimed.has(record.command.idempotencyKey)) {
      // A duplicate from a crash inside a previous handoff window: the
      // command is already claimed above; dropping the extra copy is
      // safe because the claimed copy is durable before this delete.
      await store.deleteRecords([record.recordId]);
      continue;
    }
    claimed.add(record.command.idempotencyKey);
    const item = queue.enqueue(record.command, {
      attempts: record.attempts ?? 0,
      state: record.state === "dead" ? "dead" : "pending",
    });
    await store.putRecord({
      recordId: item.id, householdId, sequence: item.sequence,
      command: record.command, conflictReason: record.conflictReason ?? null,
      attempts: item.attempts, state: record.state === "dead" ? "dead" : "pending",
    });
    // Only after the new copy is durable does the old one go.
    await store.deleteRecords([record.recordId]);
  }
}
