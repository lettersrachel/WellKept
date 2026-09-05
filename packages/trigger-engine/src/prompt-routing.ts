import { and, eq } from "drizzle-orm";
import { decisionRight, promptPackItem, routeByDecisionRights, emitOutboxEvent } from "@wellkept/schema";

/**
 * Q-6 (the routing clause moved here from Q-5 by founder ruling, 4
 * September 2026): a fired trigger lands in `anticipate`, and what
 * happens next reads against the household's Decision Rights block.
 * Below-threshold items may act without asking; above-threshold items
 * reach the decision inbox as `decide`.
 *
 * WHAT THIS ADDS OVER THE PURE FUNCTION, which is the whole point of the
 * row. `routeByDecisionRights` has been unit-tested since Q-6-2 and was
 * never once run against a REAL `decision_right` row: it took an array a
 * test built. A gate whose input comes from outside the process is
 * exercised against real inputs before it is trusted, so this reads the
 * household's own rights from the database and the integration test
 * proves all four directions against rows that are really there.
 *
 * ONLY `decide` IS STAMPED, and the asymmetry is deliberate. The
 * acceptance clause says above-threshold items reach the inbox AS
 * `decide`, so that value is named for us. There is NO value to stamp on
 * the auto-executing side: the Four-Stage spec's own flow sentence names
 * FIVE movements (anticipation, identification, decision-routing,
 * EXECUTION, monitoring) against the four-value tag it specifies two
 * paragraphs later, with `execution` absent. That contradiction was
 * reported on Q-5 and is not resolved by inventing a fifth value or by
 * borrowing `monitor`, which means something else. An auto-executable
 * item keeps the stage it had.
 *
 * AND NOTHING EXECUTES. "Auto-execute" here is a statement that the
 * household's rights PERMIT acting without asking; no execution engine
 * exists in this tree, so the outcome is recorded and logged and no act
 * follows it. Stated because "auto_execute" reads like something
 * happened.
 */
type Db = {
  select: (...args: never[]) => any;
  update: (...args: never[]) => any;
  insert: (...args: never[]) => any;
};

export type PromptRouting = {
  outcome: "auto_execute" | "propose" | "blocked";
  why: string;
  stamped: "decide" | null;
};

export async function routePromptItem(
  db: Db,
  args: { householdId: string; promptPackItemId: string; rightKey: string; amountCents: number | null },
): Promise<PromptRouting> {
  const rights = await (db as any).select().from(decisionRight)
    .where(eq(decisionRight.householdId, args.householdId));

  const result = routeByDecisionRights({
    rights: rights.map((r: any) => ({
      rightKey: r.rightKey, valueCents: r.valueCents, valueText: r.valueText,
    })),
    rightKey: args.rightKey,
    amountCents: args.amountCents,
  });

  let stamped: "decide" | null = null;
  if (result.outcome === "propose") {
    await (db as any).update(promptPackItem)
      .set({ stage: "decide" })
      .where(and(
        eq(promptPackItem.id, args.promptPackItemId),
        eq(promptPackItem.householdId, args.householdId),
      ));
    stamped = "decide";
  }

  await emitOutboxEvent(db as any, {
    householdId: args.householdId,
    kind: "prompt_pack_item.routed",
    payload: { promptPackItemId: args.promptPackItemId, rightKey: args.rightKey, outcome: result.outcome },
    provenance: "service:routePromptItem",
    objectId: args.promptPackItemId,
    correlationId: args.promptPackItemId,
  });

  return { outcome: result.outcome, why: result.why, stamped };
}
