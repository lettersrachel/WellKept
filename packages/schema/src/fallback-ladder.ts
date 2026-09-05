/**
 * Q-12b-3: walking a household's fallback ladder.
 *
 * The five steps are RFC-ATTR-01 Amendment 1 section A1.3's vocabulary
 * as written, and their ORDER is the vocabulary's own: `preferred` is
 * what the household wants, `approved_substitute` and
 * `established_backup` are options somebody already approved for this
 * household, `vetted_bench` is an option the company vetted that nobody
 * approved for this household in particular, and `ask` is the floor.
 * Nothing here invents an ordering.
 *
 * THE AUTHORITY IS READ, NEVER MINTED (founder instruction, 5 September
 * 2026). Whether a step may be taken without asking is answered by the
 * household's own Decision Rights. This module contributes no threshold,
 * no default ceiling and no per-step permission of its own.
 *
 * THE AUTHORITY QUESTION IS ASKED ONCE PER PLAN, NOT ONCE PER RUNG, and
 * that is a finding rather than a convenience. The first version of this
 * function looped over the rungs calling the router inside the loop,
 * which READ as four permission checks and was not: the router's inputs
 * are the rights, the materiality and the amount, none of which changes
 * between rungs, so all four calls returned the same answer and the loop
 * always stopped at the first rung with an option on record. It was
 * correct and it misdescribed itself, which is the worse of the two,
 * because the next reader would have believed the rungs were separately
 * authorised.
 *
 * WHETHER THEY SHOULD BE IS A FOUNDER QUESTION AND IS REPORTED, NOT
 * ANSWERED (queue row Q-12b-3). There is a real argument that taking an
 * `approved_substitute` exercises an approval somebody already gave for
 * this household while taking a `vetted_bench` option is a new act, so
 * the two should not clear the same bar. Building that would mean
 * deciding that an approval in one domain governs an action in another,
 * which is exactly the standing rule's bar, and it would mean minting a
 * per-rung permission here. Both are hers.
 *
 * THE EVERY-CEILING-PERMITS COMPOSITION IS APPLIED AND IS A NO-OP HERE
 * BY CONSTRUCTION, which is worth saying rather than leaving to be
 * rediscovered. The plan names ONE right (`decision_right_key`, the
 * caller-names-the-right rule `expected_event` already holds), and
 * `decision_right_household_key_unique` makes at most one row match it
 * per household. So "every applicable ceiling must permit" ranges over a
 * set of at most one. It is written as a fold anyway rather than as a
 * `.find()`, so that if that unique index is ever relaxed the rule holds
 * instead of silently taking whichever row came back first.
 *
 * `ask` NEEDS NO RIGHT. It is not an action the household granted; it is
 * the step that means the authority ran out. So the ladder always
 * terminates and never returns "nothing".
 *
 * A MISSING OPTION IS SKIPPED, NOT REFUSED. A household with no
 * preferred option has given a real answer, and the walk moves to the
 * next rung rather than treating the absence as a failure. Whether a
 * household's ladder should SKIP A RUNG IT HAS is the per-household
 * ordering question, also reported and not built.
 *
 * NOTHING EXECUTES. A reached step is a statement about what the
 * household's grant permits. No part of this system acts on it, here or
 * anywhere else in the tree.
 */
import { routeByDecisionRights, type RoutingRight, type RoutingResult } from "./decision-routing";

export type FallbackStep =
  | "preferred"
  | "approved_substitute"
  | "established_backup"
  | "vetted_bench"
  | "ask";

/** The ladder, in the vocabulary's own order. `ask` is the floor and is not walked. */
export const FALLBACK_RUNGS: ReadonlyArray<Exclude<FallbackStep, "ask">> = [
  "preferred",
  "approved_substitute",
  "established_backup",
  "vetted_bench",
];

export type LadderPlan = {
  preferredOption: string | null;
  approvedSubstitute: string | null;
  establishedBackup: string | null;
  vettedBench: string | null;
  decisionRightKey: string | null;
  amountCents: number | null;
};

export type LadderResult = { step: FallbackStep; why: string };

function optionFor(plan: LadderPlan, rung: Exclude<FallbackStep, "ask">): string | null {
  switch (rung) {
    case "preferred": return plan.preferredOption;
    case "approved_substitute": return plan.approvedSubstitute;
    case "established_backup": return plan.establishedBackup;
    case "vetted_bench": return plan.vettedBench;
  }
}

/**
 * The one authority question. Every right matching the named key must
 * permit; a plan naming no right proposes, which is the module's
 * null-threshold default arriving here rather than being re-decided.
 */
function permittedWithoutAsking(args: {
  rights: RoutingRight[];
  decisionRightKey: string | null;
  amountCents: number | null;
}): RoutingResult {
  if (args.decisionRightKey === null) {
    return {
      outcome: "propose",
      why: "the plan names no decision right, and a step nobody granted is asked rather than assumed",
    };
  }
  const applicable = args.rights.filter((r) => r.rightKey === args.decisionRightKey);
  if (applicable.length === 0) {
    return {
      outcome: "propose",
      why: `no decision right ${args.decisionRightKey} on record for this household, so it is asked rather than assumed`,
    };
  }
  for (const right of applicable) {
    const routed = routeByDecisionRights({
      rights: [right],
      rightKey: right.rightKey,
      amountCents: args.amountCents,
    });
    if (routed.outcome !== "permitted_without_asking") return routed;
  }
  return {
    outcome: "permitted_without_asking",
    why: `at or below every ${args.decisionRightKey} ceiling on record (${applicable.length} right(s) checked)`,
  };
}

export function walkFallbackLadder(args: {
  plan: LadderPlan;
  rights: RoutingRight[];
}): LadderResult {
  const authority = permittedWithoutAsking({
    rights: args.rights,
    decisionRightKey: args.plan.decisionRightKey,
    amountCents: args.plan.amountCents,
  });
  if (authority.outcome !== "permitted_without_asking") {
    return { step: "ask", why: `no step may be taken without asking: ${authority.why}` };
  }
  for (const rung of FALLBACK_RUNGS) {
    if (optionFor(args.plan, rung) !== null) {
      return { step: rung, why: `${rung} is the first option on record, and ${authority.why}` };
    }
  }
  return { step: "ask", why: `the plan carries no option on any rung, and ${authority.why}` };
}
