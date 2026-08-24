/**
 * Browser-only. Persists queued close-flow commands in IndexedDB so they
 * survive a page reload or closed tab while offline. Deliberately dumb
 * key-value storage: all ordering/retry/conflict logic stays in
 * @wellkept/offline-queue (see visit-sync.ts); this module never duplicates
 * it. Ported from the July 12 foundation repo.
 */
import type { PersistedRecord } from "@wellkept/offline-queue";

const DB_NAME = "wellkept-offline";
const STORE_NAME = "commands";

// AK: the record shape and the handoff contract live in
// @wellkept/offline-queue (where the ordering invariant is proven); this
// module is the IndexedDB implementation of that contract.
export type { PersistedRecord };

// Version 2 adds the drafts store (input spine build 1); the upgrade
// leaves the commands store untouched, so queued work survives it.
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "recordId" });
      }
      if (!db.objectStoreNames.contains("drafts")) {
        db.createObjectStore("drafts", { keyPath: "householdId" });
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

// ── Draft persistence (input spine build 1: nothing is lost) ──────────
// The un-submitted close-flow state autosaves here so a crash or reload
// mid-visit resumes exactly where it stopped. Kept OUT of the commands
// store on purpose: rehydration re-enqueues command records, and a draft
// must never be mistaken for a queued command.

const DRAFT_STORE = "drafts";

export interface WizardDraft {
  householdId: string;
  flowState: unknown; // CloseFlowState, opaque to this dumb store
  fields: Record<string, unknown>;
  photos: { photoId: string; base64: string; uploaded: boolean }[];
  savedAt: string;
}

export async function getDraft(householdId: string): Promise<WizardDraft | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE, "readonly").objectStore(DRAFT_STORE).get(householdId);
    request.onsuccess = () => resolve((request.result as WizardDraft) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function putDraft(draft: WizardDraft): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE, "readwrite").objectStore(DRAFT_STORE).put(draft);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDraft(householdId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE, "readwrite").objectStore(DRAFT_STORE).delete(householdId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
