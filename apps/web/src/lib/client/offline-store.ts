/**
 * Browser-only. Persists queued close-flow commands in IndexedDB so they
 * survive a page reload or closed tab while offline. Deliberately dumb
 * key-value storage: all ordering/retry/conflict logic stays in
 * @wellkept/offline-queue (see visit-sync.ts); this module never duplicates
 * it. Ported from the July 12 foundation repo.
 */
import type { QueueCommand } from "@wellkept/offline-queue";

const DB_NAME = "wellkept-offline";
const STORE_NAME = "commands";

export interface PersistedRecord {
  recordId: string;
  householdId: string;
  sequence: number;
  command: QueueCommand;
  conflictReason: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "recordId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordsForHousehold(householdId: string): Promise<PersistedRecord[]> {
  const db = await openDb();
  const all = await new Promise<PersistedRecord[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as PersistedRecord[]);
    request.onerror = () => reject(request.error);
  });
  return all
    .filter((record) => record.householdId === householdId)
    .sort((a, b) => a.sequence - b.sequence);
}

export async function putRecord(record: PersistedRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecords(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    recordIds.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
