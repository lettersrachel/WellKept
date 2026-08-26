import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { registryEntry, conditionFlag, objectObservation } from "@wellkept/schema";
import { readDecision } from "@wellkept/permissions";
import { getPrincipal } from "@/lib/session";
import { db } from "@/lib/db";
import { tellWellKept } from "@/lib/actions";
import { RefusalBanner } from "@/components/RefusalBanner";
import { RecordedBanner } from "@/components/RecordedBanner";

export const dynamic = "force-dynamic";

/**
 * WK-DEV-009 section 3.3: contextual entry. Scanning an asset's code (or
 * following its link) opens the OPERATIONAL CONTEXT, not a label page:
 * the entry's facts, its maintenance clocks computed from facts that
 * only change when the world does (the G-49 posture: key_date wins where
 * set), its open condition flags, its observation series, and a Tell
 * Well Kept box already resolved to the asset, so saying something about
 * it is one gesture from the scan. Staff surface: tenant-checked through
 * the principal's own assignment, sensitivity-checked through the
 * permission core, behind the staff second factor like every (hm) route.
 * The physical QR half is a founder printing step against the scan
 * sheet's URLs (no new dependency under the pinned stack); warranty,
 * consumables, and the governing standard join when their facts exist
 * on the entry, named below rather than faked.
 */
export default async function AssetContext({ params, searchParams }: {
  params: Promise<{ registryEntryId: string }>;
  searchParams: Promise<{ refused?: string; recorded?: string }>;
}) {
  const { registryEntryId } = await params;
  const { refused, recorded } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(registryEntryId)) redirect("/visit");
  const [entry] = await db.select().from(registryEntry).where(eq(registryEntry.id, registryEntryId));
  if (!entry || entry.tombstonedAt) redirect("/visit");
  const principal = await getPrincipal(entry.householdId);
  if (!principal) redirect("/signin");
  if (readDecision(principal.role, entry.sensitivity) === "denied") redirect("/visit");

  const flags = await db.select().from(conditionFlag).where(and(
    eq(conditionFlag.registryEntryId, entry.id), eq(conditionFlag.status, "open")));
  const series = await db.select().from(objectObservation).where(and(
    eq(objectObservation.registryEntryId, entry.id), isNull(objectObservation.supersededAt)))
    .orderBy(desc(objectObservation.observedAt)).limit(10);

  const addMonths = (d: Date, m: number) => new Date(new Date(d).setMonth(d.getMonth() + m));
  const nextMaintenance = entry.keyDate
    ? new Date(entry.keyDate)
    : entry.maintenanceIntervalMonths && (entry.lastServicedAt ?? entry.installedAt)
      ? addMonths(new Date(entry.lastServicedAt ?? entry.installedAt!), entry.maintenanceIntervalMonths)
      : null;
  const replacementHorizon = entry.installedAt && entry.lifespanMonths
    ? addMonths(new Date(entry.installedAt), entry.lifespanMonths) : null;
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  return (
    <div className="wrap">
      <RefusalBanner reason={refused} />
      <RecordedBanner what={recorded} />
      <div className="card">
        <div className="eyebrow">SCANNED CONTEXT · WK-DEV-009 §3.3</div>
        <h2>{entry.label}</h2>
        <div className="prov">{entry.kind}{entry.cadence ? ` · ${entry.cadence}` : ""}</div>
        {Object.entries((entry.detail ?? {}) as Record<string, unknown>)
          .filter(([k]) => k !== "fixtureOrigin")
          .map(([k, v]) => (
            <div key={k} className="fval" style={{ fontSize: 13 }}>{k}: {String(v)}</div>
          ))}
        <div className="fval" style={{ fontSize: 13, marginTop: 6 }}>
          {entry.installedAt && <div>Installed: {day(entry.installedAt)}</div>}
          {entry.lastServicedAt && <div>Last serviced: {day(entry.lastServicedAt)}</div>}
          {nextMaintenance && <div>Next maintenance: {day(nextMaintenance)}{entry.keyDate ? " (key date, wins where set)" : " (computed from service facts)"}</div>}
          {replacementHorizon && <div>Replacement horizon: {day(replacementHorizon)} (installed plus lifespan)</div>}
          {!nextMaintenance && !replacementHorizon && <div>No maintenance clock: the entry carries no interval, lifespan, or key date yet.</div>}
        </div>
        <div className="prov">
          Warranty, consumables, preferred vendor, and the governing standard
          join this context when those facts exist on the entry; nothing here
          is invented to fill the section 3.3 list.
        </div>
      </div>

      <div className="card">
        <h2>Open history on this object</h2>
        {flags.length === 0 && series.length === 0 && (
          <div className="prov">No open flags and no observation series. Quiet is a valid state.</div>
        )}
        {flags.map((f) => (
          <div key={f.id} className="field">
            <span className="fname">{f.subject}
              <span className="prov" style={{ marginLeft: 8 }}>
                open flag · {f.location} · revisit {f.revisitDate ?? f.revisitCondition}
              </span>
            </span>
          </div>
        ))}
        {series.length > 0 && (
          <div className="prov" style={{ marginTop: 6 }}>
            Series (latest first): {series.map((o) => `${o.value}/5 on ${o.observedAt.toISOString().slice(0, 10)}`).join(" · ")}
          </div>
        )}
        <div className="prov">
          Open work items link here when assets gain a work reference (WL
          Gate 1&apos;s territory); until then the visit page carries them.
        </div>
      </div>

      <div className="card">
        <h2>Tell Well Kept, from here</h2>
        <div className="note">
          Already resolved to {entry.label}; say it once and the router files it.
        </div>
        <form action={tellWellKept}>
          <input type="hidden" name="householdId" value={entry.householdId} />
          <input type="hidden" name="returnTo" value={`/context/${entry.id}`} />
          <input name="content" aria-label="Tell Well Kept about this object" defaultValue={`${entry.label}: `} />
          <p><button className="act">Tell Well Kept</button></p>
        </form>
        <p><Link className="pill" href="/visit">Back to the visit page</Link></p>
      </div>
    </div>
  );
}
