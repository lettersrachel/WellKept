import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import {
  visitCommand, timeEntry, deferral, conditionFlag, objectObservation,
  registryEntry, pausedDecision, promptPackItem, promptOutcome,
  captureArtifact, emitOutboxEvent,
} from "@wellkept/schema";
import { db } from "./db";
import {
  validateFlagCreate, validateFlagLook, validateFlagClose,
  validateDeferralResolve, validatePausedDecisionResolve, validatePromptOutcome,
} from "./visit-command-validate";

const dayOf = (isoString: string) => new Date(isoString).toISOString().slice(0, 10);

export type CommandType =
  | "visit.submit" | "dot.create" | "signal.route"
  // Input spine build 1: the visit-page capture surfaces, offline-capable.
  | "flag.create" | "flag.look" | "flag.close"
  | "deferral.resolve" | "pausedDecision.resolve" | "prompt.outcome";

export interface ApplyInput {
  idempotencyKey: string;
  type: CommandType;
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
    const actor = typeof payload.submittedBy === "string" ? payload.submittedBy : null;

    // Input spine build 1: each visit-page capture type mirrors its server
    // action's rules via the shared validators, then performs the same
    // write the action performs, in this transaction, attributed to the
    // route-stamped actor. An invalid or target-missing command is
    // recorded as a conflict with its reason, never dropped: "nothing is
    // lost" means a bad capture surfaces where conflicts already surface.
    const NEW_TYPES = new Set(["flag.create", "flag.look", "flag.close", "deferral.resolve", "pausedDecision.resolve", "prompt.outcome"]);
    if (NEW_TYPES.has(type)) {
      if (!actor) { status = "conflict"; reason = "bad_input:actor"; }
      else if (type === "flag.create") {
        const v = validateFlagCreate(payload);
        if (!v.ok) { status = "conflict"; reason = v.reason; }
        else {
          let entryId: string | null = null;
          if (v.clean.registryEntryId) {
            const [entry] = await tx.select({ id: registryEntry.id }).from(registryEntry)
              .where(and(eq(registryEntry.id, v.clean.registryEntryId), eq(registryEntry.householdId, payload.householdId), isNull(registryEntry.tombstonedAt)))
              .limit(1);
            if (!entry) { status = "conflict"; reason = "missing_registry_entry"; }
            else entryId = entry.id;
          }
          if (status === "applied") {
            await tx.insert(conditionFlag).values({
              id: v.clean.id ?? randomUUID(), householdId: payload.householdId, registryEntryId: entryId,
              subject: v.clean.subject, location: v.clean.location, concern: v.clean.concern,
              raisedBy: actor, raisedAt: new Date(),
              revisitDate: v.clean.revisitDate, revisitCondition: v.clean.revisitCondition,
            }).onConflictDoNothing();
          }
        }
      } else if (type === "flag.look") {
        const v = validateFlagLook(payload);
        if (!v.ok) { status = "conflict"; reason = v.reason; }
        else {
          const [flag] = await tx.select({ id: conditionFlag.id, registryEntryId: conditionFlag.registryEntryId })
            .from(conditionFlag)
            .where(and(eq(conditionFlag.id, v.clean.flagId), eq(conditionFlag.householdId, payload.householdId), eq(conditionFlag.status, "open")))
            .limit(1);
          if (!flag) { status = "conflict"; reason = "missing_flag"; }
          else {
            await tx.insert(objectObservation).values({
              id: randomUUID(), householdId: payload.householdId, registryEntryId: flag.registryEntryId,
              conditionFlagId: flag.id, measure: "condition", value: v.clean.value, note: v.clean.note,
              observedAt: new Date(), recordedBy: actor,
            });
          }
        }
      } else if (type === "flag.close") {
        const v = validateFlagClose(payload);
        if (!v.ok) { status = "conflict"; reason = v.reason; }
        else {
          const [flag] = await tx.select({ id: conditionFlag.id }).from(conditionFlag)
            .where(and(eq(conditionFlag.id, v.clean.flagId), eq(conditionFlag.householdId, payload.householdId), eq(conditionFlag.status, "open")))
            .limit(1);
          if (!flag) { status = "conflict"; reason = "missing_flag"; }
          else {
            await tx.update(conditionFlag)
              .set({ status: "closed", closedAt: new Date(), closedBy: actor, closeReason: v.clean.closeReason, updatedAt: new Date() })
              .where(eq(conditionFlag.id, flag.id));
          }
        }
      } else if (type === "deferral.resolve") {
        const v = validateDeferralResolve(payload);
        if (!v.ok) { status = "conflict"; reason = v.reason; }
        else {
          const [row] = await tx.select({ id: deferral.id }).from(deferral)
            .where(and(eq(deferral.id, v.clean.targetId), eq(deferral.householdId, payload.householdId), isNull(deferral.resolvedAt)))
            .limit(1);
          if (!row) { status = "conflict"; reason = "missing_deferral"; }
          else {
            await tx.update(deferral)
              .set({ resolution: v.clean.resolution, resolvedAt: new Date(), resolvedBy: actor, updatedAt: new Date() })
              .where(eq(deferral.id, row.id));
          }
        }
      } else if (type === "pausedDecision.resolve") {
        const v = validatePausedDecisionResolve(payload);
        if (!v.ok) { status = "conflict"; reason = v.reason; }
        else {
          const [row] = await tx.select({ id: pausedDecision.id }).from(pausedDecision)
            .where(and(eq(pausedDecision.id, v.clean.targetId), eq(pausedDecision.householdId, payload.householdId), isNull(pausedDecision.resolvedAt)))
            .limit(1);
          if (!row) { status = "conflict"; reason = "missing_paused_decision"; }
          else {
            await tx.update(pausedDecision)
              .set({ resolution: v.clean.resolution, resolvedAt: new Date(), resolvedBy: actor, updatedAt: new Date() })
              .where(eq(pausedDecision.id, row.id));
          }
        }
      } else if (type === "prompt.outcome") {
        const v = validatePromptOutcome(payload);
        if (!v.ok) { status = "conflict"; reason = v.reason; }
        else {
          const [item] = await tx.select().from(promptPackItem).where(eq(promptPackItem.id, v.clean.promptId));
          if (!item || item.householdId !== payload.householdId) { status = "conflict"; reason = "missing_prompt"; }
          else {
            const answeredAt = new Date();
            let leadDays: number | null = null;
            if (item.targetDate) {
              const target = new Date(`${item.targetDate}T12:00:00Z`);
              leadDays = Math.round((target.getTime() - answeredAt.getTime()) / (24 * 60 * 60 * 1000));
            }
            const role = typeof payload.submittedByRole === "string" ? payload.submittedByRole : null;
            if (!role) { status = "conflict"; reason = "bad_input:actor_role"; }
            else {
              await tx.insert(promptOutcome).values({
                id: randomUUID(), householdId: item.householdId, promptId: item.id, ruleId: item.triggerRuleId,
                provisionRef: null, userId: actor, role: role as "house_manager",
                outcome: v.clean.outcome, firedAt: item.firedAt ?? item.fireAt, answeredAt,
                targetDate: item.targetDate, leadDays, note: v.clean.note,
                wasNews: v.clean.wasNews, dismissReason: v.clean.dismissReason,
              }).onConflictDoNothing({ target: [promptOutcome.promptId, promptOutcome.userId] });
            }
          }
        }
      }
    }

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
        // REQ-083 (register A561): the covenant event stream. The applied
        // visit's hours ARE the arrival and departure taps, so the events
        // ride the same transaction as the visit and the time entry.
        // Deliberately NO person in the payload: attribution already lives
        // in time_entry under the approved G-13 item, and the covenant
        // report joins through visitCommandId when it is built (Phase 2).
        // No consumer exists yet; unconsumed kinds wait in the outbox
        // untouched, attempts unspent, which is the outbox working.
        // s4 envelope (0046): actor deliberately stays null here, the
        // same no-person rule the payload already follows; the covenant
        // report joins attribution through time_entry, never this row.
        await emitOutboxEvent(tx, {
          householdId: payload.householdId, kind: "visit.arrival",
          payload: { visitCommandId: idempotencyKey, occurredAt: start.toISOString() },
          occurredAt: start, provenance: "sink:visit-commands",
          objectId: idempotencyKey, correlationId: idempotencyKey,
        });
        await emitOutboxEvent(tx, {
          householdId: payload.householdId, kind: "visit.departure",
          payload: { visitCommandId: idempotencyKey, occurredAt: end.toISOString() },
          occurredAt: end, provenance: "sink:visit-commands",
          objectId: idempotencyKey, correlationId: idempotencyKey,
        });
      }
      // WK-DEV-009 s2.3 into s8: the closing question's real answer IS a
      // Tell Well Kept capture, landed in the same transaction as the
      // visit that asked it, so saying it once at close is saying it
      // once. "none" is the quiet path and writes nothing; the human
      // router files whatever else arrives, exactly like the visit-page
      // box.
      const anythingMissing = (payload as { anythingMissing?: unknown }).anythingMissing;
      const missingText = typeof anythingMissing === "string" ? anythingMissing.trim() : "";
      if (missingText && missingText.toLowerCase() !== "none" && submittedBy) {
        const captureId = randomUUID();
        await tx.insert(captureArtifact).values({
          id: captureId, householdId: payload.householdId, kind: "text",
          content: missingText.slice(0, 2000), capturedBy: submittedBy,
          visitCommandId: idempotencyKey,
        });
        await emitOutboxEvent(tx, {
          householdId: payload.householdId, kind: "capture_artifact.created",
          payload: { captureArtifactId: captureId, kind: "text" },
          provenance: "sink:visit-commands:anything-missing",
          objectId: captureId, actor: submittedBy, correlationId: idempotencyKey,
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
