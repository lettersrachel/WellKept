"use client";

/**
 * One VisitSync per household per tab, shared by the close-flow wizard and
 * the offline capture components (input spine build 1, client half). Two
 * instances in one tab would race each other's rehydration claims (the AE
 * finding, one level down), and the queue's drain is not re-entrant, so
 * this module owns the singleton and serializes drains behind a latch;
 * concurrent callers share the in-flight drain's result. Listeners let
 * any component reflect queue state the moment another one enqueues.
 */
import type { QueueCommand, QueueConflict, QueueItem, Transport } from "@wellkept/offline-queue";
import { createVisitSync, type VisitSync } from "./visit-sync";

const syncPromises = new Map<string, Promise<VisitSync>>();
const drainsInFlight = new Map<string, Promise<DrainResult>>();
const listeners = new Map<string, Set<() => void>>();

export type DrainResult = { attempted: boolean; sent: QueueItem[]; conflicts: QueueConflict[] };

export const visitCommandsTransport: Transport = async (item) => {
  const response = await fetch("/api/visit-commands", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idempotencyKey: item.idempotencyKey, type: item.type, payload: item.payload }),
  });
  if (!response.ok) throw new Error("visit-commands request failed");
  return response.json() as Promise<{ conflict?: boolean; reason?: string }>;
};

export function getSharedSync(householdId: string): Promise<VisitSync> {
  let p = syncPromises.get(householdId);
  if (!p) {
    p = createVisitSync({ householdId });
    syncPromises.set(householdId, p);
  }
  return p;
}

export function subscribeSync(householdId: string, cb: () => void): () => void {
  let set = listeners.get(householdId);
  if (!set) { set = new Set(); listeners.set(householdId, set); }
  set.add(cb);
  return () => { set.delete(cb); };
}

function notify(householdId: string) {
  for (const cb of listeners.get(householdId) ?? []) cb();
}

/** Enqueue durably, notify every subscriber (the wizard's status bar
 * shows capture commands too), and return the queue item. */
export async function enqueueShared(householdId: string, command: QueueCommand): Promise<QueueItem> {
  const sync = await getSharedSync(householdId);
  const item = await sync.enqueueAndPersist(command);
  notify(householdId);
  return item;
}

/** One drain at a time per household; a caller arriving mid-drain shares
 * the in-flight result instead of double-sending the head. */
export function drainShared(householdId: string): Promise<DrainResult> {
  const inFlight = drainsInFlight.get(householdId);
  if (inFlight) return inFlight;
  const run = (async () => {
    const sync = await getSharedSync(householdId);
    try {
      return await sync.sync(visitCommandsTransport);
    } finally {
      drainsInFlight.delete(householdId);
      notify(householdId);
    }
  })();
  drainsInFlight.set(householdId, run);
  return run;
}

/** True when no pending or dead item carries this idempotencyKey: the
 * command was delivered (applied or recorded as a conflict server-side). */
export async function commandSettled(householdId: string, idempotencyKey: string): Promise<boolean> {
  const sync = await getSharedSync(householdId);
  return ![...sync.queue.pending(), ...sync.queue.dead()].some((i) => i.idempotencyKey === idempotencyKey);
}
