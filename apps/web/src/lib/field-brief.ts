import { and, eq, isNull, inArray } from "drizzle-orm";
import { attentionRecord, situation } from "@wellkept/schema";
import { db } from "./db";
import { filterFields } from "@wellkept/permissions";
import { bindProvisions } from "@wellkept/schema";
import { getFields, getOpenDots, getUpcomingPackItems, getDeltasSince, getSeasonRecall, getOpenConditionFlags, getDeferrals, getPausedDecisions } from "./data";
import { provisionsById, standardsSeedReviewed } from "./standards";
import { latestAppliedVisit } from "./visit-command-store";
import { recordBriefSnapshot } from "./brief-snapshot";

/**
 * The Cockpit unification pass, step 1 (WK-DEV-007 section 2; the item
 * queued in the 0045 entry): ONE composer for the pre-visit brief, so
 * the mobile briefing route and the web /visit page tell the same story
 * from the same code, and the section 2.1 snapshot evidences BOTH.
 * Moved verbatim from the mobile briefing route; the route now calls
 * this. Per-open noise never enters the snapshot table by construction:
 * the payload contains only record-derived content (no volatile
 * timestamps of its own), so an unchanged record composes to the same
 * content hash and recordBriefSnapshot dedupes it.
 */
export type FieldPrincipal = { userId: string; role: string; ndaApproved: boolean };
type Household = { id: string; name: string; tier: string; statusTag: string | null; isNda: boolean };

export async function composeFieldBrief(
  hh: Household,
  principal: FieldPrincipal,
  opts: { strangerRequested?: boolean } = {},
) {
  const [allFields, dots, packItems, lastVisit, seedReviewed, recall, openConditionFlags] = await Promise.all([
    getFields(hh.id),
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id),
    latestAppliedVisit(hh.id),
    standardsSeedReviewed(),
    getSeasonRecall(hh.id), // A2/REQ-054: exclusion-filtered in the reader
    getOpenConditionFlags(hh.id), // W-5: re-observed at every visit
  ]);
  // Stranger-mode ruling (c): the projection narrows SERVER-SIDE, so the
  // hidden data never reaches the device. backup_hm is always the stranger
  // projection (a covering stranger IS the stranger); a HOM can request it
  // (the one-gesture toggle) before handing the phone over.
  const strangerMode = principal.role === "backup_hm" || opts.strangerRequested === true;
  const fields = filterFields(principal.role, allFields, { ndaMode: hh.isNda && !principal.ndaApproved, strangerMode });
  const lifeEvent = hh.statusTag === "LIFE-EVENT";

  // Addendum A1 T4: bound provisions ride the briefing payload, so the
  // AsyncStorage cache keeps them readable offline (the airplane test).
  const provisionsFor = (f: Record<string, unknown>) =>
    bindProvisions(f["governingProvisions"] as string[] | null, provisionsById(), "hm", seedReviewed);

  const flags = fields
    .filter((f) => f.flag && f.flag !== "none")
    .map((f) => ({
      name: String(f.name), flag: String(f.flag), value: f.value ? String(f.value) : null,
      provisions: provisionsFor(f),
    }));

  const visibleIds = new Set(fields.map((f) => String(f.id)));
  const fieldById = new Map(fields.map((f) => [String(f.id), f]));
  const deltasRaw = await getDeltasSince(hh.id, lastVisit ? lastVisit.receivedAt : null);
  const changed = deltasRaw
    .filter((d) => visibleIds.has(d.id) && d.value)
    .slice(-6)
    .map((d) => ({
      name: d.name.split(":")[0], value: String(d.value).slice(0, 200), updatedAt: d.updatedAt, provenance: d.provenance,
      provisions: provisionsFor(fieldById.get(d.id) ?? {}),
    }));

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const radarAll = lifeEvent ? [] : packItems.filter((i) => !i.suppressedByTag);
  const specials = radarAll.filter((i) => i.fireAt <= endOfToday).map((i) => ({ text: i.itemText, packName: i.packName }));
  const radar = radarAll.filter((i) => i.fireAt > endOfToday).map((i) => ({ text: i.itemText, packName: i.packName, fireAt: i.fireAt }));

  const openDots = dots.map((d) => ({ verbatim: d.verbatim, heardAt: d.heardAt }));

  // A2/REQ-054: recall lines — fact, not prompts; sits after the radar and
  // before dots on every briefing surface. s2 (HM/corporate only; every
  // caller of this composer is already field-role gated).
  const lastYear = recall.map((r) => ({ summary: r.summary, anchorKind: r.anchorKind, observedAt: r.observedAt }));

  // AB/AD: overdue deferrals surface to the HM; the person decides.
  const allDeferrals = await getDeferrals(hh.id);
  const todayIso = new Date().toISOString().slice(0, 10);
  const overdueDeferrals = allDeferrals
    .filter((d) => !d.resolvedAt && d.revisitDate && d.revisitDate < todayIso)
    .map((d) => ({ id: d.id, noticed: d.noticed, reason: d.reason, plannedFor: d.revisitDate }));

  // AD (W-7): a paused decision whose timing has arrived surfaces the
  // same way - shown, never acted on automatically. Internal entity;
  // every caller is staff-gated, and the client routes never carry it.
  const allPaused = await getPausedDecisions(hh.id);
  const overduePausedDecisions = allPaused
    .filter((p) => !p.resolvedAt && p.revisitDate && p.revisitDate < todayIso)
    .map((p) => ({ id: p.id, decision: p.decision, research: p.research, plannedFor: p.revisitDate }));

  // W-5: open condition flags, promotion candidates first (they rise;
  // they never create prompts). `flags` above remains the FIELD flags -
  // distinct entity, distinct key, per the K naming survey.
  const conditionFlags = openConditionFlags.map((f) => ({
    id: f.id, subject: f.subject, location: f.location, concern: f.concern,
    revisit: f.revisitDate ?? f.revisitCondition,
    looks: f.looks.map((l) => l.value),
    promotionCandidate: f.promotionCandidate,
  }));

  // WK-DEV-009 s6: the firewall's previsit_brief destination delivers
  // HERE, and nowhere interrupts. Open hom-audience records routed to
  // the brief ride the payload (and therefore the s2.1 snapshot, so
  // delivery is evidenced); the caller stamps deliveredVia once.
  const noticing = await db.select().from(attentionRecord).where(and(
    eq(attentionRecord.householdId, hh.id), eq(attentionRecord.status, "open"),
    eq(attentionRecord.audience, "hom"), eq(attentionRecord.destination, "previsit_brief"),
  ));
  const toBriefShape = (a: (typeof noticing)[number]) => ({
    id: a.id, reason: a.reason, sourceKind: a.sourceKind, deadline: a.deadline,
    seen: a.acknowledgedAt !== null,
  });
  // WK-DEV-009 s10 (0056): bundled records deliver as ONE situation
  // carrying its members ("one winter-storm situation, not five
  // notifications"); unbundled records stay individual. Delivery
  // stamping below covers both, so bundling never un-evidences delivery.
  const bundledIds = [...new Set(noticing.map((a) => a.situationId).filter((s): s is string => s !== null))];
  const situationRows = bundledIds.length > 0
    ? await db.select().from(situation).where(inArray(situation.id, bundledIds))
    : [];
  const situations = situationRows.map((s) => ({
    id: s.id, label: s.label,
    records: noticing.filter((a) => a.situationId === s.id).map(toBriefShape),
  }));
  const needsNoticing = noticing.filter((a) => a.situationId === null).map(toBriefShape);
  const undeliveredAttentionIds = noticing.filter((a) => a.deliveredVia === null).map((a) => a.id);

  const payload = {
    household: { name: hh.name, tier: hh.tier, lifeEvent, stranger: strangerMode },
    situations,
    needsNoticing,
    flags,
    conditionFlags,
    overdueDeferrals,
    overduePausedDecisions,
    changed,
    specials,
    radar,
    lastYear,
    dots: openDots,
  };
  return { payload, undeliveredAttentionIds, strangerMode };
}

/**
 * WK-DEV-009 s2.1 + s6, the delivery half: persist the brief as
 * composed (deduped by content) and stamp the delivered attention
 * records once. Both surfaces stamp `briefing`: deliveredVia names the
 * CHANNEL (the pre-visit brief), which is the same channel on the
 * phone and on the web field page.
 */
export async function recordAndDeliverBrief(
  hh: { id: string },
  principal: FieldPrincipal,
  composed: Awaited<ReturnType<typeof composeFieldBrief>>,
) {
  await recordBriefSnapshot({
    householdId: hh.id, briefedUser: principal.userId, role: principal.role,
    strangerMode: composed.strangerMode, payload: composed.payload,
  });
  if (composed.undeliveredAttentionIds.length > 0) {
    await db.update(attentionRecord).set({ deliveredVia: "briefing", updatedAt: new Date() })
      .where(and(inArray(attentionRecord.id, composed.undeliveredAttentionIds), isNull(attentionRecord.deliveredVia)));
  }
}
