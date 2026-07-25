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
  const { registryEntry, movableObservance, playbookField } = await import("@wellkept/schema");
  const { isNull, and, like, gte } = await import("drizzle-orm");
  const { sweepRegistryDates, sweepMovableObservances, sweepItemId } = await import("./registry-sweep.ts");

  const households = opts.householdId
    ? await db.select().from(household).where(eq(household.id, opts.householdId))
    : await db.select().from(household);

  // Movable dates come from the maintained calendar table, never computed
  // (DEV-005 S2). Relevance is per household: its own Playbook must name
  // the observance for the radar to fire.
  const now = opts.now ?? new Date();
  const observances = await db.select().from(movableObservance)
    .where(gte(movableObservance.date, now));

  let emitted = 0;
  for (const hh of households) {
    const entries = await db.select().from(registryEntry)
      .where(and(eq(registryEntry.householdId, hh.id), isNull(registryEntry.tombstonedAt)));
    const drafts = sweepRegistryDates(entries, { statusTag: hh.statusTag, now: opts.now });
    if (observances.length) {
      const [obsField] = await db.select({ value: playbookField.value }).from(playbookField)
        .where(and(eq(playbookField.householdId, hh.id), like(playbookField.name, "Movable-date observances%")))
        .limit(1);
      drafts.push(...sweepMovableObservances(observances, [
        { householdId: hh.id, statusTag: hh.statusTag, fieldValue: obsField?.value ?? "" },
      ], { now: opts.now }));
    }
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

/**
 * REQ-051 threshold family: the load signal (STD-023.2.7 / APP-002's
 * converged three-consecutive rule). Scans each household's three most
 * recent APPLIED visits; three in a row reporting zone drift routes a
 * corporate notification — aggregated per household, never per HM (the
 * founder's no-per-HM-analytics boundary). Deduped: one notification per
 * household per 14 days.
 */
export async function sweepLoadSignals(db: any, opts: { now?: Date } = {}) {
  const { visitCommand, householdRoleAssignment, notification } = await import("@wellkept/schema");
  const { and, desc, gte, inArray } = await import("drizzle-orm");
  const { detectLoadSignal } = await import("./registry-sweep.ts");
  const now = opts.now ?? new Date();

  const households = await db.select().from(household);
  let signals = 0;
  for (const hh of households) {
    const visits = await db.select().from(visitCommand)
      .where(and(eq(visitCommand.householdId, hh.id), eq(visitCommand.type, "visit.submit"), eq(visitCommand.status, "applied")))
      .orderBy(desc(visitCommand.receivedAt))
      .limit(3);
    const answers = visits.map((v: { payload: unknown }) =>
      (v.payload as { zoneDrift?: { answer?: string } }).zoneDrift?.answer);
    if (!detectLoadSignal(answers)) continue;
    signals += 1; // detected — counted even if the household has no corporate roster yet

    const recent = await db.select({ id: notification.id }).from(notification)
      .where(and(
        eq(notification.householdId, hh.id),
        eq(notification.kind, "load_signal"),
        gte(notification.createdAt, new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)),
      ));
    if (recent.length) continue; // already raised this fortnight

    const corporate = await db.select({ userId: householdRoleAssignment.userId })
      .from(householdRoleAssignment)
      .where(and(
        eq(householdRoleAssignment.householdId, hh.id),
        inArray(householdRoleAssignment.role, ["corporate_admin", "corporate_ops"]),
      ));
    for (const r of corporate) {
      await db.insert(notification).values({
        id: globalThis.crypto.randomUUID(),
        userId: r.userId,
        householdId: hh.id,
        kind: "load_signal",
        title: `Load signal: ${hh.name}`,
        body: "Three consecutive visits report zone drift. Maintenance capacity is the "
          + "leading indicator (WK-STD-023, provision STD-023.2.7): the home may no longer "
          + "hold its reset between visits. Review scope or cadence with the client.",
      });
    }
  }
  return { households: households.length, signals };
}
