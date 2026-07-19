/**
 * The full trigger pass over a live drizzle connection: load the rule
 * library + household tag, evaluate (pure, engine.ts), insert
 * prompt_pack_item rows idempotently. Shared by BOTH runners:
 *  - services/worker (BullMQ consumer, long-lived — Railway et al.)
 *  - apps/web inline after each field write (serverless-friendly)
 * Deterministic item ids mean the two can run side by side: whoever gets
 * there second inserts nothing. At-least-once anywhere, at-most-once rows.
 */
import { eq, isNull, or } from "drizzle-orm";
import { household, triggerRule, promptPackItem } from "@wellkept/schema";
import { evaluate, deterministicItemId, type FieldChangeEvent, type TriggerRuleRow } from "./engine.ts";

// Minimal structural type: both runners pass their own drizzle instance.
type Db = {
  select: (...args: never[]) => any;
  insert: (...args: never[]) => any;
};

export async function runTriggerPass(db: any, event: FieldChangeEvent) {
  const [hh] = await db.select().from(household).where(eq(household.id, event.householdId));
  if (!hh) return { emitted: 0, reason: "unknown household" };

  const rules = (await db
    .select()
    .from(triggerRule)
    .where(or(isNull(triggerRule.householdId), eq(triggerRule.householdId, event.householdId)))) as TriggerRuleRow[];

  const drafts = evaluate(event, rules, { statusTag: hh.statusTag });
  let emitted = 0;
  for (const draft of drafts) {
    const id = await deterministicItemId(event, draft.triggerRuleId, draft.itemText);
    const inserted = await db
      .insert(promptPackItem)
      .values({ id, ...draft })
      .onConflictDoNothing({ target: promptPackItem.id })
      .returning({ id: promptPackItem.id });
    emitted += inserted.length;
  }
  return { emitted, evaluated: rules.length, suppressed: hh.statusTag === "LIFE-EVENT" };
}
