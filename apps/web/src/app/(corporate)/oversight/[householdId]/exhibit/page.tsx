import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, gte } from "drizzle-orm";
import { visitCommand, gesture, clientEdit, strangerTest, auditEvent, playbookField } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getHouseholdAndPrincipalById } from "@/lib/data";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

/**
 * The exhibit pack (REQ-023/044): one printable artifact that tells a
 * quarter's story for one household — the review-meeting handout and the
 * lender-ready evidence. Everything on it is drawn from the operational
 * record; nothing is typed for the occasion. Browser print IS the export
 * (print CSS hides the chrome), so there is no second rendering path to
 * drift from the live one. Corporate roles only; no s2/s3 values appear —
 * reports, hours, spend and counts only.
 */
export default async function ExhibitPage({
  params,
  searchParams,
}: {
  params: Promise<{ householdId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { householdId } = await params;
  const { hh, principal } = await getHouseholdAndPrincipalById(householdId);
  if (!hh) return <div className="card">No such household.</div>;
  if (!principal) redirect("/signin");
  if (!CORPORATE_ROLES.has(principal.role)) redirect("/");

  const { days } = await searchParams;
  const windowDays = Math.min(365, Math.max(7, Number(days) || 90));
  const since = new Date(Date.now() - windowDays * DAY);

  const [visits, gestures90, edits, tests, tagChanges, fields] = await Promise.all([
    db.select().from(visitCommand).where(and(
      eq(visitCommand.householdId, hh.id), eq(visitCommand.type, "visit.submit"),
      eq(visitCommand.status, "applied"), gte(visitCommand.receivedAt, since),
    )).orderBy(asc(visitCommand.receivedAt)),
    db.select().from(gesture).where(and(eq(gesture.householdId, hh.id), gte(gesture.createdAt, since))),
    db.select().from(clientEdit).where(and(eq(clientEdit.householdId, hh.id), gte(clientEdit.createdAt, since))),
    db.select().from(strangerTest).where(and(eq(strangerTest.householdId, hh.id), gte(strangerTest.createdAt, since))),
    db.select().from(auditEvent).where(and(
      eq(auditEvent.householdId, hh.id), eq(auditEvent.kind, "tag_change"), gte(auditEvent.createdAt, since))),
    db.select({ confirmed: playbookField.confirmed }).from(playbookField).where(eq(playbookField.householdId, hh.id)),
  ]);

  let minutes = 0;
  let photos = 0;
  const visitRows = visits.map((v) => {
    const p = v.payload as {
      hours?: { startedAt: string; endedAt: string };
      report?: string[]; photoIds?: string[]; zoneDrift?: { answer?: string };
    };
    const mins = p.hours ? Math.max(0, (+new Date(p.hours.endedAt) - +new Date(p.hours.startedAt)) / 60000) : 0;
    minutes += mins;
    photos += (p.photoIds ?? []).length;
    return {
      id: v.id, when: v.receivedAt, hours: mins / 60,
      report: p.report ?? [], photoCount: (p.photoIds ?? []).length,
      drift: p.zoneDrift?.answer && p.zoneDrift.answer.toLowerCase() !== "none" ? p.zoneDrift.answer : null,
    };
  });
  const executed = gestures90.filter((g) => g.executedAt);
  const gestureSpend = executed.reduce((s, g) => s + (g.costCents ?? 0), 0);
  const approved = edits.filter((e) => e.status === "approved");
  const rateCents = Number((hh.membershipTerms as { monthlyRateCents?: number } | null)?.monthlyRateCents ?? 0);
  const confirmedPct = fields.length ? Math.round((fields.filter((f) => f.confirmed).length / fields.length) * 100) : 0;

  return (
    <>
      <div className="row no-print" style={{ justifyContent: "space-between", margin: "8px 0" }}>
        <Link className="pill" href={`/oversight/${hh.id}`}>Back to {hh.name}</Link>
        <span className="row" style={{ gap: 6 }}>
          {[30, 90, 180, 365].map((d) => (
            <Link key={d} className="pill" href={`/oversight/${hh.id}/exhibit?days=${d}`}
              style={d === windowDays ? { background: "var(--green)", color: "#fff" } : undefined}>
              {d}d
            </Link>
          ))}
          <span className="pill">Print this page to export</span>
        </span>
      </div>

      <div className="card">
        <div className="sans" style={{ fontSize: 11, color: "var(--gold-ink)", letterSpacing: "0.1em", fontWeight: 700 }}>
          WELL KEPT · SERVICE EXHIBIT · LAST {windowDays} DAYS
        </div>
        <h2 style={{ border: "none", margin: "4px 0 0", padding: 0 }}>{hh.name}</h2>
        <div className="note">
          {hh.tier} · status {hh.statusTag} · record {confirmedPct}% confirmed · generated {day(new Date())},{" "}
          entirely from the operational record.
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span className="pill">{visitRows.length} visit(s)</span>
          <span className="pill">{(minutes / 60).toFixed(1)} field hours</span>
          <span className="pill">{photos} photo(s)</span>
          {rateCents ? <span className="pill">{dollars(rateCents)}/mo</span> : null}
          <span className="pill">{executed.length} gesture(s) · {dollars(gestureSpend)}</span>
          <span className="pill">{approved.length} client update(s) merged</span>
        </div>
      </div>

      <div className="card">
        <h2>Visits</h2>
        {visitRows.length === 0 ? <div className="note">No applied visits in the window.</div>
          : visitRows.map((v) => (
            <div key={v.id} className="field">
              <span className="fname">{day(v.when)}{v.hours ? ` · ${v.hours.toFixed(1)}h` : ""}{v.photoCount ? ` · ${v.photoCount} photo(s)` : ""}</span>
              {v.report.map((sentence, i) => <div key={i} className="fval">{sentence}</div>)}
              {v.drift ? <div className="prov">zone drift noted: {v.drift}</div> : null}
            </div>
          ))}
      </div>

      <div className="card">
        <h2>Quiet care (gestures)</h2>
        {executed.length === 0 ? <div className="note">No gestures executed in the window.</div>
          : executed.map((g) => (
            <div key={g.id} className="field">
              <span className="fname">{g.executedAt ? day(g.executedAt) : ""}{g.costCents != null ? ` · ${dollars(g.costCents)}` : ""}</span>
              <div className="fval">{g.idea}</div>
            </div>
          ))}
      </div>

      <div className="card">
        <h2>Record &amp; trust</h2>
        <div className="field"><span className="fname">Client updates</span>
          <div className="fval">{edits.length} proposed, {approved.length} merged after review.</div></div>
        <div className="field"><span className="fname">Stranger tests</span>
          <div className="fval">
            {tests.length === 0 ? "None run in the window."
              : tests.map((t) => `${day(t.createdAt)}: ${t.passed ? "ran clean" : "friction logged and routed"}`).join(" · ")}
          </div></div>
        <div className="field"><span className="fname">Status changes</span>
          <div className="fval">
            {tagChanges.length === 0 ? `None — steady at ${hh.statusTag} all window.`
              : tagChanges.map((c) => {
                  const d = c.detail as { from?: string; to?: string };
                  return `${day(c.createdAt)}: ${d.from} → ${d.to}`;
                }).join(" · ")}
          </div></div>
      </div>
    </>
  );
}
