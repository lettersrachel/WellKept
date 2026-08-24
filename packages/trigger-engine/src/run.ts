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

/**
 * REQ-056: load a household's exclusion rows and a floor predicate for the
 * drafts' method refs, then filter. Fail closed — an errored exclusion read
 * suppresses every non-floor draft (A2 Part 3); floors always pass.
 */
async function applyExclusions<T extends import("./engine.ts").PromptPackItemDraft>(
  db: any,
  householdId: string,
  drafts: T[],
  ctx: { fieldName?: string } = {},
): Promise<{ kept: T[]; suppressed: number }> {
  if (drafts.length === 0) return { kept: drafts, suppressed: 0 };
  const { filterExcludedDrafts, failClosedDrafts } = await import("./exclusions.ts");

  // Floor predicate: only queried for refs the drafts actually carry.
  let floorRefs = new Set<string>();
  const refs = [...new Set(drafts.map((d) => d.methodRef).filter((r): r is string => Boolean(r)))];
  if (refs.length) {
    try {
      const { standardProvision } = await import("@wellkept/schema");
      const { inArray, and } = await import("drizzle-orm");
      const rows = await db.select({ id: standardProvision.id }).from(standardProvision)
        .where(and(inArray(standardProvision.id, refs), inArray(standardProvision.tier, ["floor_1", "floor_2"])));
      floorRefs = new Set(rows.map((r: { id: string }) => r.id));
    } catch {
      // Can't tell floor from method: treat every carried ref as a floor so a
      // broken provision read can never silence a safety step.
      floorRefs = new Set(refs);
    }
  }
  const isFloorRef = (ref: string) => floorRefs.has(ref);

  try {
    const { anticipationExclusion } = await import("@wellkept/schema");
    const exclusions = await db.select().from(anticipationExclusion)
      .where(eq(anticipationExclusion.householdId, householdId));
    return filterExcludedDrafts(drafts, exclusions, { ctx, isFloorRef });
  } catch {
    return failClosedDrafts(drafts, isFloorRef); // fail closed, floors excepted
  }
}

export async function runTriggerPass(db: any, event: FieldChangeEvent) {
  const [hh] = await db.select().from(household).where(eq(household.id, event.householdId));
  if (!hh) return { emitted: 0, reason: "unknown household" };

  const rules = (await db
    .select()
    .from(triggerRule)
    .where(or(isNull(triggerRule.householdId), eq(triggerRule.householdId, event.householdId)))) as TriggerRuleRow[];

  const drafts = evaluate(event, rules, { statusTag: hh.statusTag });
  const { kept, suppressed: excluded } = await applyExclusions(db, event.householdId, drafts, { fieldName: event.fieldName });
  let emitted = 0;
  for (const draft of kept) {
    const id = await deterministicItemId(event, draft.triggerRuleId, draft.itemText);
    const { methodRef: _ref, ...values } = draft; // not a prompt_pack_item column
    const inserted = await db
      .insert(promptPackItem)
      .values({ id, ...values })
      .onConflictDoNothing({ target: promptPackItem.id })
      .returning({ id: promptPackItem.id });
    emitted += inserted.length;
  }
  return { emitted, evaluated: rules.length, excluded, suppressed: hh.statusTag === "LIFE-EVENT" };
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
  const { sweepRegistryDates, sweepMovableObservances, sweepItemId, OBSERVANCES_FIELD_PREFIX } = await import("./registry-sweep.ts");

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
        .where(and(eq(playbookField.householdId, hh.id), like(playbookField.name, `${OBSERVANCES_FIELD_PREFIX}%`)))
        .limit(1);
      drafts.push(...sweepMovableObservances(observances, [
        { householdId: hh.id, statusTag: hh.statusTag, fieldValue: obsField?.value ?? "" },
      ], { now: opts.now }));
    }
    const { kept } = await applyExclusions(db, hh.id, drafts); // REQ-056, fail closed
    for (const draft of kept) {
      // id keys on (family rule, household, occurrence, text) — the text
      // embeds the entry label, so distinct entries never collide.
      const id = await sweepItemId(draft.triggerRuleId + ":" + draft.householdId, draft.occurrence, draft.itemText);
      const { occurrence, ...values } = draft;
      const inserted = await db.insert(promptPackItem)
        // occurrence becomes target_date (A2/REQ-055 lead-time calibration).
        .values({ id, ...values, targetDate: occurrence.slice(0, 10) })
        .onConflictDoNothing({ target: promptPackItem.id })
        .returning({ id: promptPackItem.id });
      emitted += inserted.length;
    }
  }
  return { households: households.length, emitted };
}

/**
 * REQ-054: materialize season observations from the household's own anchors
 * (applied visits, dots, executed gestures). Runs with the daily sweep, any
 * number of times — ids are deterministic on the anchor, so re-runs insert
 * nothing. Rows accumulate silently for a year before recall has anything
 * to say (A2: that is the point of building it during the pilot).
 */
export async function materializeSeasonObservations(db: any, opts: { householdId?: string; now?: Date } = {}) {
  const { visit, dot, gesture, seasonObservation } = await import("@wellkept/schema");
  const { deriveSeasonObservations, seasonObservationId } = await import("./season.ts");
  type Anchor = import("./season.ts").SeasonAnchor;

  const anchors: Anchor[] = [];
  const visits = await db.select().from(visit)
    .where(opts.householdId ? eq(visit.householdId, opts.householdId) : undefined);
  for (const v of visits) {
    if (!v.submittedAt || !v.reportSentence1) continue;
    anchors.push({ kind: "visit", id: v.id, householdId: v.householdId, occurredAt: v.submittedAt, text: v.reportSentence1 });
  }
  const dots = await db.select().from(dot)
    .where(opts.householdId ? eq(dot.householdId, opts.householdId) : undefined);
  for (const d of dots) {
    anchors.push({ kind: "dot", id: d.id, householdId: d.householdId, occurredAt: d.heardAt, text: d.verbatim });
  }
  const gestures = await db.select().from(gesture)
    .where(opts.householdId ? eq(gesture.householdId, opts.householdId) : undefined);
  for (const g of gestures) {
    if (!g.executedAt) continue;
    anchors.push({ kind: "gesture", id: g.id, householdId: g.householdId, occurredAt: g.executedAt, text: g.idea });
  }

  let inserted = 0;
  for (const draft of deriveSeasonObservations(anchors)) {
    const id = await seasonObservationId(draft.anchorKind, draft.anchorId);
    const rows = await db.insert(seasonObservation)
      .values({ id, ...draft })
      .onConflictDoNothing({ target: seasonObservation.id })
      .returning({ id: seasonObservation.id });
    inserted += rows.length;
  }
  return { anchors: anchors.length, inserted };
}

/**
 * CAND-OUTBOX-01: drain THE transactional outbox through a per-kind
 * consumer registry. Claims a batch of unprocessed rows in order, runs
 * the registered consumer for each (consumers are idempotent), and
 * stamps processed_at; a failure counts against the row's bounded
 * attempts. A kind with NO registered consumer is left untouched with
 * attempts unspent and is reported in the result, so a primitive may
 * emit events before its consumer ships without being dead-lettered.
 * Runs anywhere, any number of times.
 */
export type OutboxConsumer = (db: any, householdId: string, payload: Record<string, unknown>) => Promise<void>;

export const OUTBOX_CONSUMERS: Record<string, OutboxConsumer> = {
  "field.changed": async (db, householdId, payload) => {
    await runTriggerPass(db, {
      householdId,
      fieldId: String(payload.fieldId),
      fieldName: String(payload.fieldName),
      section: Number(payload.section),
      newValue: String(payload.newValue),
      changedAt: new Date(String(payload.changedAt)).toISOString(),
    });
  },
};

export async function drainEventOutbox(
  db: any,
  opts: { batch?: number; maxAttempts?: number; consumers?: Record<string, OutboxConsumer> } = {},
) {
  const { eventOutbox } = await import("@wellkept/schema");
  const { isNull, and, lt, asc } = await import("drizzle-orm");
  const batch = opts.batch ?? 100;
  const maxAttempts = opts.maxAttempts ?? 10;
  const consumers = opts.consumers ?? OUTBOX_CONSUMERS;

  const pending = await db.select().from(eventOutbox)
    .where(and(isNull(eventOutbox.processedAt), lt(eventOutbox.attempts, maxAttempts)))
    .orderBy(asc(eventOutbox.createdAt))
    .limit(batch);

  let processed = 0;
  let unconsumed = 0;
  for (const row of pending) {
    const consumer = consumers[row.kind];
    if (!consumer) { unconsumed += 1; continue; }
    try {
      await consumer(db, row.householdId, row.payload as Record<string, unknown>);
      await db.update(eventOutbox).set({ processedAt: new Date() }).where(eq(eventOutbox.id, row.id));
      processed += 1;
    } catch (err) {
      await db.update(eventOutbox).set({ attempts: row.attempts + 1 }).where(eq(eventOutbox.id, row.id));
      console.error(`[outbox] ${row.kind} row ${row.id} failed (attempt ${row.attempts + 1}):`, err instanceof Error ? err.message : err);
    }
  }
  if (unconsumed > 0) console.error(`[outbox] ${unconsumed} row(s) of kinds with no registered consumer left waiting (not an error; their consumer has not shipped)`);
  return { pending: pending.length, processed, unconsumed };
}

/** The pre-generalization name, kept so existing schedulers keep working. */
export const drainFieldOutbox = drainEventOutbox;

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
