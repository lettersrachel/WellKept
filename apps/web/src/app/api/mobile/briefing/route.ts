import { NextRequest, NextResponse } from "next/server";
import { filterFields } from "@wellkept/permissions";
import { bindProvisions } from "@wellkept/schema";
import { getHouseholdAndPrincipalById, getFields, getOpenDots, getUpcomingPackItems, getDeltasSince, getSeasonRecall, getOpenConditionFlags, getDeferrals } from "@/lib/data";
import { provisionsById, standardsSeedReviewed } from "@/lib/standards";
import { latestAppliedVisit } from "@/lib/visit-command-store";
import { staffMfaCleared } from "@/lib/totp";

const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);

/**
 * The pre-visit briefing for the native app — the same "brief from the live
 * record" the web /visit page shows, as JSON: flags first, what changed since
 * the last visit, what's due today, the anticipation radar, and open dots.
 * Role-filtered by the permission core and gated by the staff second factor,
 * exactly like every other field surface. LIFE-EVENT holds the prompts.
 */
export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId") ?? "";
  if (!householdId) return NextResponse.json({ error: "missing householdId" }, { status: 400 });

  const { hh, principal } = await getHouseholdAndPrincipalById(householdId);
  if (!hh || !principal || !FIELD_ROLES.has(principal.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  const [allFields, dots, packItems, lastVisit, seedReviewed, recall, openConditionFlags] = await Promise.all([
    getFields(hh.id),
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id),
    latestAppliedVisit(hh.id),
    standardsSeedReviewed(),
    getSeasonRecall(hh.id), // A2/REQ-054: exclusion-filtered in the reader
    getOpenConditionFlags(hh.id), // W-5: re-observed at every visit
  ]);
  const fields = filterFields(principal.role, allFields, { ndaMode: hh.isNda && !principal.ndaApproved });
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
  // before dots on every briefing surface. s2 (HM/corporate only; this route
  // is already field-role gated).
  const lastYear = recall.map((r) => ({ summary: r.summary, anchorKind: r.anchorKind, observedAt: r.observedAt }));

  // W-5: open condition flags, promotion candidates first (they rise;
  // they never create prompts). `flags` below remains the FIELD flags -
  // distinct entity, distinct key, per the K naming survey.
  // AB/AD: overdue deferrals surface to the HM; the person decides.
  const allDeferrals = await getDeferrals(hh.id);
  const todayIso = new Date().toISOString().slice(0, 10);
  const overdueDeferrals = allDeferrals
    .filter((d) => !d.resolvedAt && d.revisitDate && d.revisitDate < todayIso)
    .map((d) => ({ id: d.id, noticed: d.noticed, reason: d.reason, plannedFor: d.revisitDate }));

  const conditionFlags = openConditionFlags.map((f) => ({
    id: f.id, subject: f.subject, location: f.location, concern: f.concern,
    revisit: f.revisitDate ?? f.revisitCondition,
    looks: f.looks.map((l) => l.value),
    promotionCandidate: f.promotionCandidate,
  }));

  return NextResponse.json({
    household: { name: hh.name, tier: hh.tier, lifeEvent, stranger: principal.role === "backup_hm" },
    flags,
    conditionFlags,
    overdueDeferrals,
    changed,
    specials,
    radar,
    lastYear,
    dots: openDots,
  });
}
