import { asc, eq, sql } from "drizzle-orm";
import { household, playbookField, auditEvent, clientEdit } from "@wellkept/schema";
import { db } from "./db";

const sqlCount = () => sql<number>`count(*)::int`;

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

/** The HM field surface (/visit) resolves the user's first FIELD-role
 * household (house_manager / backup_hm), not just the first assigned one — so
 * a user who is corporate at one home and an HM at another still lands on the
 * field tool for the home they actually manage. Falls back to the first
 * assigned household (the page then redirects a non-field role away). */
export async function getFieldHouseholdAndPrincipal() {
  const { getPrincipal } = await import("./session");
  const assigned = await getAssignedHouseholds();
  const field = assigned.find((a) => a.role === "house_manager" || a.role === "backup_hm");
  const hh = field?.hh ?? assigned[0]?.hh ?? null;
  if (!hh) {
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
  const { isNull, and } = await import("drizzle-orm");
  return db.select().from(dot)
    .where(and(eq(dot.householdId, householdId), isNull(dot.promotedFieldId)))
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

/** People assigned to a household (provisioning surface, REQ-002). */
export async function getHouseholdMembers(householdId: string) {
  const { householdRoleAssignment, authUser } = await import("@wellkept/schema");
  return db.select({
    id: householdRoleAssignment.id,
    email: authUser.email,
    name: authUser.name,
    role: householdRoleAssignment.role,
    ndaApproved: householdRoleAssignment.ndaApproved,
    userId: authUser.id,
  })
    .from(householdRoleAssignment)
    .innerJoin(authUser, eq(authUser.id, householdRoleAssignment.userId))
    .where(eq(householdRoleAssignment.householdId, householdId))
    .orderBy(asc(householdRoleAssignment.role));
}

/** REQ-032: recent visit photos for a household (ids only — the bytes come
 * from the auth-gated /api/mobile/photo route). Newest first. */
export async function getVisitPhotos(householdId: string, limit = 12) {
  const { visitPhoto } = await import("@wellkept/schema");
  const { desc } = await import("drizzle-orm");
  return db.select({ id: visitPhoto.id, createdAt: visitPhoto.createdAt, uploadedBy: visitPhoto.uploadedBy })
    .from(visitPhoto)
    .where(eq(visitPhoto.householdId, householdId))
    .orderBy(desc(visitPhoto.createdAt))
    .limit(limit);
}

/** REQ-003: which of these users have a CONFIRMED TOTP second factor.
 * Used by the People & access panel to show 2FA status and gate the reset. */
export async function getTotpEnrolled(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { userTotp } = await import("@wellkept/schema");
  const { inArray, isNotNull, and } = await import("drizzle-orm");
  const rows = await db.select({ userId: userTotp.userId }).from(userTotp)
    .where(and(inArray(userTotp.userId, userIds), isNotNull(userTotp.confirmedAt)));
  return new Set(rows.map((r) => r.userId));
}

/** REQ-024: the client's data-stewardship summary — what CATEGORIES are
 * held (never values), how many items are secured in the vault, and when
 * anything secured was last accessed. The trust ceremony. */
export async function getStewardship(householdId: string) {
  const { playbookField, vaultItem, auditEvent } = await import("@wellkept/schema");
  const { and, inArray, desc } = await import("drizzle-orm");
  const fields = await db.select({ section: playbookField.section, sensitivity: playbookField.sensitivity, confirmed: playbookField.confirmed })
    .from(playbookField).where(eq(playbookField.householdId, householdId));
  const bySection = new Map<number, { held: number; confirmed: number }>();
  for (const f of fields) {
    const s = bySection.get(f.section) ?? { held: 0, confirmed: 0 };
    s.held += 1; if (f.confirmed) s.confirmed += 1;
    bySection.set(f.section, s);
  }
  const [vault] = await db.select({ n: sqlCount() }).from(vaultItem).where(eq(vaultItem.householdId, householdId));
  const lastAccess = await db.select({ at: auditEvent.createdAt, kind: auditEvent.kind })
    .from(auditEvent)
    .where(and(eq(auditEvent.householdId, householdId), inArray(auditEvent.kind, ["s3_reveal", "s3_corporate_view"])))
    .orderBy(desc(auditEvent.createdAt)).limit(1);
  return {
    sections: [...bySection.entries()].map(([section, v]) => ({ section, ...v })).sort((a, b) => a.section - b.section),
    totalHeld: fields.length,
    totalConfirmed: fields.filter((f) => f.confirmed).length,
    vaultCount: Number(vault?.n ?? 0),
    lastVaultAccess: lastAccess[0]?.at ?? null,
  };
}
