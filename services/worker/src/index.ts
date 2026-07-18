// implements REQ-050/051/052: the trigger engine worker (sprint 8 core).
// Field-change events arrive on the queue from the single playbook_field
// repository function (WK-DEV-004 S3: no direct table writes anywhere else).
// The engine itself is pure (engine.ts); this shell does the I/O: load the
// rule library + household tag, evaluate, insert prompt_pack_item rows
// idempotently (deterministic ids meet BullMQ's at-least-once delivery).
import { Worker, Queue } from "bullmq";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { household, triggerRule, promptPackItem } from "@wellkept/schema";
import { evaluate, deterministicItemId, type FieldChangeEvent, type TriggerRuleRow } from "./engine.ts";

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

async function handleEvent(event: FieldChangeEvent) {
  const [hh] = await db.select().from(household).where(eq(household.id, event.householdId));
  if (!hh) return { emitted: 0, reason: "unknown household" };

  const rules = (await db
    .select()
    .from(triggerRule)
    .where(or(isNull(triggerRule.householdId), eq(triggerRule.householdId, event.householdId)))) as unknown as TriggerRuleRow[];

  const drafts = evaluate(event, rules, { statusTag: hh.statusTag });
  let emitted = 0;
  for (const draft of drafts) {
    const id = await deterministicItemId(event, draft.triggerRuleId, draft.itemText);
    const inserted = await db
      .insert(promptPackItem)
      .values({ id, ...draft })
      .onConflictDoNothing({ target: promptPackItem.id })
      .returning({ id: promptPackItem.id });
    emitted += inserted.length;
  }
  return { emitted, evaluated: rules.length, suppressed: hh.statusTag === "LIFE-EVENT" };
}

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
  return new Worker<FieldChangeEvent | TagChangeEvent>(
    FIELD_EVENTS_QUEUE,
    async (job) =>
      job.name === "tag-change"
        ? handleTagChange(job.data as TagChangeEvent)
        : handleEvent(job.data as FieldChangeEvent),
    { connection },
  );
}

if (process.env.WK_WORKER_MAIN === "1") {
  const worker = createWorker();
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
