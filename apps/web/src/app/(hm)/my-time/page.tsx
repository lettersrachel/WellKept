import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { household, timeEntry } from "@wellkept/schema";
import { getStaffIdentity } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * WK-SOP-017 employee self-access (the last open item behind G-111): a
 * staff member reads their OWN wage-time record. Every row where user_id
 * is theirs, household-scoped and person-scoped alike, and nobody
 * else's, ever: the WHERE clause is the wall, and the page renders for
 * the signed-in identity only, taking no person parameter at all.
 *
 * Reading your own record is the SOP's requirement, not per-person
 * analytics: Ruling 1 bars comparative display and ranking, and a page
 * that can only ever show its reader themselves compares nobody. The
 * (hm) layout's staff second factor gates the route; a client or
 * signed-out session resolves no staff identity and is redirected.
 *
 * ADR-004 holds: this is the hours record, never pay. QuickBooks is the
 * book of record for wages; the four-year retention lives in the
 * database rows themselves (kept by default in erasure, the
 * counsel-directed flag documented in the erasure tool's header).
 */
export default async function MyTimePage() {
  const staff = await getStaffIdentity();
  if (!staff) redirect("/");

  const rows = await db
    .select({
      id: timeEntry.id,
      category: timeEntry.category,
      startedAt: timeEntry.startedAt,
      endedAt: timeEntry.endedAt,
      minutes: timeEntry.minutes,
      source: timeEntry.source,
      note: timeEntry.note,
      tz: timeEntry.tz,
      householdName: household.name,
    })
    .from(timeEntry)
    .leftJoin(household, eq(timeEntry.householdId, household.id))
    .where(eq(timeEntry.userId, staff.userId))
    .orderBy(desc(timeEntry.startedAt));

  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.minutes);
  const totals = Array.from(byCat, ([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  // G-116 ("true instant"): a row that knows its zone renders the
  // operator's own wall clock WITH the zone named, which is what the
  // wage record must show. A pre-ruling row (tz null) falls back to the
  // honest UTC label, since its wall clock is not recoverable until the
  // backfill session converts it.
  const { formatInZone } = await import("@/lib/typed-time");
  const fmt = (d: Date, tz: string | null) =>
    tz ? formatInZone(d, tz) : `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;

  return (
    <div className="card">
      <h2>Your time record</h2>
      <div className="note">
        Every paid-time entry recorded under your identity, oldest kept four years
        (WK-SOP-017). Hours only, never pay: QuickBooks remains the book of record
        for wages (ADR-004). Times show in the timezone you entered them, named per
        row; older rows without a recorded zone show in UTC and say so. If an entry
        looks wrong, tell your manager; corrections are new entries, not edits.
      </div>
      {rows.length === 0 ? (
        <div className="prov" style={{ marginTop: 8 }}>No time entries on your record yet.</div>
      ) : (
        <>
          <div className="prov" style={{ marginTop: 8 }}>
            {totals.map(({ category, minutes }) =>
              `${category.replace(/_/g, " ")} ${(minutes / 60).toFixed(1)}h`).join(" · ")}
            {" · "}{rows.length} entr{rows.length === 1 ? "y" : "ies"} on record
          </div>
          <table className="panel" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Zone</th>
                <th>Category</th>
                <th>Minutes</th>
                <th>Where</th>
                <th>Source</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.startedAt, r.tz)}</td>
                  <td>{fmt(r.endedAt, r.tz)}</td>
                  <td>{r.tz ?? "UTC (zone not recorded)"}</td>
                  <td>{r.category.replace(/_/g, " ")}</td>
                  <td>{r.minutes}</td>
                  <td>{r.householdName ?? "not tied to a household"}</td>
                  <td>{r.source}</td>
                  <td>{r.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
