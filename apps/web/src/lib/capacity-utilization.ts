import { and, eq, gte, inArray, isNull, sql as dsql } from "drizzle-orm";
import { household, householdRoleAssignment, authUser, timeEntry } from "@wellkept/schema";

/**
 * Ruling 1 as amended (register A581, founder option (b), 25 Aug 2026):
 * per-HOM utilization serves exactly two purposes, the covenant report
 * and the capacity-gate evaluation, and the corporate board's
 * founder/CFO-only capacity section is the DISPLAY SURFACE of the
 * capacity-gate evaluation. This module is the permission-matrix
 * enforcement point WK-DEV-007 section 5 requires: the gate lives HERE,
 * not in the UI, so a surface cannot forget it, and the role-based
 * retrieval tests prove the refusal on the function itself. The bars,
 * held structurally where code can hold them:
 *
 *  - corporate_ops (and every non-corporate role) is REFUSED: the
 *    function returns null and computes nothing. Founder and CFO map to
 *    corporate_admin and cfo_readonly, the only corporate roles those
 *    seats hold.
 *  - NO ordering by rate: the returned rows are sorted by household
 *    count (one of the three permitted sorts: route, household count,
 *    gate proximity), and no field of the row is a speed, a rank, or a
 *    comparison. Hours per household is capacity load, and the render
 *    carries no highlighting.
 *  - Testers are excluded by the single is_tester filter (the
 *    provisioning contract: tester events enter no covenant or
 *    capacity computation); fixture households are excluded as
 *    everywhere.
 */
export const UTILIZATION_ROLES = new Set(["corporate_admin", "cfo_readonly"]);

export type PerHomUtilizationRow = {
  name: string;
  households: number;
  deliveryHours30d: number;
  hoursPerHousehold: number;
};

type Db = {
  select: (...args: never[]) => unknown;
};

export async function perHomUtilization(
  db: Db,
  viewerRoles: string[],
): Promise<PerHomUtilizationRow[] | null> {
  // The matrix gate: no qualifying role, no computation, no data.
  if (!viewerRoles.some((r) => UTILIZATION_ROLES.has(r))) return null;
  const d = db as unknown as typeof import("./db").db;

  const homes = await d.select({ id: household.id })
    .from(household)
    .where(and(eq(household.isFixture, false), isNull(household.archivedAt)));
  const homeIds = homes.map((h) => h.id);
  if (homeIds.length === 0) return [];

  const homs = await d.select({
    userId: householdRoleAssignment.userId,
    name: authUser.name,
    email: authUser.email,
    households: dsql<number>`count(distinct ${householdRoleAssignment.householdId})::int`,
  }).from(householdRoleAssignment)
    .innerJoin(authUser, eq(authUser.id, householdRoleAssignment.userId))
    .where(and(
      inArray(householdRoleAssignment.householdId, homeIds),
      eq(householdRoleAssignment.role, "house_manager"),
      eq(authUser.isTester, false),
    ))
    .groupBy(householdRoleAssignment.userId, authUser.name, authUser.email);
  if (homs.length === 0) return [];

  const d30 = new Date(Date.now() - 30 * 86_400_000);
  const hours = await d.select({
    userId: timeEntry.userId,
    minutes: dsql<number>`coalesce(sum(${timeEntry.minutes}), 0)::int`,
  }).from(timeEntry)
    .where(and(
      inArray(timeEntry.householdId, homeIds),
      inArray(timeEntry.userId, homs.map((h) => h.userId)),
      eq(timeEntry.category, "delivery"),
      gte(timeEntry.startedAt, d30),
    ))
    .groupBy(timeEntry.userId);
  const minutesOf = new Map(hours.map((h) => [h.userId, h.minutes]));

  return homs
    .map((h) => {
      const deliveryHours30d = Math.round(((minutesOf.get(h.userId) ?? 0) / 60) * 10) / 10;
      return {
        name: h.name ?? h.email,
        households: h.households,
        deliveryHours30d,
        hoursPerHousehold: h.households > 0 ? Math.round((deliveryHours30d / h.households) * 10) / 10 : 0,
      };
    })
    // Household count is a permitted sort (A581); rate ordering is not,
    // and nothing downstream may re-sort by the hour fields.
    .sort((a, b) => b.households - a.households || a.name.localeCompare(b.name));
}
