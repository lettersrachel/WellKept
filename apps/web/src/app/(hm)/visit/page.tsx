import { redirect } from "next/navigation";
import { filterFields } from "@wellkept/permissions";
import { getFieldHouseholdAndPrincipal, getFields, getOpenDots, getUpcomingPackItems, getDeltasSince } from "@/lib/data";
import { latestAppliedVisit } from "@/lib/visit-command-store";
import { logStrangerTest } from "@/lib/actions";
import { VisitWizard } from "./VisitWizard";
import { VisitAlerts } from "./VisitAlerts";

export const dynamic = "force-dynamic";

const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);

/**
 * The HM surface (REQ-030/031), mobile-web per the verified foundation-repo
 * pattern: briefing (flags first, LIFE-EVENT suppression) + the close-flow
 * wizard with offline queue. The Expo app remains the sprint 3-5 native
 * deliverable; it will reuse @wellkept/close-flow and @wellkept/offline-queue
 * unchanged.
 */
export default async function VisitPage() {
  const { hh, principal } = await getFieldHouseholdAndPrincipal();
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!principal) redirect("/signin");
  if (!FIELD_ROLES.has(principal.role)) redirect("/");

  const [allFields, dots, packItems, lastVisit] = await Promise.all([
    getFields(hh.id),
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id),
    latestAppliedVisit(hh.id),
  ]);
  const fields = filterFields(principal.role, allFields, {
    ndaMode: hh.isNda && !principal.ndaApproved,
  });
  const flagged = fields.filter((f) => f.flag && f.flag !== "none");
  const lifeEvent = hh.statusTag === "LIFE-EVENT";
  const stranger = principal.role === "backup_hm"; // REQ-033: amplified first-visit mode
  const radarAll = packItems.filter((i) => !i.suppressedByTag);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const specials = radarAll.filter((i) => i.fireAt <= endOfToday);
  const radar = radarAll.filter((i) => i.fireAt > endOfToday);
  const deltasRaw = await getDeltasSince(hh.id, lastVisit ? lastVisit.receivedAt : null);
  const visibleIds = new Set(fields.map((f) => String(f.id)));
  const deltas = deltasRaw.filter((d) => visibleIds.has(d.id) && d.value).slice(-6);
  // First-visit essentials for stranger mode: flags plus captured
  // pets/property/access content — what a stranger needs to not fumble.
  const essentials = stranger
    ? fields.filter((f) => [4, 6, 7].includes(f.section as number) && f.value).slice(0, 8)
    : [];
  const fmtDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card" style={{ background: "var(--green)", color: "#fff" }}>
        <div className="sans" style={{ fontSize: 11, color: "var(--sage)", letterSpacing: "0.1em" }}>
          BRIEFING FROM THE LIVE RECORD.
        </div>
        <div style={{ fontSize: 22, marginTop: 4 }}>{hh.name}</div>
        <div className="sans" style={{ fontSize: 12, color: "var(--sage)", marginTop: 2 }}>
          {hh.tier}
          {lifeEvent && <span style={{ color: "var(--gold)", fontWeight: 700 }}> | LIFE-EVENT set by corporate</span>}
          {stranger && <span style={{ color: "var(--gold)", fontWeight: 700 }}> | STRANGER MODE — first-visit runbook</span>}
        </div>
      </div>

      {stranger && (
        <>
          <div className="eyebrow">First-visit essentials (pets · property · access)</div>
          <div className="card">
            {essentials.length === 0 ? (
              <div className="note">Nothing captured yet in the access/property sections.</div>
            ) : (
              essentials.map((f) => (
                <div key={String(f.id)} className="field">
                  <span className="fname">{String(f.name).split(":")[0]}</span>
                  <div className="fval">{String(f.value)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <VisitAlerts />

      <div className="eyebrow">Flags first</div>
      {flagged.length === 0 ? (
        <div className="note">No flagged fields on this record yet.</div>
      ) : (
        flagged.map((f) => (
          <div key={String(f.id)} className={`card field ${String(f.flag)}`}>
            <span className="fname">
              {f.name}
              <span className={`tag ${String(f.flag)}`}>{String(f.flag)}</span>
            </span>
            {f.value ? <div className="fval">{String(f.value)}</div> : null}
          </div>
        ))
      )}

      <div className="eyebrow">Changed since last visit</div>
      {deltas.length === 0 ? (
        <div className="note">No field changes since the last visit report.</div>
      ) : (
        <div className="card">
          {deltas.map((d) => (
            <div key={d.id} className="field">
              <span className="fname">{d.name.split(":")[0]}</span>
              <div className="fval sans" style={{ fontSize: 13 }}>{d.value.slice(0, 110)}{d.value.length > 110 ? "…" : ""}</div>
              <div className="prov">updated {fmtDay(d.updatedAt)} · {d.provenance}</div>
            </div>
          ))}
        </div>
      )}

      <div className="eyebrow">Today&apos;s specials</div>
      {lifeEvent ? (
        <div className="note">Held with the rest of the prompts (LIFE-EVENT).</div>
      ) : specials.length === 0 ? (
        <div className="note">Nothing due today.</div>
      ) : (
        specials.map((i) => (
          <div key={i.id} className="card" style={{ background: "var(--sage)", marginBottom: 8 }}>
            <div style={{ fontSize: 15, color: "var(--green)" }}>{i.itemText}</div>
            <div className="prov">{i.packName} · due today</div>
          </div>
        ))
      )}

      <div className="eyebrow">Coming up — the anticipation engine</div>
      {lifeEvent ? (
        <div className="card" style={{ border: "1px dashed var(--grey)", background: "var(--cream)" }}>
          <div className="note">Held. LIFE-EVENT pauses every prompt; nothing is deleted.</div>
        </div>
      ) : radar.length === 0 ? (
        <div className="note">Nothing scheduled in the window.</div>
      ) : (
        radar.map((i) => (
          <div key={i.id} className="card" style={{ background: "#F3EAD2", marginBottom: 8 }}>
            <div style={{ fontSize: 15, color: "var(--green)" }}>{i.itemText}</div>
            <div className="prov">
              {i.packName} · fires {fmtDay(i.fireAt)}
            </div>
          </div>
        ))
      )}

      <div className="eyebrow">Open dots</div>
      {dots.length === 0 ? (
        <div className="note">No open dots.</div>
      ) : (
        <div className="card">
          {dots.map((d) => (
            <div key={d.id} className="field">
              <span className="fval" style={{ fontStyle: "italic" }}>&ldquo;{d.verbatim}&rdquo;</span>
              <div className="prov">heard {fmtDay(d.heardAt)} · never client-visible</div>
            </div>
          ))}
        </div>
      )}

      <div className="eyebrow">Proposal window</div>
      {lifeEvent ? (
        <div className="card" style={{ border: "1px dashed var(--grey)", background: "var(--cream)" }}>
          <div className="note">
            Suppressed. LIFE-EVENT is set for this household, so no proposal appears anywhere in
            the app. Care continues; asks stop.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="fval sans" style={{ fontSize: 14 }}>
            Proposals follow this household&apos;s protocol: raise once, warmly, in person, never
            in the report.
          </div>
        </div>
      )}

      {stranger && (
        <>
          <div className="eyebrow">Stranger test (REQ-033)</div>
          <div className="card">
            <div className="note">
              You are the test: could a competent stranger run this visit from the record alone?
              Friction notes route to the primary HM and log as a Stranger Test record.
            </div>
            <form action={logStrangerTest}>
              <input type="hidden" name="householdId" value={hh.id} />
              <label>Friction noticed (one per line; blank only if it truly ran clean)</label>
              <textarea name="frictionNotes" rows={3} placeholder="e.g. Could not find the mudroom bin key from the record alone" />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="act" name="passed" value="yes">Ran clean — PASS</button>
                <button className="act danger" name="passed" value="no">Friction found — log it</button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="eyebrow">Close the visit</div>
      <VisitWizard householdId={hh.id} />
    </div>
  );
}
