import { redirect } from "next/navigation";
import { filterFields } from "@wellkept/permissions";
import { getHouseholdAndPrincipal, getFields } from "@/lib/data";
import { VisitWizard } from "./VisitWizard";

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
  const { hh, principal } = await getHouseholdAndPrincipal();
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!principal) redirect("/signin");
  if (!FIELD_ROLES.has(principal.role)) redirect("/");

  const fields = filterFields(principal.role, await getFields(hh.id), {
    ndaMode: hh.isNda && !principal.ndaApproved,
  });
  const flagged = fields.filter((f) => f.flag && f.flag !== "none");
  const lifeEvent = hh.statusTag === "LIFE-EVENT";

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
        </div>
      </div>

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

      <div className="eyebrow">Close the visit</div>
      <VisitWizard householdId={hh.id} />
    </div>
  );
}
