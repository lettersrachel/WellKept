import { and, eq, isNull, lt } from "drizzle-orm";
import { deferral, pausedDecision, workItem, attentionRecord, decisionRecord, emitOutboxEvent } from "@wellkept/schema";

/**
 * RFC-PRIM-01 build 2: the attention sweep. The computed overdue
 * surfaces (deferrals past their timing, paused decisions whose timing
 * arrived, work items past their due date) WRITE attention records once,
 * instead of every surface recomputing per request. Idempotent by the
 * one-per-source unique index: a re-run inserts nothing, and only a
 * genuinely new insert emits the outbox event. An attention record
 * informs; nothing here acts.
 */
type Db = {
  select: (...args: never[]) => any;
  insert: (...args: never[]) => any;
};

export async function sweepAttentionRecords(db: Db): Promise<{ raised: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const candidates: Array<{ householdId: string; reason: string; sourceKind: string; sourceId: string; deadline: string | null }> = [];

  const overdueDeferrals = await (db as any).select().from(deferral)
    .where(and(isNull(deferral.resolvedAt), lt(deferral.revisitDate, today)));
  for (const d of overdueDeferrals) {
    candidates.push({
      householdId: d.householdId, sourceKind: "deferral", sourceId: d.id,
      reason: `Deferral past its timing: ${d.noticed}`, deadline: d.revisitDate,
    });
  }

  const overduePaused = await (db as any).select().from(pausedDecision)
    .where(and(isNull(pausedDecision.resolvedAt), lt(pausedDecision.revisitDate, today)));
  for (const p of overduePaused) {
    candidates.push({
      householdId: p.householdId, sourceKind: "paused_decision", sourceId: p.id,
      reason: `Paused decision, timing arrived: ${p.decision}`, deadline: p.revisitDate,
    });
  }

  const overdueWork = await (db as any).select().from(workItem)
    .where(and(eq(workItem.status, "open"), lt(workItem.dueDate, today)));
  for (const w of overdueWork) {
    candidates.push({
      householdId: w.householdId, sourceKind: "work_item", sourceId: w.id,
      reason: `Work item past its due date: ${w.title}`, deadline: w.dueDate,
    });
  }

  let raised = 0;
  for (const c of candidates) {
    const inserted = await (db as any).insert(attentionRecord).values({
      id: crypto.randomUUID(), householdId: c.householdId, reason: c.reason,
      sourceKind: c.sourceKind, sourceId: c.sourceId, audience: "hom",
      urgency: "soon", deadline: c.deadline,
    }).onConflictDoNothing({
      target: [attentionRecord.sourceKind, attentionRecord.sourceId],
    }).returning({ id: attentionRecord.id });
    if (inserted.length > 0) {
      raised += 1;
      await emitOutboxEvent(db as any, {
        householdId: c.householdId, kind: "attention_record.opened",
        payload: { attentionRecordId: inserted[0].id, sourceKind: c.sourceKind, sourceId: c.sourceId },
        provenance: "sweep:attention", objectId: inserted[0].id,
        correlationId: c.sourceId,
      });
    }
  }
  return { raised };
}

/** RFC-PRIM-01 build 3: pending decisions past their expiry EXPIRE on
 * the daily pass; expiry is the system's, never a decider (the
 * decided-xor-expired CHECK holds the two apart). Each expiry emits its
 * event once. */
export async function sweepDecisionExpiry(db: Db): Promise<{ expired: number }> {
  const now = new Date();
  const pending = await (db as any).select().from(decisionRecord)
    .where(and(isNull(decisionRecord.outcome), isNull(decisionRecord.expiredAt), lt(decisionRecord.expiresAt, now)));
  let expired = 0;
  for (const d of pending) {
    await (db as any).update(decisionRecord)
      .set({ expiredAt: now, updatedAt: now })
      .where(and(eq(decisionRecord.id, d.id), isNull(decisionRecord.outcome), isNull(decisionRecord.expiredAt)));
    await emitOutboxEvent(db as any, {
      householdId: d.householdId, kind: "decision_record.expired",
      payload: { decisionRecordId: d.id }, occurredAt: now,
      provenance: "sweep:decision-expiry", objectId: d.id,
    });
    expired += 1;
  }
  return { expired };
}
