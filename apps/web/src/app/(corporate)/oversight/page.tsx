import { redirect } from "next/navigation";
import { filterFields } from "@wellkept/permissions";
import { getRole } from "@/lib/session";
import { getHousehold, getFields, getPendingEdits, getRecentAudit } from "@/lib/data";
import { setStatusTag, reviewEdit } from "@/lib/actions";
import { RevealButton } from "./RevealButton";

export const dynamic = "force-dynamic";

const TAGS = ["STEADY", "ONBOARDING-90", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION"];

/** Corporate oversight (REQ-041..046): full record, fully audited. */
export default async function Oversight() {
  const role = await getRole();
  if (role !== "corporate_admin") redirect("/playbook");
  const hh = await getHousehold();
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;

  const [all, edits, audit] = await Promise.all([
    getFields(hh.id),
    getPendingEdits(hh.id),
    getRecentAudit(hh.id),
  ]);
  const visible = filterFields(role, all);
  const fieldName = new Map(all.map((f) => [f.id, f.name]));
  const pendingEdits = edits.filter((e) => e.status === "pending");
  const lifeEvent = hh.statusTag === "LIFE-EVENT";
  const unconfirmed = all.filter((f) => !f.confirmed).length;
  const bySens = { s1: 0, s2: 0, s3: 0 } as Record<string, number>;
  for (const f of all) bySens[f.sensitivity] = (bySens[f.sensitivity] ?? 0) + 1;

  const sections = new Map<number, typeof visible>();
  for (const f of visible) {
    const s = f.section as number;
    if (!sections.has(s)) sections.set(s, []);
    sections.get(s)!.push(f);
  }

  return (
    <>
      <div className="card">
        <h2>Corporate: household oversight</h2>
        <form action={setStatusTag} className="row">
          <span>Status tag (drives app-wide behavior, REQ-041)</span>
          <input type="hidden" name="householdId" value={hh.id} />
          <span className="row" style={{ gap: 6 }}>
            <select key={hh.statusTag} name="statusTag" defaultValue={hh.statusTag} className="inline">
              {TAGS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button className="act subtle">Set</button>
          </span>
        </form>
        {lifeEvent && (
          <div className="banner" style={{ marginTop: 10 }}>
            LIFE-EVENT set: proposal prompts are suppressed app-wide (holds, never deletes).
            Quiet care only.
          </div>
        )}
        <table className="panel" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Panel</th>
              <th>Reading</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Playbook health</td>
              <td>
                {all.length} fields ({bySens.s1} s1 / {bySens.s2} s2 / {bySens.s3} s3);{" "}
                {unconfirmed} unconfirmed
              </td>
            </tr>
            <tr>
              <td>Client edits</td>
              <td>{pendingEdits.length} pending review</td>
            </tr>
            <tr>
              <td>Tier</td>
              <td>{hh.tier}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {pendingEdits.length > 0 && (
        <div className="card">
          <h2>Client edits awaiting review (REQ-022)</h2>
          <div className="note">
            Client edits land in review state and merge only on approval; the full diff is kept.
          </div>
          {pendingEdits.map((e) => (
            <div key={e.id} className="field">
              <span className="fname">{fieldName.get(e.fieldId) ?? e.fieldId}</span>
              <div className="fval">&ldquo;{e.proposedValue}&rdquo;</div>
              <form action={reviewEdit} className="row" style={{ marginTop: 6 }}>
                <input type="hidden" name="editId" value={e.id} />
                <span className="row" style={{ gap: 6 }}>
                  <button className="act" name="decision" value="approved">
                    Approve &amp; merge
                  </button>
                  <button className="act danger" name="decision" value="declined">
                    Decline
                  </button>
                </span>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Full Playbook (all levels, audited)</h2>
        {[...sections.entries()].map(([sec, fields]) => (
          <details key={sec} className="section" open={fields.some((f) => f.sensitivity === "s3")}>
            <summary>
              Section {sec} <span className="pill">{fields.length}</span>
            </summary>
            {fields.map((f) => (
              <div key={String(f.id)} className={`field ${f.flag && f.flag !== "none" ? f.flag : ""}`}>
                <span className="fname">
                  {f.name}
                  {f.sensitivity !== "s1" && (
                    <span className={`tag ${String(f.sensitivity)}`}>
                      {String(f.sensitivity).toUpperCase()}
                    </span>
                  )}
                  {f.flag && f.flag !== "none" ? (
                    <span className={`tag ${String(f.flag)}`}>{String(f.flag)}</span>
                  ) : null}
                </span>
                <div className={`fval${f.value || f.sensitivity === "s3" ? "" : " unasked"}`}>
                  {f.sensitivity === "s3" ? (
                    <RevealButton fieldId={String(f.id)} />
                  ) : f.value ? (
                    String(f.value)
                  ) : (
                    "Not yet captured"
                  )}
                </div>
                <div className="prov">
                  [{String(f.provenance)}
                  {f.confirmed ? ", confirmed" : ""}]
                </div>
              </div>
            ))}
          </details>
        ))}
      </div>

      <div className="card">
        <h2>Audit trail (REQ-005, append-only)</h2>
        {audit.length === 0 ? (
          <div className="note">No events yet. Reveals, tag changes, and merges land here.</div>
        ) : (
          <table className="panel">
            <thead>
              <tr>
                <th>When</th>
                <th>Kind</th>
                <th>Role</th>
                <th>Field</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td>{a.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
                  <td>{a.kind}</td>
                  <td>{a.actorRole}</td>
                  <td>{(a.fieldId && fieldName.get(a.fieldId)) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
