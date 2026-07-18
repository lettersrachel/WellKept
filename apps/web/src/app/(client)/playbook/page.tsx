import { filterFields, assertClientPayloadSafe } from "@wellkept/permissions";
import { redirect } from "next/navigation";
import { getHouseholdAndPrincipal, getFields, getPendingEdits } from "@/lib/data";
import { proposeEdit } from "@/lib/actions";
import { latestAppliedVisit } from "@/lib/visit-command-store";

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
  const payload = latest.payload as { report?: string[]; photoIds?: string[]; hours?: { endedAt?: string } };
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

export const dynamic = "force-dynamic";

/**
 * The client portal (REQ-040): S1 only, branded, read-mostly. The s2/s3
 * content is structurally absent from this page's data, not hidden by
 * styling: filterFields runs server-side, and assertClientPayloadSafe
 * (US-05) throws before render if anything above s1 survives.
 */
export default async function ClientPlaybook() {
  const { hh, principal } = await getHouseholdAndPrincipal();
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!principal) redirect("/signin");
  if (principal.role !== "client") redirect("/");

  const all = await getFields(hh.id);
  const visible = filterFields("client", all);
  assertClientPayloadSafe(visible); // the payload test, live in the page's data path

  const pending = await getPendingEdits(hh.id);
  const pendingByField = new Set(pending.filter((e) => e.status === "pending").map((e) => e.fieldId));

  const flagged = visible.filter((f) => f.flag && f.flag !== "none");
  const sections = new Map<number, typeof visible>();
  for (const f of visible) {
    const s = f.section as number;
    if (!sections.has(s)) sections.set(s, []);
    sections.get(s)!.push(f);
  }

  return (
    <>
      <div className="card">
        <h2>Your Playbook</h2>
        <div className="note">
          Everything Well Kept holds for your household, at your level of the record.{" "}
          {visible.length} entries. Suggest an update on any entry; your house manager reviews and
          merges it.
        </div>
        {flagged.length > 0 && (
          <>
            <div className="eyebrow">Flags first</div>
            {flagged.map((f) => (
              <div key={String(f.id)} className={`field ${f.flag}`}>
                <span className="fname">
                  S{String(f.section)}. {f.name}
                  <span className={`tag ${f.flag}`}>{String(f.flag)}</span>
                </span>
                <div className="fval">{String(f.value)}</div>
              </div>
            ))}
          </>
        )}
        {[...sections.entries()].map(([sec, fields]) => (
          <details key={sec} className="section" open={sec <= 2}>
            <summary>
              Section {sec} <span className="pill">{fields.length}</span>
            </summary>
            {fields.map((f) => (
              <div key={String(f.id)} className="field">
                <span className="fname">{f.name}</span>
                <div className={`fval${f.value ? "" : " unasked"}`}>
                  {f.value ? String(f.value) : "Not yet captured"}
                </div>
                {pendingByField.has(String(f.id)) ? (
                  <div className="prov">Your suggested update is with your house manager.</div>
                ) : (
                  <details>
                    <summary className="prov" style={{ cursor: "pointer" }}>
                      Suggest an update
                    </summary>
                    <form action={proposeEdit} className="row" style={{ marginTop: 6 }}>
                      <input type="hidden" name="fieldId" value={String(f.id)} />
                      <input
                        name="proposedValue"
                        placeholder="What should this say?"
                        style={{ flex: 1 }}
                      />
                      <button className="act subtle">Send for review</button>
                    </form>
                  </details>
                )}
              </div>
            ))}
          </details>
        ))}
      </div>
      <VisitReportCard householdId={hh.id} />
    </>
  );
}
