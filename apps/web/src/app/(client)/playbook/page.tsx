import { filterFields, assertClientPayloadSafe, type FieldRecord } from "@wellkept/permissions";
import { SECTION_NAMES } from "@wellkept/schema";
import { redirect } from "next/navigation";
import { getHouseholdAndPrincipal, getFields, getPendingEdits } from "@/lib/data";
import { proposeEdit } from "@/lib/actions";
import { isClientEditable } from "@/lib/client-allowlist";
import { latestAppliedVisit } from "@/lib/visit-command-store";
import { getRegistries, getStewardship } from "@/lib/data";
import { RegistryCard } from "@/app/RegistryCard";

export const dynamic = "force-dynamic";

/**
 * REQ-024: the trust ceremony. What Well Kept holds for this household — by
 * CATEGORY, never a value — how many items are secured in the vault, and
 * when anything secured was last accessed. The client's window into their
 * own stewardship.
 */
async function StewardshipCard({ householdId }: { householdId: string }) {
  const s = await getStewardship(householdId);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  return (
    <div className="card">
      <h2>What we hold for you</h2>
      <div className="note">
        Everything Well Kept keeps about your household, by category. Your working details and every
        secured item stay behind the protections the app enforces — shown here as counts, never
        printed.
      </div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap", margin: "6px 0 12px" }}>
        <span className="pill">{s.totalConfirmed} confirmed of {s.totalHeld} entries</span>
        <span className="pill">{s.sections.length} categories</span>
        <span className="pill">
          {s.vaultCount} secured item{s.vaultCount === 1 ? "" : "s"} in the vault
        </span>
      </div>
      <div className="prov" style={{ marginBottom: 10 }}>
        {s.lastVaultAccess
          ? `Your secured items were last accessed on ${fmt(s.lastVaultAccess)} — every access is logged.`
          : "Nothing secured has ever been accessed. Every future access will be logged."}
      </div>
      {s.sections.map((sec) => (
        <div key={sec.section} className="field" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span className="fname" style={{ fontWeight: "normal" }}>{SECTION_NAMES[sec.section] ?? `Section ${sec.section}`}</span>
          <span className="prov" style={{ whiteSpace: "nowrap" }}>{sec.confirmed}/{sec.held} confirmed</span>
        </div>
      ))}
    </div>
  );
}

/**
 * REQ-032: what the client receives from a visit is exactly the three
 * sentences and the photo count. Dots, signals, zone notes, and changes
 * stay internal — they are simply never selected into this component.
 */
async function VisitReportCard({ householdId }: { householdId: string }) {
  const latest = await latestAppliedVisit(householdId);
  if (!latest) {
    return (
      <div className="card">
        <h2>This week&apos;s visit</h2>
        <div className="note">No visit report yet. During the pilot, your printed report remains the record.</div>
      </div>
    );
  }
  const payload = latest.payload as { report?: string[]; photoIds?: string[] };
  return (
    <div className="card">
      <h2>This week&apos;s visit</h2>
      {(payload.report ?? []).map((sentence, i) => (
        <div key={i} className="fval" style={{ lineHeight: 1.6 }}>{sentence}</div>
      ))}
      <div className="prov">
        {(payload.photoIds ?? []).length} photo(s) attached · photo-supported report
      </div>
    </div>
  );
}

/** The intake instrument's field names are long internal prompts; the client
 * sees a clean title (text before the first colon) with the detail demoted. */
function splitName(name: string): { title: string; detail: string | null } {
  const idx = name.indexOf(":");
  if (idx === -1 || idx > 60) return { title: name, detail: null };
  return { title: name.slice(0, idx), detail: name.slice(idx + 1).trim() };
}

function ClientField({
  f,
  pending,
}: {
  f: FieldRecord;
  pending: boolean;
}) {
  const { title } = splitName(String(f.name));
  return (
    <div className={`field ${f.flag && f.flag !== "none" ? String(f.flag) : ""}`}>
      <span className="fname">
        {title}
        {f.flag && f.flag !== "none" ? <span className={`tag ${String(f.flag)}`}>{String(f.flag)}</span> : null}
      </span>
      <div className="fval">{String(f.value)}</div>
      {pending ? (
        <div className="prov">Your suggested update is with your house manager.</div>
      ) : !isClientEditable(String(f.name)) ? null : (
        <details>
          <summary className="prov" style={{ cursor: "pointer" }}>
            Suggest an update
          </summary>
          <form action={proposeEdit} className="row" style={{ marginTop: 6 }}>
            <input type="hidden" name="fieldId" value={String(f.id)} />
            <input name="proposedValue" placeholder="What should this say?" style={{ flex: 1 }} />
            <button className="act subtle">Send for review</button>
          </form>
        </details>
      )}
    </div>
  );
}

/**
 * The client portal (REQ-040): S1 only, branded, read-mostly — and CURATED.
 * The client sees what has been captured for them, not the intake
 * instrument: the visit report first, then their summary, then captured
 * entries with clean titles. The uncaptured remainder is one quiet line,
 * never 200 empty prompts. s2/s3 stays structurally absent: filterFields
 * runs server-side and assertClientPayloadSafe throws before render.
 */
export default async function ClientPlaybook({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { hh, principal } = await getHouseholdAndPrincipal();
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!principal) redirect("/signin");
  if (principal.role !== "client") redirect("/");

  const all = await getFields(hh.id);
  let visible = filterFields("client", all);
  assertClientPayloadSafe(visible); // the payload test, live in the page's data path

  // REQ-020 search: server-side, within the client's own (already
  // filtered) view — the search space itself can never contain s2/s3.
  const query = (q ?? "").trim().toLowerCase();
  if (query) {
    visible = visible.filter(
      (f) =>
        String(f.name).toLowerCase().includes(query) ||
        String(f.value ?? "").toLowerCase().includes(query),
    );
  }

  const pendingEdits = await getPendingEdits(hh.id);
  const pendingByField = new Set(
    pendingEdits.filter((e) => e.status === "pending").map((e) => e.fieldId),
  );

  const captured = visible.filter((f) => f.value);
  const uncapturedCount = visible.length - captured.length;
  const summary = captured.find((f) => String(f.name).startsWith("Household summary paragraph"));
  const flagged = captured.filter((f) => f.flag && f.flag !== "none" && f !== summary);
  const rest = captured.filter((f) => f !== summary && !flagged.includes(f));

  return (
    <>
      <VisitReportCard householdId={hh.id} />

      {summary ? (
        <div className="card">
          <h2>Your household</h2>
          <div className="fval" style={{ lineHeight: 1.7, fontSize: 15 }}>{String(summary.value)}</div>
        </div>
      ) : null}

      <RegistryCard entries={await getRegistries(hh.id, "client")} />

      {flagged.length > 0 && (
        <div className="card">
          <h2>Worth knowing</h2>
          {flagged.map((f) => (
            <ClientField key={String(f.id)} f={f} pending={pendingByField.has(String(f.id))} />
          ))}
        </div>
      )}

      <div className="card">
        <div className="row">
          <h2 style={{ flex: 1 }}>Your Playbook</h2>
          <form className="row" style={{ gap: 6 }}>
            <input name="q" defaultValue={q ?? ""} placeholder="Search your Playbook" className="inline" style={{ marginTop: 0 }} />
            <button className="act subtle">Search</button>
          </form>
        </div>
        {query && (
          <div className="note">
            {captured.length} match(es) for &ldquo;{q}&rdquo; — <a href="/playbook">clear</a>
          </div>
        )}
        {rest.length === 0 && !summary && flagged.length === 0 ? (
          <div className="note">
            Your Playbook fills in as your house manager captures your household&apos;s details —
            entries appear here as they&apos;re confirmed.
          </div>
        ) : (
          [...new Set(rest.map((f) => f.section as number))].sort((a, b) => a - b).map((sec) => (
            <div key={sec}>
              <div className="eyebrow">{SECTION_NAMES[sec] ?? `Section ${sec}`}</div>
              {rest
                .filter((f) => f.section === sec)
                .map((f) => (
                  <ClientField key={String(f.id)} f={f} pending={pendingByField.has(String(f.id))} />
                ))}
            </div>
          ))
        )}
        {uncapturedCount > 0 && (
          <div className="note" style={{ marginTop: 12 }}>
            {uncapturedCount} more entries are still being captured with your house manager; they
            appear here as they&apos;re confirmed.
          </div>
        )}
      </div>

      <StewardshipCard householdId={hh.id} />
    </>
  );
}
