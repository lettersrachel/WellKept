import { asc, eq } from "drizzle-orm";
import { household, playbookField, auditEvent, clientEdit } from "@wellkept/schema";
import { db } from "./db";

export async function getHousehold() {
  const rows = await db.select().from(household).limit(1);
  return rows[0] ?? null;
}

/** Households the signed-in user is assigned to (REQ-001: no wildcard grants). */
export async function getAssignedHouseholds() {
  const { getSessionUser } = await import("./session");
  const { householdRoleAssignment } = await import("@wellkept/schema");
  const user = await getSessionUser();
  if (!user) return [];
  const rows = await db
    .select({ hh: household, role: householdRoleAssignment.role })
    .from(householdRoleAssignment)
    .innerJoin(household, eq(household.id, householdRoleAssignment.householdId))
    .where(eq(householdRoleAssignment.userId, user.id))
    .orderBy(asc(household.createdAt));
  return rows;
}

/** Single-household surfaces (client, HM) resolve the user's FIRST assigned
 * household; a signed-out session gets the null pair. */
export async function getHouseholdAndPrincipal() {
  const { getPrincipal } = await import("./session");
  const assigned = await getAssignedHouseholds();
  const hh = assigned[0]?.hh ?? null;
  if (!hh) {
    // Distinguish "no household seeded" from "not signed in" for the pages.
    const seeded = await getHousehold();
    return { hh: seeded, principal: null } as const;
  }
  return { hh, principal: await getPrincipal(hh.id) } as const;
}

/** Corporate drill-in: a specific household, principal resolved for IT. */
export async function getHouseholdAndPrincipalById(householdId: string) {
  const { getPrincipal } = await import("./session");
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  if (!hh) return { hh: null, principal: null } as const;
  return { hh, principal: await getPrincipal(hh.id) } as const;
}

export async function getFields(householdId: string) {
  return db
    .select()
    .from(playbookField)
    .where(eq(playbookField.householdId, householdId))
    .orderBy(asc(playbookField.section), asc(playbookField.name));
}

export async function getPendingEdits(householdId: string) {
  return db
    .select()
    .from(clientEdit)
    .where(eq(clientEdit.householdId, householdId))
    .orderBy(asc(clientEdit.createdAt));
}

export async function getOpenDots(householdId: string) {
  const { dot } = await import("@wellkept/schema");
  return db.select().from(dot)
    .where(eq(dot.householdId, householdId))
    .orderBy(asc(dot.heardAt));
}

/** Unfired pack items, soonest first — the anticipation surface (REQ-052). */
export async function getUpcomingPackItems(householdId: string, limit = 8) {
  const { promptPackItem } = await import("@wellkept/schema");
  const { isNull, and } = await import("drizzle-orm");
  const rows = await db.select().from(promptPackItem)
    .where(and(eq(promptPackItem.householdId, householdId), isNull(promptPackItem.firedAt)))
    .orderBy(asc(promptPackItem.fireAt));
  return rows.slice(0, limit);
}

export async function getRecentAudit(householdId: string, limit = 12) {
  const rows = await db
    .select()
    .from(auditEvent)
    .where(eq(auditEvent.householdId, householdId))
    .orderBy(asc(auditEvent.createdAt));
  return rows.slice(-limit).reverse();
}

/** REQ-030 deltas: fields that changed since the last applied visit. */
export async function getDeltasSince(householdId: string, since: Date | null) {
  const { playbookField } = await import("@wellkept/schema");
  const { and, gt } = await import("drizzle-orm");
  const cutoff = since ?? new Date(Date.now() - 7 * 24 * 3600_000);
  return db.select().from(playbookField)
    .where(and(eq(playbookField.householdId, householdId), gt(playbookField.updatedAt, cutoff)))
    .orderBy(asc(playbookField.updatedAt));
}

export async function getStrangerTests(householdId: string) {
  const { strangerTest } = await import("@wellkept/schema");
  return db.select().from(strangerTest)
    .where(eq(strangerTest.householdId, householdId))
    .orderBy(asc(strangerTest.createdAt));
}

export async function getGestures(householdId: string) {
  const { gesture } = await import("@wellkept/schema");
  return db.select().from(gesture)
    .where(eq(gesture.householdId, householdId))
    .orderBy(asc(gesture.createdAt));
}

/** REQ-014 registries, permission-filtered by the same matrix as fields. */
export async function getRegistries(householdId: string, role: string) {
  const { registryEntry } = await import("@wellkept/schema");
  const { readDecision } = await import("@wellkept/permissions");
  const { isNull, and } = await import("drizzle-orm");
  const rows = await db.select().from(registryEntry)
    .where(and(eq(registryEntry.householdId, householdId), isNull(registryEntry.tombstonedAt)))
    .orderBy(asc(registryEntry.kind), asc(registryEntry.label));
  return rows.filter((r) => readDecision(role, r.sensitivity) !== "denied");
}
