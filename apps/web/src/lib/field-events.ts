import { runTriggerPass, type FieldChangeEvent } from "@wellkept/trigger-engine";
import { emitOutboxEvent } from "@wellkept/schema";
import { db } from "./db";

export type { FieldChangeEvent };

/**
 * WK-DEV-004 S3: every playbook_field write flows through one place and
 * emits the field-change event the trigger engine consumes. Delivery is
 * now DURABLE via a transactional outbox:
 *
 *  1. outboxFieldEvent(tx, event) inserts an outbox row in the SAME
 *     transaction as the field write — the change and its event commit
 *     atomically, so no field change can silently fail to schedule prompts.
 *  2. emitFieldChange(event) runs the trigger pass INLINE after commit for
 *     immediacy. Best-effort: if it throws, the outbox row is still there
 *     and the worker's drainer will process it.
 *
 * The two paths are safe together: prompt-pack item ids are deterministic,
 * so whichever runs the pass second inserts nothing.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Durable: insert the outbox row using the caller's transaction handle.
 * CAND-OUTBOX-01: the generalized event_outbox carries this as the first
 * kind, field.changed; the payload shape IS FieldChangeEvent. */
export async function outboxFieldEvent(
  tx: Tx,
  event: FieldChangeEvent,
  // WK-DEV-010 s4 envelope (0046): who wrote, and the field's OWN
  // sensitivity, because this payload carries the plaintext value (the
  // one event kind that does; s3 never reaches here, excluded at every
  // call site). Optional so the trigger-engine type stays untouched;
  // callers that know pass both.
  envelope?: { actor?: string; sensitivity?: "s1" | "s2" },
): Promise<void> {
  await emitOutboxEvent(tx, {
    householdId: event.householdId,
    kind: "field.changed",
    payload: {
      fieldId: event.fieldId,
      fieldName: event.fieldName,
      section: event.section,
      newValue: event.newValue,
      changedAt: event.changedAt,
    },
    occurredAt: new Date(event.changedAt),
    provenance: "web:field-events",
    objectId: event.fieldId,
    actor: envelope?.actor ?? null,
    sensitivity: envelope?.sensitivity ?? "s2",
  });
}

/** Immediate: run the trigger pass inline. Best-effort — the outbox is the
 * durable backstop, so a failure here is logged and left for the drainer. */
export async function emitFieldChange(event: FieldChangeEvent): Promise<void> {
  try {
    await runTriggerPass(db, event);
  } catch (err) {
    console.error("[field-events] inline pass failed (outbox will retry):", err instanceof Error ? err.message : err);
  }
}
