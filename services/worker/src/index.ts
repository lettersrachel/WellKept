// implements REQ-050/051/052: the trigger engine worker (sprint 8 core).
// Field-change events arrive on the queue from the single playbook_field
// repository function (WK-DEV-004 S3: no direct table writes anywhere else).
// The engine itself is pure (engine.ts); this shell does the I/O: load the
// rule library + household tag, evaluate, insert prompt_pack_item rows
// idempotently (deterministic ids meet BullMQ's at-least-once delivery).
import { Worker, Queue } from "bullmq";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, gt, isNull } from "drizzle-orm";
import { promptPackItem } from "@wellkept/schema";
import { runTriggerPass, runRegistrySweep, type FieldChangeEvent } from "@wellkept/trigger-engine";

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

export const FIELD_EVENTS_QUEUE = "field-events";

export function createFieldEventsQueue() {
  return new Queue<FieldChangeEvent>(FIELD_EVENTS_QUEUE, { connection });
}

const handleEvent = (event: FieldChangeEvent) => runTriggerPass(db, event);

/**
 * Tag changes drive suppression BOTH ways (LIFE-EVENT holds, not deletes):
 * setting LIFE-EVENT holds every not-yet-fired item; any other tag releases
 * the holds. Fired items are history and never touched.
 */
export interface TagChangeEvent { householdId: string; to: string }

async function handleTagChange({ householdId, to }: TagChangeEvent) {
  const hold = to === "LIFE-EVENT";
  const changed = await db
    .update(promptPackItem)
    .set({ suppressedByTag: hold, updatedAt: new Date() })
    .where(and(
      eq(promptPackItem.householdId, householdId),
      isNull(promptPackItem.firedAt),
      gt(promptPackItem.fireAt, new Date()),
      eq(promptPackItem.suppressedByTag, !hold),
    ))
    .returning({ id: promptPackItem.id });
  return { [hold ? "held" : "released"]: changed.length };
}

// Started as a service (`pnpm --filter @wellkept/worker start`); importable
// for tests without side effects via createWorker().
export function createWorker() {
  return new Worker<FieldChangeEvent | TagChangeEvent | Record<string, never>>(
    FIELD_EVENTS_QUEUE,
    async (job) => {
      if (job.name === "tag-change") return handleTagChange(job.data as TagChangeEvent);
      if (job.name === "registry-sweep") return runRegistrySweep(db);
      if (job.name === "fleet-digest") { const { runFleetDigest } = await import("./digest.ts"); return runFleetDigest(pool); }
      return handleEvent(job.data as FieldChangeEvent);
    },
    { connection },
  );
}

/** REQ-051: the daily registry sweep, 09:00 UTC (early morning household-
 * local; fire_at clamps to quiet hours regardless). Idempotent to
 * re-register on every worker boot. */
export async function ensureSweepScheduled() {
  const queue = createFieldEventsQueue();
  await queue.upsertJobScheduler("registry-sweep-daily", { pattern: "0 9 * * *" }, { name: "registry-sweep" });
  await queue.upsertJobScheduler("fleet-digest-weekly", { pattern: "0 13 * * 1" }, { name: "fleet-digest" });
  await queue.close();
}

if (process.env.WK_WORKER_MAIN === "1") {
  const worker = createWorker();
  void ensureSweepScheduled().then(() => console.log("[worker] daily sweep (09:00 UTC) + weekly fleet digest (Mon 13:00 UTC) scheduled"));
  worker.on("completed", (job, result) => {
    const label = job.name === "tag-change"
      ? `tag->${(job.data as TagChangeEvent).to}`
      : (job.data as FieldChangeEvent).fieldName.slice(0, 40);
    console.log(`[worker] ${job.id} ${label} ->`, JSON.stringify(result));
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] ${job?.id} FAILED:`, err.message);
  });
  console.log(`[worker] listening on ${FIELD_EVENTS_QUEUE}`);
}
