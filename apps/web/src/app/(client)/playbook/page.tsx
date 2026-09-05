import { BRAND } from "@wellkept/config";
import { filterFields, assertClientPayloadSafe, assertDeclaredClientKeys,
  CLIENT_PLAYBOOK_FIELD_KEYS, CLIENT_REGISTRY_ENTRY_KEYS, type FieldRecord } from "@wellkept/permissions";
import { SECTION_NAMES, assertNoProvisionRows, assertNoAnticipationRows } from "@wellkept/schema";
import { redirect } from "next/navigation";
import { getHouseholdAndPrincipal, getFields, getPendingEdits } from "@/lib/data";
import { proposeEdit } from "@/lib/actions";
import { isClientEditable } from "@/lib/client-allowlist";
import { latestAppliedVisit } from "@/lib/visit-command-store";
import { getRegistries, getStewardship, getClientDeferrals } from "@/lib/data";
import { RegistryCard } from "@/app/RegistryCard";
import { RecordedBanner } from "@/components/RecordedBanner";

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
        Everything {BRAND.companyName} keeps about your household, by category. Your working details and every
        secured item stay behind the protections the app enforces, shown here as counts and never
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
          ? `Your secured items were last accessed on ${fmt(s.lastVaultAccess)}. Every access is logged.`
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

/**
 * THE MEMBER NEVER SEES THE MACHINERY (founder doctrine, Part One item 3,
 * `docs/DOCTRINE_CLIENT_AND_HOM.md`), and until 5 September 2026 this page
 * broke that rule: it rendered `fieldFlagEnum` verbatim, so a member saw
 * `CRITICAL`, `CAUTION` or `DELIGHT` stamped in capitals on their own
 * record.
 *
 * The founder's ruling, applied here exactly: CRITICAL becomes "Needs
 * attention", CAUTION becomes "Worth knowing", and DELIGHT DOES NOT REACH
 * A MEMBER AT ALL, because it is the company's word for how it categorises
 * pleasing them.
 *
 * THE CLASS NAMES CHANGE TOO, not only the text. The staff pages
 * legitimately style on `.field.CRITICAL` and keep doing so; a member's
 * page carrying that class would put the vocabulary in the document even
 * though nobody reads it aloud. These two class names are member-only.
 *
 * A map with no entry means the flag reaches the member as nothing: no
 * label, no styling, no grouping. That is the DELIGHT case, and making
 * absence the default is what stops a flag added tomorrow appearing here
 * by accident.
 */
const MEMBER_FLAG: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: "Needs attention", cls: "flag-attention" },
  CAUTION: { label: "Worth knowing", cls: "flag-know" },
};

function memberFlag(flag: unknown): { label: string; cls: string } | null {
  return (typeof flag === "string" && MEMBER_FLAG[flag]) || null;
}

/**
 * And the vocabulary is PROJECTED OUT, not merely left unrendered.
 *
 * The first version of this fix stopped `CRITICAL` appearing on the page
 * and shipped it anyway: `ClientField` took the whole field row, so the
 * word travelled to the member's browser inside the RSC flight payload and
 * sat in view-source under `"flag":"CRITICAL"`. "The label no longer
 * renders" and "the word no longer reaches the member" are two different
 * claims, and only the second one is the doctrine. The journey caught it
 * by reading the emitted HTML rather than the rendered text.
 *
 * So the component is handed the member's own view: the resolved label, or
 * nothing at all. There is no field on this shape that could carry the
 * company's word, which is the difference between a rule and a habit.
 */
type MemberField = {
  id: unknown;
  name: unknown;
  value: unknown;
  flag: { label: string; cls: string } | null;
};

function toMemberField(f: FieldRecord): MemberField {
  return { id: f.id, name: f.name, value: f.value, flag: memberFlag(f.flag) };
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
  f: MemberField;
  pending: boolean;
}) {
  const { title } = splitName(String(f.name));
  const mf = f.flag;
  return (
    <div className={`field ${mf ? mf.cls : ""}`}>
      <span className="fname">
        {title}
        {mf ? <span className={`tag ${mf.cls}`}>{mf.label}</span> : null}
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
            <input name="proposedValue" aria-label="Suggested update" placeholder="What should this say?" style={{ flex: 1 }} />
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
  // G-68: a member who suggests a change used to get nothing back at all.
  // The confirmation is theirs, in their words, not our word "recorded".
  searchParams: Promise<{ q?: string; recorded?: string }>;
}) {
  const { q, recorded } = await searchParams;
  const { hh, principal, seeded } = await getHouseholdAndPrincipal();
  // G-95: `seeded` distinguishes "the database has no households at all"
  // (a development state, worth saying) from "you are signed in with no
  // assignment" (which belongs at sign-in). This used to be told apart by
  // an ARBITRARY household row standing in as a truthy value.
  if (!hh && !seeded) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!hh || !principal) redirect("/signin");
  if (principal.role !== "client") redirect("/");

  const all = await getFields(hh.id);
  // Project to EXACTLY what the client UI renders before anything can be
  // serialized toward the client: full field rows carry internal columns
  // (governing_provisions above all — standards are HM/corporate only per
  // WK-SOP-019, and Addendum A1 T4's acceptance is that the client portal
  // shows NONE). Both payload guards then run live in the data path.
  let visible: FieldRecord[] = filterFields("client", all).map((f) => ({
    id: f.id, section: f.section, name: f.name, value: f.value,
    flag: f.flag, sensitivity: f.sensitivity,
  }));
  assertClientPayloadSafe(visible); // the payload test, live in the page's data path
  assertNoProvisionRows(visible); // T7: no provision rows or references, ever
  assertNoAnticipationRows(visible); // A2: recall/outcome rows are s2, never client-facing
  // G-78: the other three read sensitivity or known-bad shapes; this one
  // reads the KEY SET, so a column invented tomorrow cannot arrive by
  // default. Redundant on this projection by construction (the literal
  // above cannot grow a key on its own) and kept so both client payloads
  // are governed identically.
  assertDeclaredClientKeys(visible, CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields");

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
  // Grouped by the flags a MEMBER can see, not by every flag that exists.
  // A DELIGHT field would otherwise be lifted into this section with no tag
  // on it, which is the categorisation reaching them through position
  // instead of through words. Reported as a reading of the ruling rather
  // than as something it said in as many terms.
  const flagged = captured.filter((f) => memberFlag(f.flag) && f !== summary);
  const rest = captured.filter((f) => f !== summary && !flagged.includes(f));

  return (
    <>
      <RecordedBanner what={recorded} label="Sent:" />
      <VisitReportCard householdId={hh.id} />

      {summary ? (
        <div className="card">
          <h2>Your household</h2>
          <div className="fval" style={{ lineHeight: 1.7, fontSize: 15 }}>{String(summary.value)}</div>
        </div>
      ) : null}

      {/* G-78: getRegistries projects by SPREAD with a deny-list, so this
          payload carries every column of registry_entry and grows a key
          whenever the table does. This is the surface the key assertion
          exists for; it throws on an undeclared key rather than
          publishing it. */}
      {await (async () => {
        const entries = await getRegistries(hh.id, "client");
        assertDeclaredClientKeys(entries, CLIENT_REGISTRY_ENTRY_KEYS, "registry entries");
        return <RegistryCard entries={entries} />;
      })()}

      {/* W-6 (STD-016): what was noticed and deliberately left, with the
          reason and the intended timing. A clean bathroom demonstrates
          nothing about attention; this does. The projection carries no
          staff attribution, and the payload guard re-asserts that here. */}
      {await (async () => {
        const deferrals = await getClientDeferrals(hh.id);
        assertNoAnticipationRows(deferrals); // no decidedBy, no resolvedBy
        if (deferrals.length === 0) return null;
        const fmtDay = (d: Date) =>
          d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });
        const open = deferrals.filter((d) => !d.resolvedAt);
        const done = deferrals.filter((d) => d.resolvedAt);
        // AB: the resolved story stays visible. "Noticed in March, fixed
        // in May" is the attention a clean bathroom cannot demonstrate.
        const RESOLUTION_COPY: Record<string, string> = {
          done: "taken care of",
          no_longer_needed: "no longer needed",
          superseded: "folded into other work",
        };
        return (
          <div className="card">
            <h2>Noticed, and planned for later</h2>
            <p className="note" style={{ marginTop: 0 }}>
              Small things we saw and chose not to act on yet, so you know they
              are being watched rather than missed.
            </p>
            {open.map((d) => (
              <div key={d.id} className="field">
                <span className="fname">{d.noticed}</span>
                <div className="fval" style={{ fontSize: 14 }}>{d.reason}</div>
                <div className="prov">
                  noticed {fmtDay(d.decidedAt)} · we will come back to it{" "}
                  {d.revisitDate ? `by ${fmtDay(new Date(`${d.revisitDate}T12:00:00Z`))}` : d.revisitCondition}
                </div>
              </div>
            ))}
            {open.length === 0 && <div className="note">Nothing waiting at the moment.</div>}
            {done.length > 0 && (
              <>
                <div className="eyebrow" style={{ marginTop: 10 }}>Since taken care of</div>
                {done.map((d) => (
                  <div key={d.id} className="field" style={{ opacity: 0.85 }}>
                    <span className="fname">{d.noticed}</span>
                    <div className="prov">
                      noticed {fmtDay(d.decidedAt)} ·{" "}
                      {RESOLUTION_COPY[d.resolution ?? "done"]} {d.resolvedAt ? fmtDay(d.resolvedAt) : ""}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })()}

      {flagged.length > 0 && (
        <div className="card">
          <h2>Things to keep an eye on</h2>
          {flagged.map((f) => (
            <ClientField key={String(f.id)} f={toMemberField(f)} pending={pendingByField.has(String(f.id))} />
          ))}
        </div>
      )}

      <div className="card">
        <div className="row">
          <h2 style={{ flex: 1 }}>Your Playbook</h2>
          <form className="row" style={{ gap: 6 }}>
            <input name="q" aria-label="Search your Playbook" defaultValue={q ?? ""} placeholder="Search your Playbook" className="inline" style={{ marginTop: 0 }} />
            <button className="act subtle">Search</button>
          </form>
        </div>
        {query && (
          <div className="note">
            {captured.length} match(es) for &ldquo;{q}&rdquo; · <a href="/playbook">clear</a>
          </div>
        )}
        {rest.length === 0 && !summary && flagged.length === 0 ? (
          <div className="note">
            Your Playbook fills in as your house manager captures your household&apos;s details.
            Entries appear here as they&apos;re confirmed.
          </div>
        ) : (
          [...new Set(rest.map((f) => f.section as number))].sort((a, b) => a - b).map((sec) => (
            <div key={sec}>
              <div className="eyebrow">{SECTION_NAMES[sec] ?? `Section ${sec}`}</div>
              {rest
                .filter((f) => f.section === sec)
                .map((f) => (
                  <ClientField key={String(f.id)} f={toMemberField(f)} pending={pendingByField.has(String(f.id))} />
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
