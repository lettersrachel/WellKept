import { Queue } from "bullmq";
import { runTriggerPass, type FieldChangeEvent } from "@wellkept/trigger-engine";
import { db } from "./db";

export type { FieldChangeEvent };

/**
 * WK-DEV-004 S3: every playbook_field write flows through one place, and
 * that place emits the field-change event the trigger engine consumes.
 *
 * Two delivery paths, safe to run together because item ids are
 * deterministic (whoever is second inserts nothing):
 *  1. INLINE: runTriggerPass right here — works in serverless production
 *     with no long-lived worker deployed.
 *  2. QUEUE: best-effort enqueue for the BullMQ worker (local dev; Railway
 *     later). A Redis outage never blocks the write — the record is the
 *     source of truth; prompts are derived. Durable upgrade: outbox table.
 */

const globalForQueue = globalThis as unknown as { wkFieldEvents?: Queue };

function queue(): Queue {
  globalForQueue.wkFieldEvents ??= new Queue("field-events", {
    connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
  });
  return globalForQueue.wkFieldEvents;
}

export async function emitFieldChange(event: FieldChangeEvent): Promise<void> {
  try {
    const result = await runTriggerPass(db, event);
    console.log("[field-events] inline trigger pass:", JSON.stringify(result));
  } catch (err) {
    console.error("[field-events] inline pass failed:", err instanceof Error ? err.message : err);
  }
  try {
    await queue().add("field-change", event);
  } catch (err) {
    console.error("[field-events] enqueue failed (write proceeds):", err instanceof Error ? err.message : err);
  }
}
