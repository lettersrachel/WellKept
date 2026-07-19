/**
 * The full trigger pass over a live drizzle connection: load the rule
 * library + household tag, evaluate (pure, engine.ts), insert
 * prompt_pack_item rows idempotently. Shared by BOTH runners:
 *  - services/worker (BullMQ consumer, long-lived — Railway et al.)
 *  - apps/web inline after each field write (serverless-friendly)
 * Deterministic item ids mean the two can run side by side: whoever gets
 * there second inserts nothing. At-least-once anywhere, at-most-once rows.
 */
import { eq, isNull, or } from "drizzle-orm";
import { household, triggerRule, promptPackItem } from "@wellkept/schema";
import { evaluate, deterministicItemId, type FieldChangeEvent, type TriggerRuleRow } from "./engine.ts";

// Minimal structural type: both runners pass their own drizzle instance.
type Db = {
  select: (...args: never[]) => any;
  insert: (...args: never[]) => any;
};

export async function runTriggerPass(db: any, event: FieldChangeEvent) {
  const [hh] = await db.select().from(household).where(eq(household.id, event.householdId));
  if (!hh) return { emitted: 0, reason: "unknown household" };

  const rules = (await db
    .select()
    .from(triggerRule)
    .where(or(isNull(triggerRule.householdId), eq(triggerRule.householdId, event.householdId)))) as TriggerRuleRow[];

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
 * The daily registry sweep (REQ-051 over ADR-002 key_dates): every
 * household, every dated registry entry, insert whatever prompts have
 * entered their windows. Runs anywhere, any number of times — sweep item
 * ids are deterministic on (entry, occurrence, text).
 */
export async function runRegistrySweep(db: any, opts: { householdId?: string; now?: Date } = {}) {
  const { registryEntry } = await import("@wellkept/schema");
  const { isNull, and } = await import("drizzle-orm");
  const { sweepRegistryDates, sweepItemId } = await import("./registry-sweep.ts");

  const households = opts.householdId
    ? await db.select().from(household).where(eq(household.id, opts.householdId))
    : await db.select().from(household);

  let emitted = 0;
  for (const hh of households) {
    const entries = await db.select().from(registryEntry)
      .where(and(eq(registryEntry.householdId, hh.id), isNull(registryEntry.tombstonedAt)));
    const drafts = sweepRegistryDates(entries, { statusTag: hh.statusTag, now: opts.now });
    for (const draft of drafts) {
      // id keys on (family rule, household, occurrence, text) — the text
      // embeds the entry label, so distinct entries never collide.
      const id = await sweepItemId(draft.triggerRuleId + ":" + draft.householdId, draft.occurrence, draft.itemText);
      const { occurrence: _occ, ...values } = draft;
      const inserted = await db.insert(promptPackItem)
        .values({ id, ...values })
        .onConflictDoNothing({ target: promptPackItem.id })
        .returning({ id: promptPackItem.id });
      emitted += inserted.length;
    }
  }
  return { households: households.length, emitted };
}

/**
 * Drain the transactional field-event outbox (durable trigger delivery).
 * Claims a batch of unprocessed rows, runs the trigger pass for each
 * (idempotent via deterministic ids), and stamps processed_at. Bounded
 * retries via the attempts column. Runs anywhere, any number of times.
 */
export async function drainFieldOutbox(db: any, opts: { batch?: number; maxAttempts?: number } = {}) {
  const { fieldEventOutbox } = await import("@wellkept/schema");
  const { isNull, and, lt, asc } = await import("drizzle-orm");
  const batch = opts.batch ?? 100;
  const maxAttempts = opts.maxAttempts ?? 10;

  const pending = await db.select().from(fieldEventOutbox)
    .where(and(isNull(fieldEventOutbox.processedAt), lt(fieldEventOutbox.attempts, maxAttempts)))
    .orderBy(asc(fieldEventOutbox.createdAt))
    .limit(batch);

  let processed = 0;
  for (const row of pending) {
    try {
      await runTriggerPass(db, {
        householdId: row.householdId, fieldId: row.fieldId, fieldName: row.fieldName,
        section: row.section, newValue: row.newValue, changedAt: new Date(row.changedAt).toISOString(),
      });
      await db.update(fieldEventOutbox).set({ processedAt: new Date() }).where(eq(fieldEventOutbox.id, row.id));
      processed += 1;
    } catch (err) {
      await db.update(fieldEventOutbox).set({ attempts: row.attempts + 1 }).where(eq(fieldEventOutbox.id, row.id));
      console.error(`[outbox] row ${row.id} failed (attempt ${row.attempts + 1}):`, err instanceof Error ? err.message : err);
    }
  }
  return { pending: pending.length, processed };
}
