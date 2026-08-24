import { eq, asc } from "drizzle-orm";
import { conditionFlag, objectObservation, shadowLog } from "@wellkept/schema";
import { evaluateInShadow, type ShadowSignal, type ShadowSink, type ShadowTrigger } from "./shadow.ts";

/**
 * The shadow pass over a live drizzle connection (WK-DEV-007 section 3):
 * evaluate every shadow trigger against every household's current state
 * and record what WOULD have surfaced to the shadow_log table. Runs in
 * the worker on a schedule; nothing here notifies a HOM, reaches a
 * client, or creates a task. Fixture households are deliberately
 * INCLUDED: the directive wants the engine evaluating synthetic
 * households continuously, and the log is internal.
 */
type Db = {
  select: (...args: never[]) => any;
  insert: (...args: never[]) => any;
};

/** The table-backed sink. One row per distinct input state per trigger
 * per household: the unique index dedupes, and a re-evaluation of
 * unchanged inputs inserts nothing (determinism is proven in the shadow
 * suite, so the duplicate row would only be scoring noise). */
export function dbShadowSink(db: Db): ShadowSink {
  return {
    async record(signal: ShadowSignal) {
      await (db as any).insert(shadowLog).values({
        id: crypto.randomUUID(),
        householdId: signal.householdId,
        triggerKey: signal.triggerKey,
        signal: signal.signal,
        confidence: Math.round(signal.confidence * 100),
        evidence: signal.evidence,
        proposedClass: signal.proposedClass,
        inputsHash: signal.inputsHash,
        evaluatedAt: new Date(signal.evaluatedAt),
      }).onConflictDoNothing();
    },
  };
}

/**
 * Shadow trigger 1: condition-decline. An open condition flag whose look
 * series is falling is the engine's first would-have-said-something:
 * "this is getting worse between visits." Reads ONLY what W-5 already
 * captures (the flag and its looks); proposes A0/observe, nothing more.
 *
 * v1 parameters, PROPOSALS for calibration by the founder's weekly
 * scoring (that loop is the whole point of shadow mode):
 * - at least 3 looks (mirrors flag_promotion's minObservations default);
 * - non-increasing end to end with a total drop of at least 1;
 * - confidence 0.5 baseline plus 0.1 per point of total drop beyond the
 *   first, capped at 0.9 (never certain from a series alone).
 */
export const conditionDeclineTrigger: ShadowTrigger = {
  key: "condition-decline",
  evaluate(inputs) {
    const looks = Array.isArray(inputs.looks) ? (inputs.looks as number[]) : [];
    if (looks.length < 3) return null;
    for (let i = 1; i < looks.length; i++) if (looks[i]! > looks[i - 1]!) return null;
    const drop = looks[0]! - looks[looks.length - 1]!;
    if (drop < 1) return null;
    return {
      signal: `condition declining on ${String(inputs.subject)} (${String(inputs.location)})`,
      confidence: Math.min(0.9, 0.5 + 0.1 * (drop - 1)),
      evidence: [`looks over ${looks.length} visits: ${looks.join(", ")}`],
      proposedClass: "A0",
    };
  },
};

export const SHADOW_TRIGGERS: ShadowTrigger[] = [conditionDeclineTrigger];

/** One full pass: every open condition flag, every shadow trigger. The
 * REL-01 flags record is read once by the caller and passed in, so the
 * per-trigger kill switches work with no deploy. */
export async function runShadowPass(
  db: Db,
  opts: { flags?: Record<string, boolean>; evaluatedAt?: string } = {},
): Promise<{ evaluated: number; recorded: number }> {
  const sink = dbShadowSink(db);
  const open = await (db as any)
    .select()
    .from(conditionFlag)
    .where(eq(conditionFlag.status, "open"));

  let evaluated = 0;
  let recorded = 0;
  for (const flag of open) {
    const looks = await (db as any)
      .select({ value: objectObservation.value })
      .from(objectObservation)
      .where(eq(objectObservation.conditionFlagId, flag.id))
      .orderBy(asc(objectObservation.observedAt));
    for (const trigger of SHADOW_TRIGGERS) {
      evaluated += 1;
      const signal = await evaluateInShadow(
        trigger,
        flag.householdId,
        { subject: flag.subject, location: flag.location, looks: looks.map((l: { value: number }) => l.value) },
        sink,
        opts,
      );
      if (signal) recorded += 1;
    }
  }
  return { evaluated, recorded };
}
