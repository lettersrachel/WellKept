import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { playbookField, visitCommand, strangerTest, promptPackItem, clientEdit, incidentReport } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";

export const dynamic = "force-dynamic";
// Headroom over Vercel's ~10s default (2026-07-27, see drill-in note): a slow
// dependency must degrade the page, not silently truncate it mid-stream.
export const maxDuration = 60;

/**
 * REQ-043: the fleet board. One row per household the signed-in corporate
 * user is explicitly assigned to (REQ-001: no wildcard grants) with status
 * tag, Playbook health, Stranger Test recency, and visit counts.
 */
export default async function FleetBoard() {
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) redirect("/");

  const rowsAll = await Promise.all(
    corporate.map(async ({ hh }) => {
      const [fields, commands, tests, pending, held, openIncidents] = await Promise.all([
        db.select({ confirmed: playbookField.confirmed, sensitivity: playbookField.sensitivity })
          .from(playbookField).where(eq(playbookField.householdId, hh.id)),
        db.select({ type: visitCommand.type, status: visitCommand.status })
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
      return {
        hh,
        confirmed: fields.filter((f) => f.confirmed).length,
        total: fields.length,
        visits: commands.filter((c) => c.type === "visit.submit" && c.status === "applied").length,
        conflicts: commands.filter((c) => c.status === "conflict").length,
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
      <div className="card">
        <div className="row">
          <h2 style={{ border: "none", margin: 0, padding: 0 }}>Fleet — {rows.length} household(s)</h2>
          <Link className="pill" href="/oversight/economics">Economics</Link>
          <Link className="pill" href="/oversight/triggers">Triggers</Link>
          <Link className="pill" href="/standards">Standards library</Link>
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
                <td>{r.visits} applied{r.conflicts ? ` · ${r.conflicts} conflict` : ""}</td>
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
                <span className="tag s2">FIXTURE — not a client</span>{" "}
                <Link href={`/oversight/${r.hh.id}`} style={{ color: "var(--grey)" }}>{r.hh.name}</Link>
                {" · "}deploy-checklist target; excluded from counts, economics, and the digest
                {r.openIncidents > 0 && ` · ${r.openIncidents} open (checklist 13b resolves it)`}
              </div>
            ))}
          </div>
        )}
        <div className="note" style={{ marginTop: 8 }}>
          Rows are the households you hold an explicit assignment for — there is no
          fleet-wide wildcard (REQ-001).
        </div>
      </div>
    </>
  );
}
