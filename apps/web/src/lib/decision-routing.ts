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
