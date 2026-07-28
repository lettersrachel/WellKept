import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, isNull, eq } from "drizzle-orm";
import { standardProvision } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";
import { documentTitles, standardsSeedReviewed } from "@/lib/standards";

export const dynamic = "force-dynamic";

const TIERS = ["floor_1", "floor_2", "process", "method", "preference"] as const;

/**
 * The standards library (Addendum A1): the fourth store, browsable. Reads
 * the LIVE standard_provision table (the corporate surface follows the
 * store, not the release bundle), Internal-class per WK-SOP-019: corporate
 * roles only, source notes shown, no household data anywhere on the page.
 * Contents remain corporate_admin-edited via founder -> corrected sheet ->
 * loader until an ADR says otherwise; this page is deliberately read-only.
 */
export default async function StandardsLibrary({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>;
}) {
  const assigned = await getAssignedHouseholds();
  if (!assigned.some((a) => CORPORATE_ROLES.has(a.role))) redirect("/");

  const { q, tier } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const tierFilter = TIERS.find((t) => t === tier) ?? null;

  const [all, reviewed] = await Promise.all([
    db.select().from(standardProvision).where(isNull(standardProvision.tombstonedAt))
      .orderBy(asc(standardProvision.document), asc(standardProvision.section), asc(standardProvision.ordinal)),
    standardsSeedReviewed(),
  ]);
  const titles = documentTitles();

  const shown = all.filter((p) => {
    if (tierFilter && p.tier !== tierFilter) return false;
    if (!query) return true;
    return p.id.toLowerCase().includes(query)
      || p.text.toLowerCase().includes(query)
      || p.scope.some((s) => s.toLowerCase().includes(query));
  });
  const byDoc = new Map<string, typeof shown>();
  for (const p of shown) {
    if (!byDoc.has(p.document)) byDoc.set(p.document, []);
    byDoc.get(p.document)!.push(p);
  }
  const tierCounts = Object.fromEntries(TIERS.map((t) => [t, all.filter((p) => p.tier === t).length]));
  const filtering = Boolean(query || tierFilter);

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: "center", gap: 10 }}>
          <h2 style={{ border: "none", margin: 0, padding: 0, flex: 1 }}>
            Standards library — {all.length} provisions, {new Set(all.map((p) => p.document)).size} documents
          </h2>
          <Link className="pill" href="/oversight">Fleet board</Link>
        </div>
        {!reviewed && (
          <div className="note" style={{ color: "var(--brick)", marginTop: 6 }}>
            Tier assignments pending founder review (standards.seed_reviewed is off) — the
            briefing read path renders nothing until the corrected seed loads.
          </div>
        )}
        <form className="row" style={{ gap: 6, marginTop: 10 }}>
          <input name="q" aria-label="Search the standards library" defaultValue={q ?? ""} placeholder="Search text, id (STD-006.3.2), or scope (room:kitchen)" className="inline" style={{ marginTop: 0, flex: 1 }} />
          <button className="act subtle">Search</button>
          {filtering && <Link className="pill" href="/standards">Clear</Link>}
        </form>
        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {TIERS.map((t) => (
            <Link
              key={t}
              className="pill"
              href={t === tierFilter ? "/standards" : `/standards?tier=${t}${query ? `&q=${encodeURIComponent(q ?? "")}` : ""}`}
              style={t.startsWith("floor")
                ? { background: t === tierFilter ? "var(--brick)" : "#fbeded", color: t === tierFilter ? "#fff" : "var(--brick)" }
                : t === tierFilter ? { background: "var(--green)", color: "#fff" } : undefined}
            >
              {t} · {tierCounts[t]}
            </Link>
          ))}
        </div>
        {filtering && (
          <div className="note" style={{ marginTop: 8 }}>
            {shown.length} provision(s) match{tierFilter ? ` tier ${tierFilter}` : ""}{query ? ` “${q}”` : ""}.
          </div>
        )}
      </div>

      {[...byDoc.entries()].map(([doc, provisions]) => (
        <div className="card" key={doc}>
          <details className="section" open={filtering}>
            <summary>
              {doc} · {titles.get(doc) ?? "—"} <span className="pill">{provisions.length}</span>
            </summary>
            {provisions.map((p) => (
              <div key={p.id} className={`provision ${p.overridable ? "quiet" : "floor"}`}>
                <span className="pid">
                  {p.id}
                  {!p.overridable && <span className="tag FLOOR">FLOOR</span>}
                  {p.tier === "process" && <span className="tag s2">PROCESS</span>}
                  {p.pilotDefault && <span className="tag CAUTION">PILOT DEFAULT</span>}
                  {p.version > 1 && <span className="tag s2">v{p.version}</span>}
                </span>
                <div className="ptext">{p.text}</div>
                <div className="psource">
                  {p.scope.join(" · ")}
                  {p.sourceNote ? ` · Source: ${p.sourceNote}` : ""}
                  {` · effective ${p.effectiveDate}`}
                </div>
              </div>
            ))}
          </details>
        </div>
      ))}
      {shown.length === 0 && (
        <div className="card"><div className="note">Nothing matches. The docx library remains the authored source; the store renders.</div></div>
      )}
    </>
  );
}
