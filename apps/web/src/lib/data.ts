import { asc, desc, eq, sql } from "drizzle-orm";
import { household, playbookField, auditEvent, clientEdit } from "@wellkept/schema";
import { db } from "./db";

const sqlCount = () => sql<number>`count(*)::int`;

/**
 * DO NOT CALL THIS. It has no callers today and it must not gain one as
 * written. G-95.
 *
 * `.limit(1)` with no ORDER BY returns whatever row Postgres hands back
 * first, which carries no guarantee whatsoever. In a multi-tenant table
 * that means it returns AN ARBITRARY HOUSEHOLD, and the name reads as
 * though it returns THE household. `demo-content.ts` shipped the same
 * shape and would have written one demo household's content onto a
 * different tenant; against production the row it returns is not the one
 * anybody had in mind.
 *
 * The hazard is that this is dead code, so nothing fails and nothing
 * warns. Whoever finds it will reasonably assume a function called
 * `getHousehold` works, and it does, in a development database with one
 * household in it, which is exactly where it will be tested.
 *
 * WHAT TO USE INSTEAD: `getHouseholdAndPrincipal()` resolves through the
 * signed-in user's own assignment, `getHouseholdAndPrincipalById()` takes
 * an explicit id, and a script that needs a known fixture pins it from
 * `tooling/fixture-ids.mjs` and REFUSES when the id finds nothing rather
 * than falling back.
 *
 * It stays here rather than being deleted in this change because deleting
 * it is a separate decision from marking it; the register entry names
 * that. If you are reading this because you were about to call it, the
 * answer is no.
 */
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

/**
 * W-5: open condition flags with their live looks and the promotion
 * verdict. Promotion is computed here from the series and the
 * flag_promotion knob (rateThreshold ships null: nothing promotes until
 * the founder sets it from real numbers). Candidates sort first, so a
 * promoted flag RISES in the briefing rather than creating a prompt
 * (founder decision 4).
 */
export async function getOpenConditionFlags(householdId: string) {
  const { conditionFlag, objectObservation, appSetting, DEFAULT_FLAG_PROMOTION, isPromotionCandidate, conditionRatePer30Days } = await import("@wellkept/schema");
  const { isNull, and, inArray, asc: ascOp } = await import("drizzle-orm");
  const flags = await db.select().from(conditionFlag)
    .where(and(eq(conditionFlag.householdId, householdId), eq(conditionFlag.status, "open")))
    .orderBy(asc(conditionFlag.raisedAt));
  if (flags.length === 0) return [];
  const looks = await db.select({
    conditionFlagId: objectObservation.conditionFlagId, value: objectObservation.value,
    observedAt: objectObservation.observedAt, measure: objectObservation.measure,
  }).from(objectObservation)
    .where(and(inArray(objectObservation.conditionFlagId, flags.map((f) => f.id)), isNull(objectObservation.supersededAt)))
    .orderBy(ascOp(objectObservation.observedAt));
  const [knobRow] = await db.select().from(appSetting).where(eq(appSetting.key, "flag_promotion"));
  const knob = { ...DEFAULT_FLAG_PROMOTION, ...((knobRow?.value as object | undefined) ?? {}) };
  const out = flags.map((f) => {
    const series = looks.filter((l) => l.conditionFlagId === f.id && l.measure === "condition");
    return {
      ...f,
      looks: series.map((l) => ({ value: l.value, observedAt: l.observedAt })),
      // Session Y: the rate window opens when the flag was raised.
      ratePer30Days: conditionRatePer30Days(series, f.raisedAt),
      promotionCandidate: isPromotionCandidate(series, knob, f.raisedAt),
    };
  });
  return out.sort((a, b) => Number(b.promotionCandidate) - Number(a.promotionCandidate));
}

/** W-6: deferrals, newest first. Staff read (full rows). */
export async function getDeferrals(householdId: string, limit = 12) {
  const { deferral } = await import("@wellkept/schema");
  return db.select().from(deferral)
    .where(eq(deferral.householdId, householdId))
    .orderBy(desc(deferral.decidedAt))
    .limit(limit);
}

/** AD (W-7): paused decisions, newest first. Staff read only - there is
 * no client projection at all; the payload guard treats any leaked row
 * as a violation. */
export async function getPausedDecisions(householdId: string, limit = 12) {
  const { pausedDecision } = await import("@wellkept/schema");
  return db.select().from(pausedDecision)
    .where(eq(pausedDecision.householdId, householdId))
    .orderBy(desc(pausedDecision.pausedAt))
    .limit(limit);
}

/** W-6: the CLIENT projection of deferrals - the content is for them by
 * design (noticed, the reason, the intended timing); the staff attribution
 * never rides along. The page re-asserts this with the payload guard. */
export async function getClientDeferrals(householdId: string, limit = 12) {
  const { deferral } = await import("@wellkept/schema");
  return db.select({
    id: deferral.id, noticed: deferral.noticed, reason: deferral.reason,
    revisitDate: deferral.revisitDate, revisitCondition: deferral.revisitCondition,
    decidedAt: deferral.decidedAt,
    // AB: resolution and when, never who (attribution stays staff-side).
    resolution: deferral.resolution, resolvedAt: deferral.resolvedAt,
  }).from(deferral)
    .where(eq(deferral.householdId, householdId))
    .orderBy(desc(deferral.decidedAt))
    .limit(limit);
}

export async function getOpenDots(householdId: string) {
  const { dot } = await import("@wellkept/schema");
  const { isNull, and } = await import("drizzle-orm");
  return db.select().from(dot)
    .where(and(eq(dot.householdId, householdId), isNull(dot.promotedFieldId)))
    .orderBy(asc(dot.heardAt));
}

/** Unfired pack items, soonest first — the anticipation surface (REQ-052). */
/**
 * Every prompt this household has open, oldest first. `fired_at` is set
 * when a HOM ANSWERS the prompt and by nothing else, so an unanswered
 * prompt stays open however old it is (the founder's ruling, 27 August
 * 2026: surfacing must not retire, because a prompt a HOM saw and did not
 * act on is exactly the thing that should still be there next visit, and
 * nothing ages out, because a prompt going quiet on its own is the
 * silent-failure shape).
 *
 * NO PANEL LIMIT HERE, deliberately. This used to slice to eight ordered
 * oldest-first, which is a single pool: a backlog of past-due items
 * consumed every slot and nothing with a future date was ever fetched, so
 * the forward-looking panel read "Nothing scheduled in the window" while
 * eight stale prompts filled the view. The caps belong to the PARTITION
 * (partitionPrompts), which caps overdue and upcoming separately, so one
 * can no longer starve the other. The bound below is a safety rail
 * against an unbounded read, not a display decision, and is far above any
 * real household's open count; if it is ever reached, the partition's
 * hidden counts are the thing that says so.
 */
export async function getUpcomingPackItems(householdId: string, limit = 200) {
  const { promptPackItem } = await import("@wellkept/schema");
  const { isNull, and } = await import("drizzle-orm");
  const rows = await db.select().from(promptPackItem)
    .where(and(eq(promptPackItem.householdId, householdId), isNull(promptPackItem.firedAt)))
    .orderBy(asc(promptPackItem.fireAt));
  return rows.slice(0, limit);
}

/**
 * A2/REQ-054: the briefing's recall lines — this household's own history at
 * this point in the year, filtered through the exclusion list before
 * rendering (the guardrail lives here, not in the component). s2: never
 * client-facing.
 */
export async function getSeasonRecall(householdId: string, limit = 5) {
  const { seasonObservation, anticipationExclusion } = await import("@wellkept/schema");
  const { selectRecall, recallExcluded, exclusionActive } = await import("@wellkept/trigger-engine");
  const now = new Date();
  const rows = await db.select().from(seasonObservation)
    .where(eq(seasonObservation.householdId, householdId));
  const exclusions = (await db.select().from(anticipationExclusion)
    .where(eq(anticipationExclusion.householdId, householdId)))
    .filter((x) => exclusionActive(x, now));
  return selectRecall(rows, now)
    .filter((r) => !recallExcluded(r.summary, exclusions))
    .slice(0, limit);
}

/** A2/REQ-055: this user's answers for a set of surfaced prompts. */
export interface PromptAnswer { outcome: string; wasNews: boolean | null; dismissReason: string | null }

export async function getPromptOutcomes(promptIds: string[], userId: string) {
  if (promptIds.length === 0) return new Map<string, PromptAnswer>();
  const { promptOutcome } = await import("@wellkept/schema");
  const { and, inArray } = await import("drizzle-orm");
  const rows = await db.select({
    promptId: promptOutcome.promptId, outcome: promptOutcome.outcome,
    wasNews: promptOutcome.wasNews, dismissReason: promptOutcome.dismissReason,
  })
    .from(promptOutcome)
    .where(and(inArray(promptOutcome.promptId, promptIds), eq(promptOutcome.userId, userId)));
  return new Map(rows.map((r) => [r.promptId, { outcome: r.outcome as string, wasNews: r.wasNews, dismissReason: r.dismissReason as string | null }]));
}

/** REQ-056: a household's exclusion rows, active first (admin surface). */
export async function getExclusions(householdId: string) {
  const { anticipationExclusion } = await import("@wellkept/schema");
  const { desc } = await import("drizzle-orm");
  return db.select().from(anticipationExclusion)
    .where(eq(anticipationExclusion.householdId, householdId))
    .orderBy(desc(anticipationExclusion.createdAt));
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
  const visible = rows.filter((r) => readDecision(role, r.sensitivity) !== "denied");
  // 0058: row-level sensitivity is not enough here. select() takes every
  // column, so the install-year ASSESSMENT would reach a client
  // unfiltered. install_date, its granularity and the serial are facts
  // about the client's own equipment and stay; derivation_source,
  // derived_year and install_confidence are OUR working notes about how
  // much we trust a decode, and the capture-pass stamps are our process
  // state. Neither is the client's record (the estimate_snapshot posture:
  // the drill-in shows the estimate and never the estimator).
  // FOUNDER RULING, 2026-08-27, confirmed and not a placeholder: keep it
  // closed. The serial and the install date are the member's equipment
  // facts and stay. Our confidence in our OWN decode is a working note.
  // A member who could resolve an uncertain date gets ASKED in Pass 3,
  // which is a question, rather than shown a card about our doubt, which
  // is not. Do not widen this without a new ruling.
  if (role !== "client") return visible;
  return visible.map((r) => ({
    ...r,
    derivationSource: null,
    derivedYear: null,
    installConfidence: null,
    photoPassAt: null,
    askPassAt: null,
  }));
}

/**
 * G-49: recent observation series per registry entry (staff surfaces
 * only — the series is s2 by nature and never reaches client views).
 * Returns newest-first per (entry, measure), capped so the drill-in stays
 * a glance: enough points to show a trend, not the full history.
 */
export async function getObjectObservations(householdId: string, perSeries = 5) {
  const { objectObservation } = await import("@wellkept/schema");
  const { desc: descOp, isNull, and: andOp } = await import("drizzle-orm");
  // W-1: superseded rows are excluded from every read a derivation or
  // display could consume — the correction IS the exclusion.
  const rows = await db.select().from(objectObservation)
    .where(andOp(eq(objectObservation.householdId, householdId), isNull(objectObservation.supersededAt)))
    .orderBy(descOp(objectObservation.observedAt));
  const bySeries = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.registryEntryId}:${r.measure}`;
    const list = bySeries.get(key) ?? [];
    if (list.length < perSeries) { list.push(r); bySeries.set(key, list); }
  }
  return bySeries;
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
  return db.select({
    id: visitPhoto.id, createdAt: visitPhoto.createdAt, uploadedBy: visitPhoto.uploadedBy,
    retentionHold: visitPhoto.retentionHold, purgedAt: visitPhoto.purgedAt, reuseAllowed: visitPhoto.reuseAllowed,
  })
    .from(visitPhoto)
    .where(eq(visitPhoto.householdId, householdId))
    .orderBy(desc(visitPhoto.createdAt))
    .limit(limit);
}

/** The incident & complaint register (LAUNCH §3): open incidents first. */
export async function getIncidents(householdId: string) {
  const { incidentReport } = await import("@wellkept/schema");
  const { desc } = await import("drizzle-orm");
  const rows = await db.select().from(incidentReport)
    .where(eq(incidentReport.householdId, householdId))
    .orderBy(desc(incidentReport.occurredAt));
  return [...rows.filter((r) => r.status === "open"), ...rows.filter((r) => r.status !== "open")];
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
