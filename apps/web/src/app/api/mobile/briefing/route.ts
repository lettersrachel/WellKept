import { NextRequest, NextResponse } from "next/server";
import { filterFields } from "@wellkept/permissions";
import { bindProvisions } from "@wellkept/schema";
import { getHouseholdAndPrincipalById, getFields, getOpenDots, getUpcomingPackItems, getDeltasSince } from "@/lib/data";
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

  const [allFields, dots, packItems, lastVisit, seedReviewed] = await Promise.all([
    getFields(hh.id),
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id),
    latestAppliedVisit(hh.id),
    standardsSeedReviewed(),
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

  return NextResponse.json({
    household: { name: hh.name, tier: hh.tier, lifeEvent, stranger: principal.role === "backup_hm" },
    flags,
    changed,
    specials,
    radar,
    dots: openDots,
  });
}
