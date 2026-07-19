import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { playbookField, visitCommand, strangerTest, promptPackItem, clientEdit } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * REQ-043: the fleet board. One row per household the signed-in corporate
 * user is explicitly assigned to (REQ-001: no wildcard grants) with status
 * tag, Playbook health, Stranger Test recency, and visit counts.
 */
export default async function FleetBoard() {
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) redirect("/");

  const rows = await Promise.all(
    corporate.map(async ({ hh }) => {
      const [fields, commands, tests, pending, held] = await Promise.all([
        db.select({ confirmed: playbookField.confirmed, sensitivity: playbookField.sensitivity })
          .from(playbookField).where(eq(playbookField.householdId, hh.id)),
        db.select({ type: visitCommand.type, status: visitCommand.status })
          .from(visitCommand).where(eq(visitCommand.householdId, hh.id)),
        db.select().from(strangerTest).where(eq(strangerTest.householdId, hh.id)),
        db.select({ id: clientEdit.id }).from(clientEdit)
          .where(and(eq(clientEdit.householdId, hh.id), eq(clientEdit.status, "pending"))),
        db.select({ id: promptPackItem.id }).from(promptPackItem)
          .where(and(eq(promptPackItem.householdId, hh.id), isNull(promptPackItem.firedAt))),
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
      };
    }),
  );

  return (
    <>
      <div className="card">
        <div className="row">
          <h2 style={{ border: "none", margin: 0, padding: 0 }}>Fleet — {rows.length} household(s)</h2>
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
                <td>{r.pendingEdits} edits · {r.scheduled} prompts</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="note" style={{ marginTop: 8 }}>
          Rows are the households you hold an explicit assignment for — there is no
          fleet-wide wildcard (REQ-001).
        </div>
      </div>
    </>
  );
}
