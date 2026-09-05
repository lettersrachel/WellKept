/**
 * Q-6-2: the Handled invariant, computed.
 *
 * The invariant is adopted law (CLAUDE.md): a thing is closed only when
 * an accountable owner exists AND no required member decision is
 * unresolved AND a follow-up or watch exists where external completion
 * is pending AND verification requirements are satisfied or explicitly
 * pending. `commitment_ledger_item` carries the four clauses as columns
 * and a CHECK refuses a close while any is unmet, so the database is the
 * enforcement and this module is the READING.
 *
 * NOTHING HERE IS STORED. `handled`, the display state and M-25 are all
 * computed from the clause columns for the reason `time_segment`'s
 * duration is computed rather than stored: a stored answer and its
 * inputs drift, and the drift is silent.
 *
 * FREEZE POSTURE: the display words are the member vocabulary the queue
 * row names, and no member surface renders them. Today they render
 * corporate-side only. The member decision inbox is Q-6's freeze-gated
 * half.
 */

/** Only the columns the invariant reads. A caller passing a whole row is fine. */
export type LedgerClauses = {
  accountableOwner: string | null;
  memberDecisionQuestion: string | null;
  memberDecisionResolvedAt: Date | string | null;
  externalCompletionOn: string | null;
  followUpAt: Date | string | null;
  verifiedAt: Date | string | null;
  verificationPendingReason: string | null;
  closedAt: Date | string | null;
};

/** The four clauses, each with the words a person can act on. */
export const HANDLED_CLAUSES = [
  "an accountable owner exists",
  "no required member decision is unresolved",
  "a follow-up exists where external completion is pending",
  "verification is satisfied or explicitly pending",
] as const;

/** Which clauses are NOT met, in the invariant's own order. Empty means handled. */
export function unmetClauses(i: LedgerClauses): string[] {
  const unmet: string[] = [];
  if (!i.accountableOwner) unmet.push(HANDLED_CLAUSES[0]);
  if (i.memberDecisionQuestion && !i.memberDecisionResolvedAt) unmet.push(HANDLED_CLAUSES[1]);
  if (i.externalCompletionOn && !i.followUpAt) unmet.push(HANDLED_CLAUSES[2]);
  if (!i.verifiedAt && !i.verificationPendingReason) unmet.push(HANDLED_CLAUSES[3]);
  return unmet;
}

/** The invariant itself. Closing is refused by the database when this is false. */
export function isHandled(i: LedgerClauses): boolean {
  return unmetClauses(i).length === 0;
}

export type LedgerDisplayState = "needs you" | "handled" | "approaching" | "done or changed";

/**
 * The four display states the queue row names, as a TOTAL function over
 * the ledger. Precedence: closed wins, then an unresolved member
 * decision, then the invariant.
 *
 * **`approaching` MEANS OPEN AND NOT YET HANDLED, and the reading is
 * REPORTED rather than assumed.** The other reading is temporal, "due
 * soon", and it cannot be built without inventing a threshold for how
 * near "soon" is, which is expressly barred. Under the temporal reading
 * the four states are also not total: an item with no owner and no due
 * date would fall through all four. This reading needs no knob and
 * covers every row, so it is the one that keeps existing meanings
 * intact (the standing tiebreak). If the founder wants the temporal
 * reading, it is a nullable `due_at` column plus a founder-set window,
 * and nothing is approaching while the window is unset.
 */
export function displayState(i: LedgerClauses): LedgerDisplayState {
  if (i.closedAt) return "done or changed";
  if (i.memberDecisionQuestion && !i.memberDecisionResolvedAt) return "needs you";
  return isHandled(i) ? "handled" : "approaching";
}

/**
 * M-25: decisions surfaced per household per week. Counted from
 * `member_decision_asked_at`, which is the moment the question was put
 * to the household, NOT row creation: an item can exist for weeks
 * before anyone asks anything, and counting creation would report load
 * the household never felt.
 *
 * The spec expects M-25 LOW AND FALLING as the record learns a
 * household, so the number only means something read over time.
 * Computed, never stored.
 *
 * Window is half-open [from, to), so consecutive weeks cannot
 * double-count a Sunday-midnight ask.
 */
export function m25(asked: Array<{ memberDecisionAskedAt: Date | string | null }>, from: Date, to: Date): number {
  return asked.filter((a) => {
    if (!a.memberDecisionAskedAt) return false;
    const t = new Date(a.memberDecisionAskedAt).getTime();
    return t >= from.getTime() && t < to.getTime();
  }).length;
}
