import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { visitCommand, timeEntry, deferral } from "@wellkept/schema";
import { db } from "./db";

const dayOf = (isoString: string) => new Date(isoString).toISOString().slice(0, 10);

export interface ApplyInput {
  idempotencyKey: string;
  type: "visit.submit" | "dot.create" | "signal.route";
  payload: { householdId: string; startedAt?: string; [k: string]: unknown };
}
export type ApplyResult = { conflict: false } | { conflict: true; reason: string | null };

/**
 * Server side of the offline-queue contract (ported from the July 12
 * foundation repo's PostgresVisitCommandStore). apply() is the idempotent
 * sink every drained command lands in:
 * - Redelivering the same idempotencyKey returns the recorded outcome —
 *   retries never double-apply or flip a result.
 * - A different visit.submit for a household that already has one applied
 *   for the same calendar day is a domain conflict: stored (never dropped,
 *   corporate reviews it) and reported back so the client queue records it
 *   without blocking the rest of the drain.
 * - dot.create / signal.route are append-only and never conflict.
 * Known simplification (inherited): the same-day check locks existing rows
 * but isn't backed by a unique constraint; fine for one device reconciling
 * after being offline, not for truly concurrent multi-device writes.
 */
export async function applyVisitCommand({ idempotencyKey, type, payload }: ApplyInput): Promise<ApplyResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(visitCommand).where(eq(visitCommand.id, idempotencyKey));
    if (existing) {
      return existing.status === "conflict"
        ? { conflict: true as const, reason: existing.reason }
        : { conflict: false as const };
    }

    let status: "applied" | "conflict" = "applied";
    let reason: string | null = null;
    if (type === "visit.submit") {
      const sameHousehold = await tx
        .select()
        .from(visitCommand)
        .where(and(
          eq(visitCommand.householdId, payload.householdId),
          eq(visitCommand.type, "visit.submit"),
          eq(visitCommand.status, "applied"),
        ))
        .for("update");
      const alreadyClosedToday = sameHousehold.some(
        (row) => dayOf((row.payload as { startedAt: string }).startedAt) === dayOf(payload.startedAt ?? ""),
      );
      if (alreadyClosedToday) {
        status = "conflict";
        reason = "last_write_wins";
      }
    }

    await tx.insert(visitCommand).values({
      id: idempotencyKey, type, householdId: payload.householdId, payload, status, reason,
    });

    // Capture session 1: an applied visit's hours BECOME a categorized
    // delivery time entry, in the same transaction — visit hours are now
    // derived from entries, and because the entry rides the idempotent
    // command apply, it survives offline sync with no client changes.
    if (type === "visit.submit" && status === "applied") {
      const hours = (payload as { hours?: { startedAt?: string; endedAt?: string } }).hours;
      const submittedBy = (payload as { submittedBy?: string }).submittedBy;
      const start = hours?.startedAt ? new Date(hours.startedAt) : null;
      const end = hours?.endedAt ? new Date(hours.endedAt) : null;
      if (submittedBy && start && end && !Number.isNaN(+start) && !Number.isNaN(+end) && +end > +start) {
        await tx.insert(timeEntry).values({
          id: randomUUID(),
          householdId: payload.householdId,
          userId: submittedBy,
          category: "delivery",
          startedAt: start,
          endedAt: end,
          minutes: Math.round((+end - +start) / 60_000),
          source: "visit_close",
          visitCommandId: idempotencyKey,
        });
      }
      // AC (W-6 follow-on): deferrals captured in the close flow land in
      // the same transaction as the visit they belong to, carrying this
      // command's id - the association IS the requirement (STD-016:
      // report what was noticed and left; the vehicle is the visit).
      // The close flow validated each draft; this re-checks the
      // structural minimum and skips (loudly) anything malformed rather
      // than conflicting the whole visit.
      const drafts = (payload as { deferrals?: unknown }).deferrals;
      if (submittedBy && Array.isArray(drafts)) {
        for (const d of drafts as Array<Record<string, unknown>>) {
          const noticed = typeof d.noticed === "string" ? d.noticed.trim().slice(0, 200) : "";
          const reason = typeof d.reason === "string" ? d.reason.trim().slice(0, 400) : "";
          const revisitDate = typeof d.revisitDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.revisitDate) ? d.revisitDate : null;
          const revisitCondition = typeof d.revisitCondition === "string" && d.revisitCondition.trim() ? d.revisitCondition.trim().slice(0, 200) : null;
          if (noticed.length < 4 || reason.length < 8 || (!revisitDate && !revisitCondition)) {
            console.error(`[visit-apply] malformed deferral draft skipped on ${idempotencyKey}`);
            continue;
          }
          await tx.insert(deferral).values({
            id: typeof d.id === "string" && /^[0-9a-f-]{36}$/i.test(d.id) ? d.id : randomUUID(),
            householdId: payload.householdId,
            noticed, reason, revisitDate, revisitCondition,
            decidedBy: submittedBy, decidedAt: new Date(),
            visitCommandId: idempotencyKey,
          }).onConflictDoNothing();
        }
      }
    }
    return status === "conflict" ? { conflict: true as const, reason } : { conflict: false as const };
  });
}

export async function listConflicts(householdId: string) {
  return db.select().from(visitCommand)
    .where(and(eq(visitCommand.householdId, householdId), eq(visitCommand.status, "conflict")));
}

export async function latestAppliedVisit(householdId: string) {
  const rows = await db.select().from(visitCommand)
    .where(and(
      eq(visitCommand.householdId, householdId),
      eq(visitCommand.type, "visit.submit"),
      eq(visitCommand.status, "applied"),
    ));
  rows.sort((a, b) => +a.receivedAt - +b.receivedAt);
  return rows[rows.length - 1] ?? null;
}
