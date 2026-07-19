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
import { runTriggerPass, runRegistrySweep, drainFieldOutbox, type FieldChangeEvent } from "@wellkept/trigger-engine";
import * as Sentry from "@sentry/node";

// Error monitoring (launch §2.1). Off unless SENTRY_DSN is set. We only ever
// send the error + job id/name — NEVER job.data, which carries household field
// values. sendDefaultPii:false keeps request/user data out too.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

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
      if (job.name === "drain-outbox") return drainFieldOutbox(db);
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
  await queue.upsertJobScheduler("drain-outbox", { every: 120000 }, { name: "drain-outbox" });
  await queue.close();
}

if (process.env.WK_WORKER_MAIN === "1") {
  const worker = createWorker();
  void ensureSweepScheduled().then(() => console.log("[worker] scheduled: daily sweep, weekly digest, outbox drain (2m)"));
  worker.on("completed", (job, result) => {
    const label = job.name === "tag-change"
      ? `tag->${(job.data as TagChangeEvent).to}`
      : (job.data as FieldChangeEvent).fieldName.slice(0, 40);
    console.log(`[worker] ${job.id} ${label} ->`, JSON.stringify(result));
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] ${job?.id} FAILED:`, err.message);
    // Error + job identity only — never job.data (it holds household values).
    Sentry.captureException(err, { tags: { jobId: job?.id ?? "unknown", jobName: job?.name ?? "unknown" } });
  });
  // A crash in the worker is invisible without this — surface it before exit.
  process.on("uncaughtException", (err) => { Sentry.captureException(err); console.error("[worker] uncaught:", err); });
  process.on("unhandledRejection", (err) => { Sentry.captureException(err); console.error("[worker] unhandled rejection:", err); });
  console.log(`[worker] listening on ${FIELD_EVENTS_QUEUE}`);
}
