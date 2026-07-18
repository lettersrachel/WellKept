import { Queue } from "bullmq";

/**
 * WK-DEV-004 S3: every playbook_field write flows through one place, and
 * that place emits the field-change event the trigger engine consumes.
 * Best-effort by design for now: a Redis outage must not block the write
 * itself (the record is the source of truth; prompts are derived). The
 * durable upgrade path is a transactional outbox table drained by the
 * worker — noted, not built.
 */
export interface FieldChangeEvent {
  householdId: string;
  fieldId: string;
  fieldName: string;
  section: number;
  newValue: string;
  changedAt: string;
}

const globalForQueue = globalThis as unknown as { wkFieldEvents?: Queue };

function queue(): Queue {
  globalForQueue.wkFieldEvents ??= new Queue("field-events", {
    connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
  });
  return globalForQueue.wkFieldEvents;
}

export async function emitFieldChange(event: FieldChangeEvent): Promise<void> {
  try {
    await queue().add("field-change", event);
  } catch (err) {
    console.error("[field-events] enqueue failed (write proceeds):", err instanceof Error ? err.message : err);
  }
}
