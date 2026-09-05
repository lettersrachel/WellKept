import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { changeset, changesetEffect, workRequirement, emitOutboxEvent } from "@wellkept/schema";

/**
 * Q-12b-2: changeset propagation. A source change invalidates or
 * recomputes dependents (intake BENCHMARK_ADOPTION section 2).
 *
 * YEAR-TWO, SHADOW, on `expected_event`'s terms: it writes only on the
 * changeset's own tables and the outbox. No attention record (those reach
 * the previsit brief), no member channel, no HOM briefing.
 *
 * V1'S DEPENDENCY RULE IS NARROW AND IT IS WRITTEN HERE RATHER THAN
 * INFERRED. A dependent is an OPEN work requirement of the same household
 * whose timing is at or after the change: work already completed or
 * verified cannot be invalidated by something that happened afterwards,
 * and a requirement dated before the change was executed against the old
 * world correctly. THE DEPENDENCY GRAPH THE SPEC EVENTUALLY WANTS (which
 * task profiles derive from which household facts) DOES NOT EXIST IN THIS
 * TREE and is not invented here; it arrives with Gate 3's generator.
 *
 * EVERY EFFECT IS `invalidated` TODAY AND `recomputed` HAS NO PRODUCER,
 * stated in the G-85 form so its absence reads as a build fact. Marking a
 * requirement recomputed would mean something recomputed it, and nothing
 * does: requirements are created by a person. The conservative direction
 * is the one that says the work may now be wrong rather than the one that
 * says it has been fixed.
 *
 * IDEMPOTENT by the one-effect-per-dependent unique index. A second run
 * inserts nothing and emits nothing.
 */
type Db = {
  select: (...args: never[]) => any;
  insert: (...args: never[]) => any;
};

const OPEN_STATUSES = ["generated", "activated", "ready", "scheduled", "started", "reopened", "deferred"];

export async function propagateChangeset(
  db: Db,
  args: { changesetId: string; householdId: string },
): Promise<{ effects: number }> {
  const [cs] = await (db as any).select().from(changeset)
    .where(and(eq(changeset.id, args.changesetId), eq(changeset.householdId, args.householdId)));
  if (!cs) return { effects: 0 };

  const onOrAfter = cs.detectedAt.toISOString().slice(0, 10);
  const dependents = await (db as any).select().from(workRequirement)
    .where(and(
      eq(workRequirement.householdId, args.householdId),
      inArray(workRequirement.status, OPEN_STATUSES),
      // A requirement with a stated context and no date has no timing to
      // compare, so it counts as a dependent: the honest reading of an
      // unknown date is that it may still be ahead of the change.
      or(gte(workRequirement.dueOn, onOrAfter), isNull(workRequirement.dueOn)),
    ));

  let effects = 0;
  for (const w of dependents) {
    const inserted = await (db as any).insert(changesetEffect).values({
      id: crypto.randomUUID(),
      householdId: args.householdId,
      changesetId: args.changesetId,
      dependentKind: "work_requirement",
      dependentId: w.id,
      effect: "invalidated",
      reason: `open work dated on or after the change (${w.dueOn ?? w.contextWindow}); the change may have made it wrong`,
    }).onConflictDoNothing({
      target: [changesetEffect.changesetId, changesetEffect.dependentKind, changesetEffect.dependentId],
    }).returning({ id: changesetEffect.id });
    if (inserted.length > 0) effects += 1;
  }

  if (effects > 0) {
    await emitOutboxEvent(db as any, {
      householdId: args.householdId,
      kind: "changeset.propagated",
      payload: { changesetId: args.changesetId, effects },
      provenance: "service:propagateChangeset",
      objectId: args.changesetId,
      correlationId: args.changesetId,
    });
  }
  return { effects };
}

/**
 * The "near-term commitments lock" clause. THE HORIZON IS A THRESHOLD AND
 * IT IS NOT CHOSEN HERE: `changeset_lock_horizon` ships NULL and nothing
 * locks while it is null, which is the `visit_reconciliation` and
 * `capacity_gate` shape. A null knob is a quiet knob, not a permissive
 * one: it means the lock is unbuilt rather than open.
 */
export function lockedDependents(args: {
  horizonDays: number | null;
  today: Date;
  dependents: Array<{ id: string; dueOn: string | null }>;
}): string[] {
  if (args.horizonDays === null) return [];
  const cutoff = new Date(args.today.getTime() + args.horizonDays * 24 * 3600 * 1000)
    .toISOString().slice(0, 10);
  const todayIso = args.today.toISOString().slice(0, 10);
  return args.dependents
    .filter((d) => d.dueOn !== null && d.dueOn >= todayIso && d.dueOn <= cutoff)
    .map((d) => d.id);
}
