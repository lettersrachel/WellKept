import { eventOutbox } from "./tables.ts";

/**
 * WK-DEV-010 section 4: the one way an event enters the outbox. Every
 * emitting site declares the envelope the law requires (provenance and
 * the object whose transition this is, the actor where a person acted,
 * the correlation where a chain exists) instead of hand-rolling an
 * insert; the compiler holds the envelope where memory used to.
 * Payloads keep carrying ids and vocabulary only; s1 is therefore the
 * honest default sensitivity, and a writer whose payload ever exceeds
 * that passes the higher label explicitly. Call INSIDE the same
 * transaction as the state change it describes (the pipeline's first
 * law); this helper never opens one.
 */
// The attention-sweep Db shape: any drizzle handle (db or tx) satisfies
// it, and the cast stays inside this one function.
type InsertTarget = { insert: (...args: never[]) => unknown };

export async function emitOutboxEvent(
  tx: InsertTarget,
  event: {
    householdId: string;
    kind: string;
    payload: Record<string, unknown>;
    /** The emitting component, e.g. "action:createWorkItem", "sweep:attention". */
    provenance: string;
    /** The row whose state transition this event describes. */
    objectId: string;
    /** The person who acted; omit for the system's own acts. */
    actor?: string | null;
    /** Ties a chain together (a visit command, a slice); omit when none exists. */
    correlationId?: string | null;
    sensitivity?: "s1" | "s2" | "s3";
    occurredAt?: Date;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await (tx as { insert: (t: typeof eventOutbox) => { values: (v: Record<string, unknown>) => unknown } }).insert(eventOutbox).values({
    id,
    householdId: event.householdId,
    kind: event.kind,
    payload: event.payload,
    occurredAt: event.occurredAt ?? new Date(),
    eventVersion: 1,
    correlationId: event.correlationId ?? null,
    objectId: event.objectId,
    actor: event.actor ?? null,
    sensitivity: event.sensitivity ?? "s1",
    provenance: event.provenance,
  });
  return id;
}
