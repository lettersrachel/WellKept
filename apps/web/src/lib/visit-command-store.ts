import { and, eq } from "drizzle-orm";
import { visitCommand } from "@wellkept/schema";
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
