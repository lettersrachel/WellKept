import { attentionRecord, emitOutboxEvent } from "@wellkept/schema";
import { destinationFor } from "@wellkept/trigger-engine";
import { db } from "@/lib/db";

/**
 * G-81, FOUNDER RULING 27 August 2026: a client-facing send that THIS
 * SYSTEM REFUSED TO MAKE raises an `attention_record` for the corporate
 * queue.
 *
 * **This is a scoped exception to the standing posture, not a
 * precedent.** The standing posture is that routing decisions belong to
 * the founder's rule set and not to engineering: it is why the capture
 * router does no keyword or severity routing, why nothing reaches
 * `immediate_interrupt`, and why the firewall shipped with a
 * deliberately conservative v1 policy. That posture is unchanged. The
 * exception is granted for one reason, stated in the ruling: **the
 * failure is invisible by construction.** A member who receives nothing
 * cannot distinguish a suppressed send from a quiet week, and neither
 * can anyone else, so the refusal otherwise produces no signal anywhere
 * and no rule set can be written about an event nobody can observe.
 *
 * NARROW, and to stay narrow:
 *  - ONE trigger: a send this system decided not to make.
 *  - NOT delivery failures, NOT bounces, NOT vendor or provider errors.
 *    Those are things that happened TO a send we chose to make, they
 *    already surface as thrown errors at the mail seam, and they are a
 *    different question.
 *  - ONE destination, and it comes from `destinationFor`, never a
 *    literal, so the firewall stays the single place a destination is
 *    decided.
 *  - No adjacent event class is added here because it fits the same
 *    plumbing. When a broader capture-router ruling exists, this folds
 *    into it; until then it does not stand in for one.
 *
 * Best-effort, like the send it reports on: `applyVisitCommand` has
 * already committed, so a failure to record the notice must not throw
 * and must not un-apply anything.
 */
export async function raiseSuppressedSendNotice(householdId: string, why: string): Promise<void> {
  try {
    const id = crypto.randomUUID();
    // sourceKind 'system' with a null sourceId: the CHECK's own value for
    // a notice that points at no row. Nulls never collide in the
    // (source_kind, source_id) unique index, so each suppressed send is
    // its own row, which is right: each one is a separate thing a member
    // did not receive.
    const [row] = await db.insert(attentionRecord).values({
      id, householdId,
      // Structural only. The reason never carries a report sentence: the
      // sentences are the member's own content, and a message names WHAT
      // happened, never a value (the G-68 rule).
      reason: `Client visit report not sent: ${why}. The visit is recorded; the member received no email.`,
      sourceKind: "system", sourceId: null,
      audience: "corporate",
      // urgency deliberately left to the column default. Which class of
      // notice is urgent is the founder's rule set, not a default an
      // engineer picks at a call site.
      destination: destinationFor({ audience: "corporate" }),
    }).returning({ id: attentionRecord.id });
    if (!row) return;
    await emitOutboxEvent(db, {
      householdId, kind: "attention_record.opened",
      payload: { attentionRecordId: row.id, sourceKind: "system" },
      provenance: "mail:client-visit-report", objectId: row.id,
    });
  } catch (err) {
    console.error(
      `[visit-report] could not record the suppressed-send notice for household ${householdId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
