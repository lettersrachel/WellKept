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

export type LedgerDisplayState = "needs you" | "handled" | "unowned" | "in_progress" | "done or changed";

/**
 * The display states, as a TOTAL function over the ledger. Precedence:
 * closed wins, then an unresolved member decision, then the invariant,
 * then ownership.
 *
 * **`in_progress` MEANS OPEN AND NOT YET HANDLED.** It was called
 * `approaching` for one commit, which is the queue row's own word, and
 * was RENAMED by founder ruling 5 September 2026 with the reason worth
 * keeping: **a state named `approaching` will be read as temporal by
 * every future reader whatever the definition says.** Renaming it now
 * leaves the temporal state available later under a name that actually
 * describes it, once a threshold exists to define one. Nothing here is
 * temporal; no due date is stored and no window knob exists.
 *
 * **`unowned` IS THE FIFTH STATE, added by the same ruling**, and the
 * reason is the invariant's own purpose: an unowned commitment is
 * precisely what the Handled invariant exists to stop from being
 * forgotten, so it is made VISIBLE rather than folded into the general
 * open state. Four states left an open unowned item describable only as
 * "not handled", which is the ledger holding a row it cannot describe.
 *
 * **The precedence call, reported rather than buried:** an item that is
 * BOTH unowned and awaiting the member reads `needs you`, because that is
 * the state the queue row already gave that shape and the standing
 * tiebreak keeps existing meanings intact. Its unownedness is not lost:
 * `unmetClauses` names the missing owner on every such row, and the
 * corporate card renders that line, so the fact is on the screen whatever
 * the state word says.
 *
 * **The member vocabulary is still the queue row's four.** `unowned` is
 * the company's own word for its own failure, and whether a member ever
 * sees it is a question for the freeze-gated inbox rather than a decision
 * taken here.
 */
export function displayState(i: LedgerClauses): LedgerDisplayState {
  if (i.closedAt) return "done or changed";
  if (i.memberDecisionQuestion && !i.memberDecisionResolvedAt) return "needs you";
  if (isHandled(i)) return "handled";
  return i.accountableOwner ? "in_progress" : "unowned";
}

/** Every state the function can return. Exported so a caller cannot enumerate a stale list. */
export const LEDGER_DISPLAY_STATES: LedgerDisplayState[] =
  ["needs you", "handled", "unowned", "in_progress", "done or changed"];

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
