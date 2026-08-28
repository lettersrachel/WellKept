import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gte, inArray, isNull, sql as dsql } from "drizzle-orm";
import {
  household, visitCommand, timeEntry, membershipEvent, eventOutbox,
  attentionRecord, captureArtifact, incidentReport, workItem, appSetting,
  householdRoleAssignment,
} from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";
import { perHomUtilization } from "@/lib/capacity-utilization";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * WK-DEV-007 section 5: the corporate board. Internal, read-only over the
 * record and the event stream: coverage, the exception queue with age and
 * ownership, capacity against the gates in AGGREGATE, churn with cause
 * codes, and the covenant stream's live preview. Attention discipline
 * applies to the board itself: every block names its owner (role-shaped
 * proposals, founder-adjustable) and its threshold, and an unset
 * threshold says so rather than inventing one.
 *
 * Per-HOM utilization: the section 5 / Ruling 1 disagreement was
 * RESOLVED by the founder 25 Aug 2026, option (b), register A581: the
 * founder/CFO-only capacity section below is the DISPLAY SURFACE of the
 * capacity-gate evaluation, not a third purpose. The gate is enforced
 * in the permission matrix, not this UI (lib/capacity-utilization.ts
 * refuses every role but corporate_admin and cfo_readonly), the only
 * permitted sorts are route, household count, and gate proximity, and
 * no ordering-by-rate or fastest/slowest highlighting exists anywhere,
 * this section included. Role-based retrieval tests prove the refusal
 * on the function and the absence on the rendered page.
 */
export default async function CorporateBoard() {
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) redirect("/");
  // A581: null for every viewer without a founder/CFO role; the refusal
  // lives in the lib, so this page cannot widen it by mistake.
  const utilization = await perHomUtilization(db, corporate.map((a) => a.role));

  const homes = await db.select({ id: household.id, name: household.name })
    .from(household)
    .where(and(eq(household.isFixture, false), isNull(household.archivedAt)));
  const homeIds = homes.map((h) => h.id);
  const nameOf = new Map(homes.map((h) => [h.id, h.name]));
  const now = Date.now();
  const d7 = new Date(now - 7 * 86_400_000);
  const d30 = new Date(now - 30 * 86_400_000);
  const age = (t: Date) => `${Math.max(0, Math.floor((now - +t) / 86_400_000))}d`;

  // Coverage: what actually arrived (the AH posture: the server observes
  // what did not arrive, whatever the client did wrong).
  const visits = homeIds.length === 0 ? [] : await db.select({
    householdId: visitCommand.householdId, receivedAt: visitCommand.receivedAt,
  }).from(visitCommand).where(and(
    inArray(visitCommand.householdId, homeIds),
    eq(visitCommand.type, "visit.submit"), eq(visitCommand.status, "applied"),
    gte(visitCommand.receivedAt, d30),
  ));
  const lastVisit = new Map<string, Date>();
  let visits7 = 0;
  for (const v of visits) {
    if (+v.receivedAt >= +d7) visits7 += 1;
    const prev = lastVisit.get(v.householdId);
    if (!prev || +v.receivedAt > +prev) lastVisit.set(v.householdId, v.receivedAt);
  }
  const [reconKnob] = await db.select({ value: appSetting.value }).from(appSetting)
    .where(eq(appSetting.key, "visit_reconciliation"));
  const gapDays = (reconKnob?.value as { gapDays?: number } | undefined)?.gapDays ?? null;
  const missed = gapDays === null ? null : homes.filter((h) => {
    const last = lastVisit.get(h.id);
    return !last || +last < now - gapDays * 86_400_000;
  });

  // The exception queue: open noticing, unfiled captures, open incidents.
  const openAttention = homeIds.length === 0 ? [] : await db.select().from(attentionRecord)
    .where(and(inArray(attentionRecord.householdId, homeIds), eq(attentionRecord.status, "open")));
  const openCaptures = homeIds.length === 0 ? [] : await db.select().from(captureArtifact)
    .where(and(inArray(captureArtifact.householdId, homeIds), eq(captureArtifact.status, "captured")));
  const openIncidents = homeIds.length === 0 ? [] : await db.select().from(incidentReport)
    .where(and(inArray(incidentReport.householdId, homeIds), eq(incidentReport.status, "open")));
  const openWork = homeIds.length === 0 ? [] : await db.select({ n: dsql<number>`count(*)::int` }).from(workItem)
    .where(and(inArray(workItem.householdId, homeIds), inArray(workItem.status, ["open", "blocked"])));

  // Capacity, AGGREGATE ONLY (Ruling 1: never per person here).
  const [delivery] = homeIds.length === 0 ? [{ minutes: 0 }] : await db.select({
    minutes: dsql<number>`coalesce(sum(${timeEntry.minutes}), 0)::int`,
  }).from(timeEntry).where(and(
    inArray(timeEntry.householdId, homeIds),
    eq(timeEntry.category, "delivery"), gte(timeEntry.startedAt, d30),
  ));
  // The v5 intake ruling (section 3, C-06): cap=5, band=3..5, stored as
  // versioned config through db:capacity, never hard-coded here; this
  // page only reads the knob. Null stays the honest unset state.
  const [gateKnob] = await db.select({ value: appSetting.value }).from(appSetting)
    .where(eq(appSetting.key, "capacity_gate"));
  const gate = (gateKnob?.value ?? null) as import("@wellkept/schema").CapacityGateConfig | null;
  const gateSet = gate !== null && typeof gate.cap === "number";
  // The AGGREGATE evaluation the ruling's figures allow: a headcount of
  // HOM roles across active households and the fleet-wide load against
  // the band. Arithmetic on founder-stated values, never a per-person
  // figure (Ruling 1 holds; the reported section 5 conflict stands).
  const [homCount] = homeIds.length === 0 ? [{ n: 0 }] : await db.select({
    n: dsql<number>`count(distinct ${householdRoleAssignment.userId})::int`,
  }).from(householdRoleAssignment).where(and(
    inArray(householdRoleAssignment.householdId, homeIds),
    eq(householdRoleAssignment.role, "house_manager"),
  ));
  const homs = homCount?.n ?? 0;
  const load = homs > 0 ? Math.round((homes.length / homs) * 10) / 10 : null;
  // G-109 (founder ruling, 28 August 2026): THIS IS NOT THE HIRING TRIGGER.
  // The adopted hiring trigger is WK-SOP-014's, utilization above 85% for
  // four consecutive weeks, and the SOP wins. What this block computes is
  // households per HOM against the covenant-relevant cap and band: a
  // different metric, a different unit, and no time window at all, so a
  // single reading moves it where the SOP requires a month of evidence.
  //
  // Calling it the hiring gate was two measurements sharing one name, and
  // the one on screen wins by default. The strings below now say what they
  // measure. Computing the SOP's rule needs a utilization denominator this
  // system does not hold (available hours per HOM) and is its own session.
  const gateState = !gateSet ? null
    : homs === 0 ? "no HOM roles assigned; there is nothing to evaluate"
    : load! > gate!.cap! ? `OVER CAP: fleet load ${load} households per HOM exceeds the covenant-relevant cap of ${gate!.cap}`
    : load! === gate!.cap! ? `AT CAP: fleet load ${load} households per HOM sits on the cap of ${gate!.cap}`
    : load! >= gate!.bandMin! ? `WITHIN BAND: fleet load ${load} households per HOM, inside ${gate!.bandMin}..${gate!.bandMax}`
    : `BELOW BAND: fleet load ${load} households per HOM, under the band floor of ${gate!.bandMin}`;

  // Churn: household-level cause codes, never the reason text (s2 stays
  // on the membership row).
  const churn = homeIds.length === 0 ? [] : await db.select({
    householdId: membershipEvent.householdId, effectiveOn: membershipEvent.effectiveOn,
    causeCode: membershipEvent.causeCode,
  }).from(membershipEvent).where(and(
    inArray(membershipEvent.householdId, homeIds), eq(membershipEvent.kind, "cancel"),
  ));

  // The covenant stream's live preview: counts, ids only.
  const covenantKinds = ["visit.arrival", "visit.departure", "household.departure"];
  const covenant = homeIds.length === 0 ? [] : await db.select({
    kind: eventOutbox.kind, n: dsql<number>`count(*)::int`,
  }).from(eventOutbox).where(and(
    inArray(eventOutbox.householdId, homeIds), inArray(eventOutbox.kind, covenantKinds),
    gte(eventOutbox.occurredAt, d30),
  )).groupBy(eventOutbox.kind);
  const covenantCount = (k: string) => covenant.find((c) => c.kind === k)?.n ?? 0;

  const Discipline = ({ owner, threshold }: { owner: string; threshold: string }) => (
    <div className="prov">owner: {owner} (role-shaped proposal) · threshold: {threshold}</div>
  );

  return (
    <div className="wrap">
      <div className="row" style={{ alignItems: "baseline", gap: 10 }}>
        <h1 style={{ flex: 1 }}>Corporate board</h1>
        <Link className="pill" href="/oversight">Fleet board</Link>
      </div>
      <div className="note">
        WK-DEV-007 section 5: read-only, internal. Aggregate throughout,
        with one recognized exception: the founder/CFO capacity section is
        the display surface of the capacity-gate evaluation (Ruling 1 as
        amended, register A581) and renders for no other role.
      </div>

      <div className="card">
        <h2>Coverage</h2>
        <div className="fval">
          {homes.length} active household{homes.length === 1 ? "" : "s"} ·{" "}
          {visits7} applied visit{visits7 === 1 ? "" : "s"} in 7 days · {visits.length} in 30 days
        </div>
        {missed === null ? (
          <div className="prov">missing-visit marks are quiet: the visit_reconciliation knob is unset (founder-set, by design)</div>
        ) : missed.length === 0 ? (
          <div className="prov">no household exceeds the {gapDays}-day gap</div>
        ) : (
          missed.map((h) => <div key={h.id} className="prov">no visit in {gapDays}d: {h.name}</div>)
        )}
        <div className="prov">
          Upcoming visits: scheduling is Jobber (ADR-004); an upcoming column
          exists only if membershipTerms ever carries a structured cadence, a
          founder decision, not assumed.
        </div>
        <Discipline owner="the Desk (corporate_ops)" threshold={gapDays === null ? "founder-unset (the reconciliation knob)" : `${gapDays} days without an applied visit`} />
      </div>

      <div className="card">
        <h2>Exception queue</h2>
        {openAttention.length + openCaptures.length + openIncidents.length === 0 && (
          <div className="prov">Nothing waiting. Quiet is the goal, not a malfunction.</div>
        )}
        {openAttention.map((a) => (
          <div key={a.id} className="field">
            <span className="fname">{a.reason}
              <span className="prov" style={{ marginLeft: 8 }}>
                {nameOf.get(a.householdId)} · attention · {age(a.createdAt)} · {a.acknowledgedBy ? "seen" : "unseen"}
              </span>
            </span>
          </div>
        ))}
        {openCaptures.map((c) => (
          <div key={c.id} className="field">
            <span className="fname">{c.content}
              <span className="prov" style={{ marginLeft: 8 }}>
                {nameOf.get(c.householdId)} · Tell Well Kept, awaiting the router · {age(c.createdAt)}
              </span>
            </span>
          </div>
        ))}
        {openIncidents.map((i) => (
          <div key={i.id} className="field">
            <span className="fname">{i.kind} ({i.severity})
              <span className="prov" style={{ marginLeft: 8 }}>
                {nameOf.get(i.householdId)} · incident · {age(i.createdAt)}
              </span>
            </span>
          </div>
        ))}
        <div className="prov">{openWork[0]?.n ?? 0} open or blocked work item(s) tracked on the drill-ins.</div>
        <Discipline owner="the Desk (corporate_ops); incidents escalate to the founder" threshold="founder-unset (age bands are a decision, not a default)" />
      </div>

      <div className="card">
        <h2>Capacity against the gates (aggregate)</h2>
        <div className="fval">
          {Math.round((delivery?.minutes ?? 0) / 60 * 10) / 10} delivery hours across all households, trailing 30 days ·{" "}
          {homes.length} active household{homes.length === 1 ? "" : "s"}
        </div>
        <div className="prov">
          Fleet load against the covenant band: {!gateSet
            ? "BAND UNSET. The capacity_gate knob ships null and nothing evaluates until db:capacity loads the ruling's figures (the flag_promotion posture)."
            : gateState}
        </div>
        <div className="prov">
          This is not the hiring trigger. The adopted trigger is WK-SOP-014&apos;s,
          utilization above 85 percent for four consecutive weeks, and this board
          does not compute it: the figure above is households per HOM against the
          covenant cap, on a single reading with no time window. Founder ruling of
          28 August 2026 (GAP_REGISTER G-109).
        </div>
        {gateSet && (
          <div className="prov">
            Gate set: cap {gate!.cap}, band {gate!.bandMin} to {gate!.bandMax} (versioned
            config; the cap is covenant-relevant, and a cap change is a two-key
            model change before it is a config change).
          </div>
        )}
        {utilization === null ? (
          <div className="prov">
            Per-HOM figures live in the covenant report and the capacity-gate
            evaluation only (Ruling 1); this seat does not carry them.
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <div className="prov" style={{ fontWeight: 600 }}>
              Per-HOM utilization (founder/CFO seat: the capacity-gate evaluation&apos;s
              display surface, Ruling 1 as amended, A581). Sorted by household count;
              never by rate, and nothing here ranks or highlights a person.
            </div>
            {utilization.length === 0 && (
              <div className="prov">No HOM assignments to evaluate yet.</div>
            )}
            {utilization.map((u) => (
              <div key={u.name} className="fval" style={{ fontSize: 13 }}>
                {u.name} · {u.households} household{u.households === 1 ? "" : "s"} ·{" "}
                {u.deliveryHours30d} delivery hours in 30 days · {u.hoursPerHousehold} hours per household
              </div>
            ))}
          </div>
        )}
        <Discipline owner="the founder" threshold={!gateSet ? "founder-unset (capacity_gate knob)" : `cap ${gate!.cap}, band ${gate!.bandMin}..${gate!.bandMax}`} />
      </div>

      <div className="card">
        <h2>Churn, with cause</h2>
        {churn.length === 0 && <div className="prov">No departures on record.</div>}
        {churn.map((c, i) => (
          <div key={i} className="fval" style={{ fontSize: 13 }}>
            {nameOf.get(c.householdId) ?? "departed household"} · effective {c.effectiveOn} · cause: {c.causeCode ?? "recorded before the taxonomy"}
          </div>
        ))}
        <div className="prov">Household-level by construction; the reason text is s2 and stays on the membership row.</div>
        <Discipline owner="the founder" threshold="every departure is worth looking at; no numeric threshold applies" />
      </div>

      <div className="card">
        <h2>Covenant stream, live preview (trailing 30 days)</h2>
        <div className="fval">
          {covenantCount("visit.arrival")} arrival · {covenantCount("visit.departure")} departure ·{" "}
          {covenantCount("household.departure")} household departure event(s)
        </div>
        <div className="prov">
          Ids and vocabulary only, the event law holding; the monthly covenant
          report (REQ-083) is the authoritative render and joins attribution
          through time_entry, never these rows.
        </div>
        <Discipline owner="the founder and the CFO" threshold="the covenant report's own terms; this preview only shows the stream is alive" />
      </div>
    </div>
  );
}
