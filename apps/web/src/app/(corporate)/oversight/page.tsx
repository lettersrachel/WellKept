import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, isNull, gte } from "drizzle-orm";
import { playbookField, visitCommand, strangerTest, promptPackItem, clientEdit, incidentReport, timeEntry } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { createCompanyTimeEntry } from "@/lib/actions";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";
import { RefusalBanner } from "@/components/RefusalBanner";
import { RecordedBanner } from "@/components/RecordedBanner";

export const dynamic = "force-dynamic";
// Headroom over Vercel's ~10s default (2026-07-27, see drill-in note): a slow
// dependency must degrade the page, not silently truncate it mid-stream.
export const maxDuration = 60;

/**
 * REQ-043: the fleet board. One row per household the signed-in corporate
 * user is explicitly assigned to (REQ-001: no wildcard grants) with status
 * tag, Playbook health, Stranger Test recency, and visit counts.
 */
export default async function FleetBoard({ searchParams }: {
  // G-55: the fleet board is a refusal TARGET and was rendering nothing.
  // Every `refuse(null, ...)` in the action layer lands here - the
  // bad-input and missing classes, 25 call sites - so an action that
  // declined because its form named no record, or named one that does not
  // exist, brought the operator here in silence. A click, a navigation, no
  // message: the exact shape of a false success. G-29 made refusal visible
  // on three surfaces and missed the fourth.
  searchParams: Promise<{ refused?: string; recorded?: string }>;
}) {
  const { refused, recorded } = await searchParams;
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) redirect("/");

  // AH (sync-defect sessions): the reconciliation floor's knob. Nothing
  // surfaces while gapDays is null (shipped default; founder sets it).
  // The check observes the server's own record, the one signal a broken
  // client cannot fake: a stuck queue, a lost device, an evicted browser
  // store all look identical from here, and all deserve a question.
  const { appSetting } = await import("@wellkept/schema");
  const [reconKnob] = await db.select({ value: appSetting.value }).from(appSetting)
    .where(eq(appSetting.key, "visit_reconciliation"));
  const gapDaysKnob = (reconKnob?.value as { gapDays?: number | null } | undefined)?.gapDays ?? null;

  // G-111: the null-household paid-time rows, aggregated by CATEGORY for
  // the company-time read-back. Never grouped or filtered by person here;
  // the row holds its person for the wage record, the display does not.
  const companyRows = await db
    .select({ category: timeEntry.category, minutes: timeEntry.minutes })
    .from(timeEntry)
    .where(and(isNull(timeEntry.householdId), gte(timeEntry.startedAt, new Date(Date.now() - 30 * 86_400_000))));
  const companyByCat = new Map<string, number>();
  for (const t of companyRows) companyByCat.set(t.category, (companyByCat.get(t.category) ?? 0) + t.minutes);
  const companyTime = Array.from(companyByCat, ([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const rowsAll = await Promise.all(
    corporate.map(async ({ hh }) => {
      const [fields, commands, tests, pending, held, openIncidents] = await Promise.all([
        db.select({ confirmed: playbookField.confirmed, sensitivity: playbookField.sensitivity })
          .from(playbookField).where(eq(playbookField.householdId, hh.id)),
        db.select({ type: visitCommand.type, status: visitCommand.status, receivedAt: visitCommand.receivedAt })
          .from(visitCommand).where(eq(visitCommand.householdId, hh.id)),
        db.select().from(strangerTest).where(eq(strangerTest.householdId, hh.id)),
        db.select({ id: clientEdit.id }).from(clientEdit)
          .where(and(eq(clientEdit.householdId, hh.id), eq(clientEdit.status, "pending"))),
        db.select({ id: promptPackItem.id }).from(promptPackItem)
          .where(and(eq(promptPackItem.householdId, hh.id), isNull(promptPackItem.firedAt))),
        db.select({ id: incidentReport.id }).from(incidentReport)
          .where(and(eq(incidentReport.householdId, hh.id), eq(incidentReport.status, "open"))),
      ]);
      const lastTest = tests[tests.length - 1];
      // AH: the gap counts from the last applied visit, or the household's
      // creation when none ever applied (the first-visit-never case).
      const applied = commands.filter((c) => c.type === "visit.submit" && c.status === "applied");
      const lastAppliedAt = applied.reduce<Date | null>(
        (max, c) => (max === null || +c.receivedAt > +max ? c.receivedAt : max), null);
      const visitGapDays = Math.floor((Date.now() - +(lastAppliedAt ?? hh.createdAt)) / 86_400_000);
      return {
        hh,
        confirmed: fields.filter((f) => f.confirmed).length,
        total: fields.length,
        visits: applied.length,
        conflicts: commands.filter((c) => c.status === "conflict").length,
        visitGapDays,
        missingVisit: gapDaysKnob !== null && visitGapDays > gapDaysKnob,
        stranger: lastTest
          ? `${lastTest.passed ? "PASS" : "FRICTION"} ${lastTest.createdAt.toISOString().slice(5, 10)}`
          : "never",
        pendingEdits: pending.length,
        scheduled: held.length,
        openIncidents: openIncidents.length,
      };
    }),
  );

  // The smoke fixture is not a client (G-23/phase 3): out of the count, out
  // of the roll-up rows, rendered last and visibly marked so its permanent
  // red states never train the eye to ignore red.
  const rows = rowsAll.filter((r) => !r.hh.isFixture);
  const fixtures = rowsAll.filter((r) => r.hh.isFixture);

  return (
    <>
      <RefusalBanner reason={refused} />
      <RecordedBanner what={recorded} />
      <div className="card">
        <div className="row">
          <h2 style={{ border: "none", margin: 0, padding: 0 }}>Fleet; {rows.length} household(s)</h2>
          <Link className="pill" href="/oversight/economics">Economics</Link>
          <Link className="pill" href="/oversight/triggers">Triggers</Link>
          <Link className="pill" href="/standards">Standards library</Link>
          <Link className="pill" href="/oversight/board">Corporate board</Link>
          <Link className="pill" href="/oversight/tasks">Task definitions</Link>
          <a className="pill" href="/api/exhibits/fleet">Export exhibit CSV</a>
        </div>
        <table className="panel" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Household</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Playbook health</th>
              <th>Visits</th>
              <th>Stranger Test</th>
              <th>Queues</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.hh.id}>
                <td>
                  <Link href={`/oversight/${r.hh.id}`} style={{ color: "var(--green)", fontWeight: "bold" }}>
                    {r.hh.name}
                  </Link>
                </td>
                <td>{r.hh.tier}</td>
                <td>
                  <span className={`tag ${r.hh.statusTag === "LIFE-EVENT" ? "CRITICAL" : r.hh.statusTag === "CHAMPION" ? "DELIGHT" : "s2"}`}>
                    {r.hh.statusTag}
                  </span>
                </td>
                <td>{r.confirmed}/{r.total} confirmed</td>
                <td>
                  {r.visits} applied{r.conflicts ? ` · ${r.conflicts} conflict` : ""}
                  {/* AH: the record not holding a recent visit is exactly
                      what a stuck client cannot report about itself. */}
                  {r.missingVisit && (
                    <>
                      {" · "}
                      <span className="tag CRITICAL">no visit in {r.visitGapDays}d</span>
                    </>
                  )}
                </td>
                <td>{r.stranger}</td>
                <td>
                  {r.pendingEdits} edits · {r.scheduled} prompts
                  {/* An open incident is never invisible (LAUNCH §3). */}
                  {r.openIncidents > 0 && (
                    <>
                      {" · "}
                      <span className="tag CRITICAL">{r.openIncidents} open incident{r.openIncidents > 1 ? "s" : ""}</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fixtures.length > 0 && (
          <div style={{ marginTop: 10, opacity: 0.65 }}>
            {fixtures.map((r) => (
              <div key={r.hh.id} className="prov">
                <span className="tag s2">FIXTURE; not a client</span>{" "}
                <Link href={`/oversight/${r.hh.id}`} style={{ color: "var(--grey)" }}>{r.hh.name}</Link>
                {" · "}deploy-checklist target; excluded from counts, economics, and the digest
                {r.openIncidents > 0 && ` · ${r.openIncidents} open (checklist 13b resolves it)`}
              </div>
            ))}
          </div>
        )}
        <div className="note" style={{ marginTop: 8 }}>
          Rows are the households you hold an explicit assignment for; there is no
          fleet-wide wildcard (REQ-001).
        </div>
      </div>

      {/* G-111's producer, corporate half: non-household paid time (0059's
          null-household shape). The read-back aggregates by CATEGORY and
          never by person (Ruling 1: a wage record names its person, a
          display does not rank one); the action writes the signed-in
          person's OWN time and takes no person input. */}
      <div className="card">
        <div className="eyebrow">Company time; trailing 30 days</div>
        <div className="note">
          Team meetings, required training, onboarding and shadow visits, and playbook
          upkeep are paid time about a person, recorded with no household attached.
          Totals here are by category only. QuickBooks stays the book of record for pay
          (ADR-004): hours in, never pay out.
        </div>
        <div className="prov" style={{ marginTop: 6 }}>
          {companyTime.length === 0
            ? "None recorded in the last 30 days."
            : companyTime.map(({ category, minutes }) =>
                `${category.replace(/_/g, " ")} ${(minutes / 60).toFixed(1)}h`).join(" · ")}
        </div>
        <form action={createCompanyTimeEntry} className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "flex-end", marginTop: 8 }}>
          <input type="hidden" name="returnTo" value="/oversight" />
          <span>
            <label htmlFor="fct-cat">Time</label>
            <select key={`fct-${recorded ?? "0"}`} id="fct-cat" name="category" defaultValue="team_meeting" className="inline">
              {["team_meeting", "training", "onboarding_visit", "shadow_visit", "playbook_maintenance"].map(
                (c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </span>
          <span>
            <label htmlFor="fct-start">From</label>
            <input id="fct-start" name="startedAt" type="datetime-local" required style={{ marginTop: 0 }} />
          </span>
          <span>
            <label htmlFor="fct-end">To</label>
            <input id="fct-end" name="endedAt" type="datetime-local" required style={{ marginTop: 0 }} />
          </span>
          <span style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="fct-note">Note</label>
            <input id="fct-note" name="note" placeholder="optional" style={{ marginTop: 0 }} />
          </span>
          <button className="act subtle">Log company time</button>
        </form>
      </div>
    </>
  );
}
