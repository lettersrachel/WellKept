import { and, eq, isNull, lt } from "drizzle-orm";
import { expectedEvent, decisionRight, emitOutboxEvent, routeCandidateByMateriality } from "@wellkept/schema";

/**
 * Q-12b-1: the reconciliation sweep. An expectation whose window has
 * passed with no matching signal becomes `missing_expected`, and a
 * candidate decision opens beside it with its route computed.
 *
 * YEAR-TWO, SHADOW. It writes only on the expected_event row and the
 * outbox. It creates NO attention record, because those reach the
 * previsit brief and altering a HOM briefing is exactly what shadow
 * forbids; it creates no decision record, because `routed_by` is NOT
 * NULL and a sweep has no user to put there (G-66: do not invent an
 * actor). The candidate is words plus a route, carrying no person, in
 * the `time_segment` posture.
 *
 * IDEMPOTENT BY THE STATUS COLUMN: the sweep only reads rows whose
 * `reconciliation_status` IS NULL, and it sets one, so a second run in
 * the same minute finds nothing and emits nothing. There is no unique
 * index to lean on here because the row already exists; the NULL status
 * IS the claim-once mechanism.
 *
 * `matched` IS NEVER WRITTEN HERE and that is a build fact rather than
 * an oversight: nothing in this tree emits a signal that MATCHES an
 * expectation, which is Q-12b-2's changeset work. The other five
 * statuses are likewise unproduced today; the vocabulary ships whole so
 * their producers need no migration (the notification-firewall posture,
 * where five destinations shipped and the policy produced two).
 */
type Db = {
  select: (...args: never[]) => any;
  update: (...args: never[]) => any;
  insert: (...args: never[]) => any;
};

export async function sweepExpectedEvents(db: Db, now = new Date()): Promise<{ missed: number }> {
  const open = await (db as any).select().from(expectedEvent)
    .where(and(isNull(expectedEvent.reconciliationStatus), lt(expectedEvent.expectedBy, now)));

  let missed = 0;
  for (const e of open) {
    const rights = await (db as any).select().from(decisionRight)
      .where(eq(decisionRight.householdId, e.householdId));

    const route = routeCandidateByMateriality({
      rights: rights.map((r: any) => ({
        rightKey: r.rightKey, valueCents: r.valueCents,
        valueText: r.valueText, materiality: r.materiality,
      })),
      materiality: e.materiality ?? null,
      amountCents: e.amountCents ?? null,
    });

    await (db as any).update(expectedEvent).set({
      reconciliationStatus: "missing_expected",
      reconciledAt: now,
      // The candidate names what could be decided, in the expectation's
      // own words. It never names a person, and it never asks the
      // household anything: this row is read by corporate only.
      candidateDecision: `Expected and not seen: ${e.expectation}`,
      candidateRouting: route.outcome,
      candidateRoutingWhy: route.why,
      updatedAt: now,
    }).where(and(eq(expectedEvent.id, e.id), isNull(expectedEvent.reconciliationStatus)));

    await emitOutboxEvent(db as any, {
      householdId: e.householdId,
      kind: "expected_event.missing",
      payload: { expectedEventId: e.id, pattern: e.pattern, routing: route.outcome },
      occurredAt: now,
      provenance: "sweep:expected-event",
      objectId: e.id,
    });
    missed += 1;
  }
  return { missed };
}
