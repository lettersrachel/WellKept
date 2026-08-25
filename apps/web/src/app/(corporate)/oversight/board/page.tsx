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
 * DELIBERATELY ABSENT: per-HOM utilization. WK-DEV-007 section 5 places
 * it here for founder/CFO roles, but CLAUDE.md's Ruling 1 (the
 * founder-approved boundary amendment) names exactly two surfaces for
 * capacity measurement (the covenant report and the capacity-gate
 * evaluation) and expressly bars "any appearance on operational
 * dashboards". Two founder-adopted documents disagree; per the standing
 * doctrine the disagreement is REPORTED (work queue, 25 Aug 2026), not
 * reconciled here, and the stricter reading holds until the founder
 * rules. The section 5 role-based retrieval test lands with whichever
 * resolution she picks; today the provable property is that NO route
 * serves per-HOM utilization at all.
 */
export default async function CorporateBoard() {
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) redirect("/");

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
  const gateState = !gateSet ? null
    : homs === 0 ? "no HOM roles assigned; the gate has nothing to evaluate"
    : load! > gate!.cap! ? `OVER CAP: fleet load ${load} exceeds the covenant-relevant cap of ${gate!.cap}; the hiring gate is tripped`
    : load! === gate!.cap! ? `AT CAP: fleet load ${load} sits on the cap of ${gate!.cap}`
    : load! >= gate!.bandMin! ? `WITHIN BAND: fleet load ${load} inside ${gate!.bandMin}..${gate!.bandMax}`
    : `BELOW BAND: fleet load ${load} under the band floor of ${gate!.bandMin}`;

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
        WK-DEV-007 section 5: read-only, aggregate, internal. Per-HOM
        utilization is deliberately absent pending the founder&apos;s ruling on
        the section 5 / Ruling 1 disagreement (see the work queue, 25 Aug).
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
          Hiring-trigger state: {!gateSet
            ? "GATE UNSET. The capacity_gate knob ships null and nothing triggers until db:capacity loads the ruling's figures (the flag_promotion posture)."
            : gateState}
        </div>
        {gateSet && (
          <div className="prov">
            Gate set: cap {gate!.cap}, band {gate!.bandMin} to {gate!.bandMax} (versioned
            config; the cap is covenant-relevant, and a cap change is a two-key
            model change before it is a config change).
          </div>
        )}
        <div className="prov">
          Aggregate by construction: per-HOM figures live in the covenant
          report and the capacity-gate evaluation only (Ruling 1).
        </div>
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
