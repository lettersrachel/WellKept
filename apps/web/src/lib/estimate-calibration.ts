import { desc, eq } from "drizzle-orm";
import { estimateSnapshot, taskOccurrence } from "@wellkept/schema";

/**
 * WL Gate 2 SCAFFOLDING (A581 item 5's permission: estimator work that
 * binds no task ids may begin ahead of the Inventory adoption). This
 * module is deliberately the smallest honest piece of the estimator:
 * estimate-versus-actual arithmetic on ONE work requirement, keyed on
 * the requirement's own uuid (the execution grain), never a catalog
 * id, T or WKT.
 *
 * Rails held structurally:
 *  - NULL is the honest unknown at every step (the 0052/0053 posture):
 *    no estimate on record, no actual on record, or either side
 *    unknown yields a null variance, never an invented zero.
 *  - No person appears anywhere: occurrences store no performer by
 *    construction (0053), estimates never surface their estimator
 *    (Ruling 1 posture), and this module's row carries neither.
 *  - No learning, no priors, no vocabulary: the estimate-hierarchy
 *    and calibration models are Gate 2's verbatim adoptions from the
 *    forecasting brief and are NOT anticipated here. This computes
 *    what the record already says, nothing more.
 *  - Corporate-side only: the one consumer is the drill-in's
 *    requirement card (a corporate route); D7 keeps every duration
 *    off client routes, and this module adds no route.
 */
export type RequirementCalibration = {
  workRequirementId: string;
  /** Latest estimate on record; null = no estimate, or estimate unknown. */
  estimatedMinutes: number | null;
  estimateCount: number;
  /** Latest occurrence's actual; null = no occurrence, or actual unknown. */
  actualMinutes: number | null;
  occurrenceCount: number;
  /** actual minus estimate, only when BOTH are known; null otherwise. */
  varianceMinutes: number | null;
};

type Db = { select: (...args: never[]) => unknown };

export async function requirementCalibration(
  db: Db,
  workRequirementId: string,
): Promise<RequirementCalibration> {
  const d = db as unknown as typeof import("./db").db;
  const estimates = await d.select({
    estimatedMinutes: estimateSnapshot.estimatedMinutes,
  }).from(estimateSnapshot)
    .where(eq(estimateSnapshot.workRequirementId, workRequirementId))
    .orderBy(desc(estimateSnapshot.createdAt));
  const occurrences = await d.select({
    actualMinutes: taskOccurrence.actualMinutes,
  }).from(taskOccurrence)
    .where(eq(taskOccurrence.workRequirementId, workRequirementId))
    .orderBy(desc(taskOccurrence.occurredOn), desc(taskOccurrence.createdAt));

  const estimatedMinutes = estimates[0]?.estimatedMinutes ?? null;
  const actualMinutes = occurrences[0]?.actualMinutes ?? null;
  return {
    workRequirementId,
    estimatedMinutes,
    estimateCount: estimates.length,
    actualMinutes,
    occurrenceCount: occurrences.length,
    varianceMinutes:
      estimatedMinutes !== null && actualMinutes !== null
        ? actualMinutes - estimatedMinutes
        : null,
  };
}
