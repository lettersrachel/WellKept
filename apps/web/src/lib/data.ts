import { asc, eq } from "drizzle-orm";
import { household, playbookField, auditEvent, clientEdit } from "@wellkept/schema";
import { db } from "./db";

export async function getHousehold() {
  const rows = await db.select().from(household).limit(1);
  return rows[0] ?? null;
}

/** Pilot phase runs one household; pages resolve it plus the caller's principal. */
export async function getHouseholdAndPrincipal() {
  const { getPrincipal } = await import("./session");
  const hh = await getHousehold();
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

export async function getRecentAudit(householdId: string, limit = 12) {
  const rows = await db
    .select()
    .from(auditEvent)
    .where(eq(auditEvent.householdId, householdId))
    .orderBy(asc(auditEvent.createdAt));
  return rows.slice(-limit).reverse();
}
