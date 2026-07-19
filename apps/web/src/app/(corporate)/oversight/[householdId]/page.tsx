import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { visitCommand, SECTION_NAMES } from "@wellkept/schema";
import { filterFields } from "@wellkept/permissions";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { getHouseholdAndPrincipalById, getFields, getPendingEdits, getRecentAudit, getOpenDots, getUpcomingPackItems, getGestures, getStrangerTests } from "@/lib/data";
import { setStatusTag, reviewEdit, setVaultValue, queueGesture, gestureGate, executeGesture, assignRole, revokeRole, promoteDot, forceSignOut, resetTotp } from "@/lib/actions";
import { getRegistries, getHouseholdMembers, getTotpEnrolled, getVisitPhotos } from "@/lib/data";
import { RegistryCard } from "@/app/RegistryCard";
import { vaultHasValue } from "@/lib/vault";
import { RevealButton } from "../RevealButton";

export const dynamic = "force-dynamic";

const TAGS = ["STEADY", "ONBOARDING-90", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION"];

/** Corporate oversight (REQ-041..046): full record, fully audited. */
export default async function Oversight({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params;
  const { hh, principal } = await getHouseholdAndPrincipalById(householdId);
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!principal) redirect("/signin");
  if (!CORPORATE_ROLES.has(principal.role)) redirect("/");
  const role = principal.role;

  const [all, edits, audit, commands, dots, packItems] = await Promise.all([
    getFields(hh.id),
    getPendingEdits(hh.id),
    getRecentAudit(hh.id),
    db.select().from(visitCommand).where(eq(visitCommand.householdId, hh.id)),
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id, 10),
  ]);
  const [gestures, strangerTests, members] = await Promise.all([getGestures(hh.id), getStrangerTests(hh.id), getHouseholdMembers(hh.id)]);
  const totpEnrolled = await getTotpEnrolled(members.map((m) => m.userId));
  const visitPhotos = await getVisitPhotos(hh.id);
  const isAdmin = role === "corporate_admin";
  const ROLE_OPTIONS = ["client", "house_manager", "backup_hm", "corporate_ops", "corporate_admin", "cfo_readonly"];
  const pendingGestures = gestures.filter((g) => !g.executedAt);
  const quietLog = gestures.filter((g) => g.executedAt);
  const lastStranger = strangerTests[strangerTests.length - 1];
  const visits = commands.filter((c) => c.type === "visit.submit" && c.status === "applied");
  const conflicts = commands.filter((c) => c.status === "conflict");
  const signals = commands.filter((c) => c.type === "signal.route");
  const visible = filterFields(role, all);
  const fieldName = new Map(all.map((f) => [f.id, f.name]));
  const vaulted = await vaultHasValue(all.filter((f) => f.sensitivity === "s3").map((f) => f.id));
  // Dots promote into any non-vault field (s3 goes through the vault).
  const promotableFields = all.filter((f) => f.sensitivity !== "s3");
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
        <h2><Link href="/oversight" style={{ color: "var(--grey)", textDecoration: "none" }}>Fleet</Link> → {hh.name}</h2>
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
              <td>Visits</td>
              <td>
                {visits.length} applied · {conflicts.length} conflict(s) ·{" "}
                {signals.length} life-change signal(s)
              </td>
            </tr>
            <tr>
              <td>Stranger Test</td>
              <td>
                {lastStranger
                  ? `${lastStranger.passed ? "PASSED" : "FRICTION"} · ${lastStranger.createdAt.toISOString().slice(0, 10)}`
                  : "never run"}
              </td>
            </tr>
            <tr>
              <td>Tier</td>
              <td>{hh.tier}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Visit photos</h2>
        {visitPhotos.length === 0 ? (
          <div className="note">No photos captured yet. House managers add them from the field app; they appear here after sync.</div>
        ) : (
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {visitPhotos.map((p) => (
              <a key={p.id} href={`/api/mobile/photo?id=${p.id}`} target="_blank" rel="noreferrer" title={`captured ${new Date(p.createdAt).toLocaleString()}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/mobile/photo?id=${p.id}`} alt="visit photo" width={84} height={84} style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #e2e0d8" }} />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>People &amp; access (REQ-002)</h2>
        <div className="note">
          One role per person per household; no fleet-wide wildcard (REQ-001). Assigning an email
          that has never signed in creates the account — they get in with a magic link.
        </div>
        <table className="panel">
          <thead>
            <tr><th>Email</th><th>Role</th><th>NDA</th><th>2FA</th>{isAdmin && <th></th>}</tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const staff = m.role !== "client";
              return (
              <tr key={m.id}>
                <td>{m.email}</td>
                <td>{m.role.replace("_", " ")}</td>
                <td>{m.ndaApproved ? "approved" : "—"}</td>
                <td title={staff ? "Staff roles require a TOTP second factor (REQ-003)" : "Clients sign in by magic link only"}>
                  {!staff ? "—" : totpEnrolled.has(m.userId) ? <span className="prov">on</span> : <span className="prov" style={{ opacity: 0.6 }}>pending</span>}
                </td>
                {isAdmin && (
                  <td>
                    {m.userId === principal.userId ? (
                      <span className="prov">you</span>
                    ) : (
                      <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        {staff && totpEnrolled.has(m.userId) && (
                          <form action={resetTotp}>
                            <input type="hidden" name="userId" value={m.userId} />
                            <input type="hidden" name="householdId" value={hh.id} />
                            <button className="act subtle" title="Clear their authenticator and sessions; they re-enroll on next sign-in">Reset 2FA</button>
                          </form>
                        )}
                        <form action={forceSignOut}>
                          <input type="hidden" name="userId" value={m.userId} />
                          <input type="hidden" name="householdId" value={hh.id} />
                          <button className="act subtle" title="Delete all their active sessions">Sign out</button>
                        </form>
                        <form action={revokeRole}>
                          <input type="hidden" name="assignmentId" value={m.id} />
                          <input type="hidden" name="householdId" value={hh.id} />
                          <button className="act subtle danger">Revoke</button>
                        </form>
                      </span>
                    )}
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
        {isAdmin && (
          <form action={assignRole} className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="householdId" value={hh.id} />
            <input name="email" type="email" placeholder="person@example.com" required style={{ flex: 2, marginTop: 0 }} />
            <select name="role" defaultValue="client" className="inline">
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r.replace("_", " ")}</option>
              ))}
            </select>
            <label className="sans" style={{ fontWeight: "normal", fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginTop: 0 }}>
              <input type="checkbox" name="ndaApproved" style={{ width: "auto", marginTop: 0 }} /> NDA
            </label>
            <button className="act">Assign</button>
          </form>
        )}
      </div>

      <RegistryCard entries={await getRegistries(hh.id, role)} showSensitivity />

      <div className="card">
        <h2>Anticipation engine (REQ-050: packs are scheduled instances)</h2>
        {packItems.length === 0 ? (
          <div className="note">No scheduled prompts. Field changes on bound fields generate them.</div>
        ) : (
          <table className="panel">
            <thead>
              <tr>
                <th>Fires</th>
                <th>Pack</th>
                <th>Prompt</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {packItems.map((i) => (
                <tr key={i.id}>
                  <td>{i.fireAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}</td>
                  <td>{i.packName}</td>
                  <td>{i.itemText.slice(0, 70)}{i.itemText.length > 70 ? "…" : ""}</td>
                  <td>{i.suppressedByTag ? "HELD" : "scheduled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {dots.length > 0 && (
          <>
            <div className="eyebrow">Open dots (feed future gestures, REQ-046)</div>
            {dots.map((d) => (
              <div key={d.id} className="field">
                <span className="fval" style={{ fontStyle: "italic" }}>&ldquo;{d.verbatim}&rdquo;</span>
                <details>
                  <summary className="prov" style={{ cursor: "pointer" }}>Queue a gesture from this dot</summary>
                  <form action={queueGesture} className="row" style={{ marginTop: 6 }}>
                    <input type="hidden" name="householdId" value={hh.id} />
                    <input type="hidden" name="dotId" value={d.id} />
                    <input name="idea" placeholder="The gesture idea" style={{ flex: 1 }} />
                    <button className="act subtle">Queue</button>
                  </form>
                </details>
                <details>
                  <summary className="prov" style={{ cursor: "pointer" }}>Promote to a field (REQ-046)</summary>
                  <form action={promoteDot} style={{ marginTop: 6 }}>
                    <input type="hidden" name="dotId" value={d.id} />
                    <select name="fieldId" className="inline" required defaultValue="">
                      <option value="" disabled>Which field does this inform?</option>
                      {promotableFields.map((f) => (
                        <option key={String(f.id)} value={String(f.id)}>
                          S{String(f.section)} · {(String(f.name).split(":")[0] ?? "").slice(0, 44)}
                        </option>
                      ))}
                    </select>
                    <div className="row" style={{ marginTop: 6 }}>
                      <input name="value" defaultValue={d.verbatim} style={{ flex: 1 }} />
                      <button className="act subtle">Promote &amp; fire triggers</button>
                    </div>
                  </form>
                </details>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="card">
        <h2>Gesture queue (REQ-042: two gates, then quiet)</h2>
        <div className="note">
          Cultural fit first, HM notified second, executed third — the order is enforced in the
          action layer, not the buttons.
        </div>
        {pendingGestures.length === 0 ? (
          <div className="note">Nothing queued. Queue one from a dot above.</div>
        ) : (
          pendingGestures.map((g) => (
            <div key={g.id} className="field">
              <span className="fname">{g.idea}</span>
              <div className="prov">from {g.triggerSource}</div>
              <div className="row" style={{ marginTop: 6, justifyContent: "flex-start", gap: 6 }}>
                {!g.culturalFitChecked ? (
                  <form action={gestureGate}>
                    <input type="hidden" name="gestureId" value={g.id} />
                    <button className="act subtle" name="gate" value="cultural_fit">Gate 1: cultural fit ✓</button>
                  </form>
                ) : !g.hmNotified ? (
                  <form action={gestureGate}>
                    <input type="hidden" name="gestureId" value={g.id} />
                    <button className="act subtle" name="gate" value="hm_notified">Gate 2: HM notified ✓</button>
                  </form>
                ) : (
                  <form action={executeGesture} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="gestureId" value={g.id} />
                    <input name="costDollars" className="inline" placeholder="$" style={{ width: 70 }} />
                    <button className="act">Executed — to the quiet log</button>
                  </form>
                )}
              </div>
            </div>
          ))
        )}
        {quietLog.length > 0 && (
          <>
            <div className="eyebrow">Quiet log (never announced)</div>
            {quietLog.map((g) => (
              <div key={g.id} className="prov">
                {g.idea} · executed {g.executedAt!.toISOString().slice(0, 10)}
                {g.costCents != null ? ` · $${(g.costCents / 100).toFixed(2)}` : ""}
              </div>
            ))}
          </>
        )}
      </div>

      {strangerTests.length > 0 && (
        <div className="card">
          <h2>Stranger Test records (REQ-033)</h2>
          {strangerTests.map((t) => (
            <div key={t.id} className={`field ${t.passed ? "" : "CAUTION"}`}>
              <span className="fname">{t.passed ? "PASSED" : "Friction found"}</span>
              <div className="fval sans" style={{ fontSize: 13 }}>
                {(t.frictionNotes as string[]).join(" · ") || "ran clean from the record alone"}
              </div>
              <div className="prov">{t.createdAt.toISOString().slice(0, 10)}</div>
            </div>
          ))}
        </div>
      )}

      {signals.length > 0 && (
        <div className="card">
          <h2>Life-change signals (same-day routing, never a proposal)</h2>
          {signals.map((s) => (
            <div key={s.id} className="field CRITICAL">
              <span className="fname">Signal from visit {(s.payload as { visitId?: string }).visitId?.slice(0, 8)}</span>
              <div className="prov">received {s.receivedAt.toISOString().replace("T", " ").slice(0, 19)}</div>
            </div>
          ))}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="card">
          <h2>Visit sync conflicts (stored, never dropped)</h2>
          <div className="note">
            Last-write-wins kept the first applied visit; these arrived later for the same day and
            are held here for review. The HM was never blocked.
          </div>
          {conflicts.map((c) => (
            <div key={c.id} className="field CAUTION">
              <span className="fname">{c.type} · {c.reason}</span>
              <div className="fval sans" style={{ fontSize: 13 }}>
                {((c.payload as { report?: string[] }).report ?? []).join(" ")}
              </div>
              <div className="prov">received {c.receivedAt.toISOString().replace("T", " ").slice(0, 19)}</div>
            </div>
          ))}
        </div>
      )}

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
              S{sec} · {SECTION_NAMES[sec] ?? "—"} <span className="pill">{fields.length}</span>
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
                    <>
                      <RevealButton fieldId={String(f.id)} />
                      {role === "corporate_admin" && (
                        <details style={{ marginTop: 6 }}>
                          <summary className="prov" style={{ cursor: "pointer" }}>
                            {vaulted.has(String(f.id)) ? "Replace vault value" : "Set vault value (encrypted)"}
                          </summary>
                          <form action={setVaultValue} className="row" style={{ marginTop: 6 }}>
                            <input type="hidden" name="fieldId" value={String(f.id)} />
                            <input name="vaultValue" placeholder="Sealed with the household key; never stored in plain text" style={{ flex: 1 }} />
                            <button className="act subtle">Seal</button>
                          </form>
                        </details>
                      )}
                    </>
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
        <h2>Change log (REQ-015 · Section 24 · append-only per REQ-005)</h2>
        {audit.length === 0 ? (
          <div className="note">No events yet. Reveals, tag changes, and merges land here.</div>
        ) : (
          audit.map((a) => {
            const field = (a.fieldId && fieldName.get(a.fieldId)?.split(":")[0]) ?? null;
            const when = a.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
            const sentence =
              a.kind === "field_write" ? `merged a client update into “${field}”` :
              a.kind === "vault_write" ? `sealed a new vault value for “${field}”` :
              a.kind === "s3_corporate_view" ? `viewed the secured value of “${field}”` :
              a.kind === "s3_reveal" ? `revealed “${field}” in context` :
              a.kind === "tag_change" ? `set the status tag ${(a.detail as { from?: string; to?: string })?.from ?? "?"} → ${(a.detail as { to?: string })?.to ?? "?"}` :
              a.kind;
            return (
              <div key={a.id} className="field">
                <span className="fval sans" style={{ fontSize: 13 }}>
                  <strong>{a.actorRole.replace("_", " ")}</strong> {sentence}
                </span>
                <div className="prov">{when}</div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
