import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gte, isNull } from "drizzle-orm";
import { visitCommand, gesture, dot, clientEdit, strangerTest, auditEvent, playbookField } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";
import { setMonthlyRate } from "@/lib/actions";
import { getPrincipal } from "@/lib/session";

export const dynamic = "force-dynamic";
// Headroom over Vercel's ~10s default (2026-07-27, see drill-in note): a slow
// dependency must degrade the page, not silently truncate it mid-stream.
export const maxDuration = 60;

const DAY = 24 * 60 * 60 * 1000;
const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * REQ-040: the economics and relationship-health panels — the management
 * surface. Economics from what the record already knows: the monthly rate
 * (corporate-set, integer cents in membership_terms), hours from applied
 * visit payloads, gesture spend from the quiet-care log. Relationship
 * health from the operational exhaust: visit cadence, tag stability,
 * life-change signals, dots heard, client engagement, stranger-test
 * recency. Per-household queries, fine at pilot scale (same pattern as
 * the fleet board); the 150-household console aggregates server-side.
 */
export default async function EconomicsPage() {
  const assigned = await getAssignedHouseholds();
  // Fixture households are not clients: out of every total and count here.
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role) && !a.hh.isFixture);
  if (corporate.length === 0) redirect("/");
  const isAdmin = (await getPrincipal(corporate[0]!.hh.id))?.role === "corporate_admin";

  const now = Date.now();
  const d30 = new Date(now - 30 * DAY);
  const d90 = new Date(now - 90 * DAY);

  const rows = await Promise.all(corporate.map(async ({ hh }) => {
    const [visits30, gestures90, dots90, edits90, tests, tagChanges, fields] = await Promise.all([
      db.select().from(visitCommand).where(and(
        eq(visitCommand.householdId, hh.id), eq(visitCommand.type, "visit.submit"),
        eq(visitCommand.status, "applied"), gte(visitCommand.receivedAt, d30))),
      db.select().from(gesture).where(and(eq(gesture.householdId, hh.id), gte(gesture.createdAt, d90))),
      db.select({ id: dot.id }).from(dot).where(and(eq(dot.householdId, hh.id), gte(dot.heardAt, d90))),
      db.select().from(clientEdit).where(and(eq(clientEdit.householdId, hh.id), gte(clientEdit.createdAt, d90))),
      db.select().from(strangerTest).where(eq(strangerTest.householdId, hh.id)),
      db.select().from(auditEvent).where(and(eq(auditEvent.householdId, hh.id), eq(auditEvent.kind, "tag_change"))),
      db.select({ confirmed: playbookField.confirmed }).from(playbookField)
        .where(and(eq(playbookField.householdId, hh.id), isNull(playbookField.tombstonedAt))),
    ]);

    let minutes30 = 0;
    let lastVisit: Date | null = null;
    for (const v of visits30) {
      const p = v.payload as { hours?: { startedAt: string; endedAt: string } };
      if (p.hours) minutes30 += Math.max(0, (+new Date(p.hours.endedAt) - +new Date(p.hours.startedAt)) / 60000);
      if (!lastVisit || v.receivedAt > lastVisit) lastVisit = v.receivedAt;
    }
    const hours30 = minutes30 / 60;
    const rateCents = Number((hh.membershipTerms as { monthlyRateCents?: number } | null)?.monthlyRateCents ?? 0);
    const gestureSpend90 = gestures90.reduce((s, g) => s + (g.costCents ?? 0), 0);
    const signals90 = await db.select({ id: visitCommand.id }).from(visitCommand).where(and(
      eq(visitCommand.householdId, hh.id), eq(visitCommand.type, "signal.route"), gte(visitCommand.receivedAt, d90)));
    const lastTag = tagChanges[tagChanges.length - 1];
    const lastTest = tests[tests.length - 1];
    const approved = edits90.filter((e) => e.status === "approved").length;
    return {
      hh, rateCents, hours30, visits30: visits30.length,
      effHourlyCents: hours30 > 0 && rateCents > 0 ? Math.round(rateCents / hours30) : null,
      gestureSpend90, signals90: signals90.length, dots90: dots90.length,
      edits90: edits90.length, approved90: approved,
      daysSinceVisit: lastVisit ? Math.floor((now - +lastVisit) / DAY) : null,
      daysSinceTagChange: lastTag ? Math.floor((now - +lastTag.createdAt) / DAY) : null,
      strangerOk: lastTest ? lastTest.passed : null,
      completeness: fields.length ? Math.round((fields.filter((f) => f.confirmed).length / fields.length) * 100) : 0,
    };
  }));

  const totalRate = rows.reduce((s, r) => s + r.rateCents, 0);
  const totalHours = rows.reduce((s, r) => s + r.hours30, 0);
  const blended = totalHours > 0 && totalRate > 0 ? Math.round(totalRate / totalHours) : null;

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: "center", gap: 10 }}>
          <h2 style={{ border: "none", margin: 0, padding: 0, flex: 1 }}>Economics &amp; relationship health</h2>
          <Link className="pill" href="/oversight">Fleet board</Link>
        </div>
        <div className="note">
          Economics from the record itself: rate is corporate-set; hours come from applied
          visits (last 30 days); gestures are the quiet-care spend (90 days). Health is the
          operational exhaust, not a survey.
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span className="pill">Portfolio {dollars(totalRate)}/mo</span>
          <span className="pill">{totalHours.toFixed(1)} field hours / 30d</span>
          <span className="pill">{blended !== null ? `${dollars(blended)}/hr blended` : "set rates to see $/hr"}</span>
          <span className="pill">{rows.length} household(s)</span>
        </div>
      </div>

      {rows.map((r) => (
        <div className="card" key={r.hh.id}>
          <div className="row" style={{ alignItems: "baseline", gap: 10 }}>
            <h2 style={{ border: "none", margin: 0, padding: 0, flex: 1 }}>
              <Link href={`/oversight/${r.hh.id}`} style={{ color: "var(--green)" }}>{r.hh.name}</Link>
              <span className="pill" style={{ marginLeft: 8 }}>{r.hh.statusTag}</span>
            </h2>
            {isAdmin ? (
              <form action={setMonthlyRate} className="row" style={{ gap: 6 }}>
                <input type="hidden" name="householdId" value={r.hh.id} />
                <input name="monthlyRate" aria-label={`Monthly rate for ${r.hh.name}`} className="inline"
                  defaultValue={r.rateCents ? (r.rateCents / 100).toString() : ""} placeholder="rate $/mo" style={{ width: 110, marginTop: 0 }} />
                <button className="act subtle">Set</button>
              </form>
            ) : (
              <span className="pill">{r.rateCents ? `${dollars(r.rateCents)}/mo` : "no rate set"}</span>
            )}
          </div>
          <table className="panel" style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <td>Economics</td>
                <td>
                  {r.rateCents ? `${dollars(r.rateCents)}/mo` : "no rate set"} · {r.hours30.toFixed(1)}h across {r.visits30} visit(s) /30d
                  {r.effHourlyCents !== null ? ` · ${dollars(r.effHourlyCents)}/effective hour` : ""}
                  {r.gestureSpend90 ? ` · gestures ${dollars(r.gestureSpend90)} /90d` : " · no gesture spend"}
                </td>
              </tr>
              <tr>
                <td>Cadence</td>
                <td>
                  {r.daysSinceVisit === null ? "no applied visits in 30d"
                    : r.daysSinceVisit <= 9 ? `last visit ${r.daysSinceVisit}d ago (on rhythm)`
                    : `last visit ${r.daysSinceVisit}d ago; off the weekly rhythm`}
                </td>
              </tr>
              <tr>
                <td>Relationship</td>
                <td>
                  tag stable {r.daysSinceTagChange !== null ? `${r.daysSinceTagChange}d` : "since onboarding"} ·{" "}
                  {r.signals90} life-change signal(s) /90d · {r.dots90} dot(s) heard ·{" "}
                  {r.edits90} client proposal(s) ({r.approved90} approved)
                </td>
              </tr>
              <tr>
                <td>Record health</td>
                <td>
                  {r.completeness}% confirmed · stranger test{" "}
                  {r.strangerOk === null ? "never run" : r.strangerOk ? "PASSED" : "found friction"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
