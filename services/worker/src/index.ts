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
import { promptPackItem, householdRoleAssignment, notification } from "@wellkept/schema";
import type { FloorConflictEvent } from "@wellkept/close-flow";
import { runTriggerPass, runRegistrySweep, sweepLoadSignals, materializeSeasonObservations, drainFieldOutbox, type FieldChangeEvent } from "@wellkept/trigger-engine";
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

type QueueJobData = FieldChangeEvent | TagChangeEvent | FloorConflictEvent | Record<string, never>;

export function createFieldEventsQueue() {
  return new Queue<QueueJobData>(FIELD_EVENTS_QUEUE, { connection });
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

/**
 * Floor conflicts (Addendum A1 S5; brief T5): a floor-tier provision cannot
 * be recorded as adapted-per-Playbook; the refused attempt arrives here as a
 * structured event and lands in the corporate signal inbox — notification
 * rows for every corporate role on the household, the same surface other
 * signals use. The event type is wired now; the close-flow UI that sends it
 * is its own sprint. NEVER extend this into per-HM analytics: hm_assignment
 * identifies the one event's context, and aggregation is by provision only.
 */
export const FLOOR_CONFLICT_JOB = "floor-conflict";

export function enqueueFloorConflict(event: FloorConflictEvent) {
  return createFieldEventsQueue().add(FLOOR_CONFLICT_JOB, event);
}

async function handleFloorConflict(event: FloorConflictEvent) {
  const corporate = await db
    .select({ userId: householdRoleAssignment.userId, role: householdRoleAssignment.role })
    .from(householdRoleAssignment)
    .where(eq(householdRoleAssignment.householdId, event.household));
  const recipients = corporate.filter((a) => a.role === "corporate_admin" || a.role === "corporate_ops");
  for (const r of recipients) {
    await db.insert(notification).values({
      id: globalThis.crypto.randomUUID(),
      userId: r.userId,
      householdId: event.household,
      kind: "floor_conflict",
      title: `Floor conflict: ${event.provision_id}`,
      body: `An attempt was made to record ${event.provision_id} (a floor) as adapted-per-Playbook. `
        + `Review per WK-STD-000 S9. Occurred ${event.occurred_at}.`,
    });
  }
  return { routed: recipients.length, provision: event.provision_id };
}

/**
 * Uptime check (launch §2.1): the worker runs continuously on Railway, so it
 * can ping the web app's health endpoint from OUTSIDE Vercel — a genuine
 * external check that catches a total outage, not just a degraded dependency.
 * A failure pages via Sentry (already wired). HEALTH_URL defaults to prod.
 */
async function handleUptimeCheck() {
  const url = process.env.HEALTH_URL ?? "https://wellkept-orcin.vercel.app/api/health";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      Sentry.captureMessage(`uptime: ${url} returned ${res.status}`, "error");
      console.error(`[worker] uptime FAIL ${res.status} ${url}`);
      return { url, status: res.status, ok: false };
    }
    return { url, status: res.status, ok: true };
  } catch (err) {
    Sentry.captureMessage(`uptime: ${url} unreachable — ${err instanceof Error ? err.message : String(err)}`, "error");
    console.error(`[worker] uptime UNREACHABLE ${url}`);
    return { url, ok: false };
  }
}

/**
 * Photo lifecycle (LAUNCH §3, 2026-07-25): purge visit-photo image BYTES
 * past the rolling retention window. The row survives as the tombstone
 * (household, uploader, byte count, dates) — the record stays, the picture
 * doesn't. A retention hold (open incident/dispute) exempts a photo until
 * released. The window is configuration, not a constant: app_setting
 * `photo_retention` { days }, default 90 — founder-set, counsel to bless.
 * Runs on the daily sweep; idempotent (purged rows never match again).
 */
export async function runPhotoRetention(now = new Date()): Promise<number> {
  const { visitPhoto, appSetting } = await import("@wellkept/schema");
  const { and, eq: eqOp, isNull: isNullOp, lt } = await import("drizzle-orm");
  const [cfg] = await db.select().from(appSetting).where(eqOp(appSetting.key, "photo_retention"));
  const days = Number((cfg?.value as { days?: number } | undefined)?.days ?? 90);
  if (!Number.isFinite(days) || days < 7) return 0; // refuse a nonsense window; 7d is the floor
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const purged = await db.update(visitPhoto)
    .set({ data: "", purgedAt: now })
    .where(and(
      lt(visitPhoto.createdAt, cutoff),
      isNullOp(visitPhoto.purgedAt),
      eqOp(visitPhoto.retentionHold, false),
    ))
    .returning({ id: visitPhoto.id });
  return purged.length;
}

// Started as a service (`pnpm --filter @wellkept/worker start`); importable
// for tests without side effects via createWorker().
export function createWorker() {
  return new Worker<QueueJobData>(
    FIELD_EVENTS_QUEUE,
    async (job) => {
      if (job.name === "tag-change") return handleTagChange(job.data as TagChangeEvent);
      if (job.name === "registry-sweep") {
        const sweep = await runRegistrySweep(db);
        const load = await sweepLoadSignals(db);
        // A2/REQ-054: season memory accrues on the same daily pass (an
        // extension of the sweep, not a second sweep). Idempotent.
        const season = await materializeSeasonObservations(db);
        const purged = await runPhotoRetention();
        return { ...sweep, loadSignals: load.signals, seasonRows: season.inserted, photosPurged: purged };
      }
      if (job.name === "fleet-digest") { const { runFleetDigest } = await import("./digest.ts"); return runFleetDigest(pool); }
      if (job.name === "cpsc-recall") { const { runCpscRecallSweep } = await import("./cpsc.ts"); return runCpscRecallSweep(db); }
      if (job.name === "drain-outbox") return drainFieldOutbox(db);
      if (job.name === "uptime-check") return handleUptimeCheck();
      if (job.name === FLOOR_CONFLICT_JOB) return handleFloorConflict(job.data as FloorConflictEvent);
      return handleEvent(job.data as FieldChangeEvent);
    },
    {
      connection,
      // Upstash bills per COMMAND and the free tier is 500k/month. BullMQ's
      // defaults (5s empty-queue poll, 30s stalled check) idle at ~600k/month
      // — the quota dies with zero jobs processed (it did, 2026-07-24).
      // A pilot's queue traffic is minutes-scale, not seconds-scale:
      drainDelay: 60, // seconds to block when the queue is empty
      stalledInterval: 300_000, // stalled-job check every 5min
    },
  );
}

/** REQ-051: the daily registry sweep, 09:00 UTC (early morning household-
 * local; fire_at clamps to quiet hours regardless). Idempotent to
 * re-register on every worker boot. */
export async function ensureSweepScheduled() {
  const queue = createFieldEventsQueue();
  await queue.upsertJobScheduler("registry-sweep-daily", { pattern: "0 9 * * *" }, { name: "registry-sweep" });
  await queue.upsertJobScheduler("fleet-digest-weekly", { pattern: "0 13 * * 1" }, { name: "fleet-digest" });
  // REQ-047: recalls move on week timescales; Tuesdays after the digest.
  await queue.upsertJobScheduler("cpsc-recall-weekly", { pattern: "0 14 * * 2" }, { name: "cpsc-recall" });
  await queue.upsertJobScheduler("drain-outbox", { every: 300000 }, { name: "drain-outbox" }); // backstop only; the inline pass is primary
  await queue.upsertJobScheduler("uptime-check", { every: 300000 }, { name: "uptime-check" });
  await queue.close();
}

if (process.env.WK_WORKER_MAIN === "1") {
  const worker = createWorker();
  void ensureSweepScheduled().then(() => console.log("[worker] scheduled: daily sweep, weekly digest, outbox drain (5m), uptime check (5m)"));
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
