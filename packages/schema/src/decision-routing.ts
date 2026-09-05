/**
 * Q-6-2: the Decision Rights block as the ROUTING TABLE, in the
 * Four-Stage spec's own words. Below-threshold items auto-execute and
 * log in full; propose-first items enter the decision inbox;
 * never-decide items block until the household speaks.
 *
 * THE NULL-THRESHOLD CASE IS THE DEFAULT AND IT PROPOSES. A household
 * with no matching right, or a right whose value is not a ceiling,
 * routes to the member and never auto-executes. The safe direction is
 * the one that asks, and it is the direction a missing row falls in
 * rather than an exception somebody remembered to write.
 *
 * PRODUCER: `blocked` HAS NO PRODUCER YET, stated here in the same form
 * the migration headers use for an inert column (G-85), so its absence is
 * read as a build fact rather than as a defect. `auto_execute` and
 * `propose` are both produced by this function today; `blocked` is
 * declared and unreachable, and it becomes reachable when the founder's
 * never-decide rules exist as rules rather than as prose.
 *
 * `blocked` EXISTS IN THE VOCABULARY AND NOTHING PRODUCES IT YET. The
 * never-decide list is prose in the values package
 * (`decisions_that_always_require_member`: "any spend above cap; any new
 * vendor; anything touching a child's school medical or activity
 * enrollment; access changes; ..."), and turning a sentence into a
 * machine rule is a taxonomy, which is the founder's. The vocabulary
 * carries the value so her rules need no migration: the
 * notification-firewall posture, where five destinations shipped and the
 * policy produced two.
 *
 * MOVED from `apps/web/src/lib/` to `@wellkept/schema` on 5 September
 * 2026 (Q-12b-1), unchanged line for line, because the reconciliation
 * sweep runs in `@wellkept/trigger-engine` and a worker package cannot
 * import from the web app. The move is a relocation and not a semantics
 * change: its only importer at the time was its own test, which moved
 * with it. Stated here so a later reader does not read the new location
 * as a second opinion on where routing belongs.
 *
 * THE CALLER NAMES THE RIGHT. Mapping an arbitrary commitment to one of
 * the seventeen rights is itself a taxonomy, so this function takes the
 * `rightKey` verbatim rather than guessing it from a title.
 */

export type RouteOutcome = "auto_execute" | "propose" | "blocked";

export type RoutingRight = {
  rightKey: string;
  valueCents: number | null;
  valueText: string | null;
};

export type RoutingResult = { outcome: RouteOutcome; why: string };

export function routeByDecisionRights(args: {
  rights: RoutingRight[];
  rightKey: string;
  amountCents: number | null;
}): RoutingResult {
  const right = args.rights.find((r) => r.rightKey === args.rightKey);

  // 1. No right on record for this household. The null-threshold case.
  if (!right) {
    return { outcome: "propose", why: "no decision right on record for this household, so it is asked rather than assumed" };
  }

  // 2. A right whose value is a WORD, not a ceiling. Every word
  //    vocabulary in the source is per-right (`approved_substitute_only`,
  //    `propose_only`, `never_unattended`, `par_items_only`), and none of
  //    them has been mapped to a behaviour by anyone. Proposing is the
  //    honest answer until they are.
  if (right.valueCents === null) {
    return { outcome: "propose", why: `the right is recorded in words (${right.valueText ?? "unstated"}) rather than as a ceiling, and no mapping from those words to an action has been ruled` };
  }

  // 3. An amount nobody knows is not below a ceiling.
  if (args.amountCents === null) {
    return { outcome: "propose", why: "the amount is unknown, and an unknown amount is not below a ceiling" };
  }

  // 4. The one path that acts without asking.
  if (args.amountCents <= right.valueCents) {
    return { outcome: "auto_execute", why: `at or below the household's ceiling for ${right.rightKey}` };
  }
  return { outcome: "propose", why: `above the household's ceiling for ${right.rightKey}` };
}

/**
 * Q-12b-1: routing a reconciliation CANDIDATE by materiality.
 *
 * The spec's phrase is "candidate decisions routed by materiality", and
 * the mapping is DERIVED rather than chosen: `decision_right.materiality`
 * already carries the signed three-value classification from the source
 * sheet, so the rights of a given materiality are a fact on record and
 * not a taxonomy invented here.
 *
 * ONE COMPOSITION CALL IS MINE, reported under the standing tiebreak
 * rather than asked: where SEVERAL rights share a materiality, a
 * candidate auto-executes only if EVERY one of them would permit it.
 * That keeps `auto_execute`'s existing meaning (at or below the
 * household's ceiling) intact under each applicable ceiling, rather than
 * minting a new meaning such as "below the highest ceiling". Picking one
 * right instead would need a precedence rule nobody has ruled.
 *
 * EVERYTHING ELSE FALLS TO `propose`, which is this module's own
 * null-threshold default and the doctrine's safe direction. In
 * particular an UNCLASSIFIED expectation proposes: a miss whose
 * materiality nobody set is not below any ceiling, and treating NULL as
 * a permissive class would let an unmade judgment act.
 */
export function routeCandidateByMateriality(args: {
  rights: Array<RoutingRight & { materiality: string | null }>;
  materiality: string | null;
  amountCents: number | null;
}): RoutingResult {
  if (args.materiality === null) {
    return {
      outcome: "propose",
      why: "the expectation carries no materiality, and an unclassified miss is not below any ceiling",
    };
  }
  const applicable = args.rights.filter((r) => r.materiality === args.materiality);
  if (applicable.length === 0) {
    return {
      outcome: "propose",
      why: `no decision right of materiality ${args.materiality} on record for this household, so it is asked rather than assumed`,
    };
  }
  const results = applicable.map((r) =>
    routeByDecisionRights({ rights: [r], rightKey: r.rightKey, amountCents: args.amountCents }),
  );
  const blocking = results.find((r) => r.outcome !== "auto_execute");
  if (blocking) return blocking;
  return {
    outcome: "auto_execute",
    why: `at or below every ${args.materiality} ceiling on record (${applicable.length} right(s) checked)`,
  };
}
