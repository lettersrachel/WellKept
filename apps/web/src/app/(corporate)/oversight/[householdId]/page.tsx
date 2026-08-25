import { redirect } from "next/navigation";
import { and, eq, gte, desc } from "drizzle-orm";
import { visitCommand, triggerRule, timeEntry, costEntry, membershipEvent, shadowLog, workItem, attentionRecord, decisionRecord, captureArtifact, SECTION_NAMES, bindProvisions } from "@wellkept/schema";
import { filterFields } from "@wellkept/permissions";
import { provisionsById, standardsSeedReviewed } from "@/lib/standards";
import { ProvisionList } from "@/app/ProvisionList";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { getHouseholdAndPrincipalById, getFields, getPendingEdits, getRecentAudit, getOpenDots, getUpcomingPackItems, getGestures, getStrangerTests } from "@/lib/data";
import { setStatusTag, reviewEdit, setVaultValue, queueGesture, gestureGate, executeGesture, assignRole, revokeRole, promoteDot, forceSignOut, resetTotp, recordHouseholdConsent, createAnticipationExclusion, endAnticipationExclusion, createIncident, resolveIncident, setPhotoRetentionHold, setPhotoReuseAllowed, createTimeEntry, createCostEntry, setReferralSource, recordMembershipEvent, recordObjectObservation, supersedeObjectObservation, scoreShadowSignal, createWorkItem, progressWorkItem, acknowledgeAttention, resolveAttention, routeDecision, decideDecision, fileCaptureArtifact } from "@/lib/actions";
import { getRegistries, getHouseholdMembers, getTotpEnrolled, getVisitPhotos, getExclusions, getIncidents, getObjectObservations } from "@/lib/data";
import { RegistryCard } from "@/app/RegistryCard";
import { vaultHasValue } from "@/lib/vault";
import { RevealButton } from "../RevealButton";
import { RefusalBanner } from "@/components/RefusalBanner";

export const dynamic = "force-dynamic";
// Headroom over Vercel's ~10s default: this page makes many sequential DB
// round-trips, and a slowed dependency (2026-07-27: an over-quota Redis)
// pushed it past the ceiling — the function is killed MID-STREAM, so the
// page silently truncates instead of erroring. 60s keeps a slow render
// alive; the real fix is batching the queries (gap register).
export const maxDuration = 60;

const TAGS = ["STEADY", "ONBOARDING-90", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION"];

/** Corporate oversight (REQ-041..046): full record, fully audited. */
export default async function Oversight({ params, searchParams }: {
  params: Promise<{ householdId: string }>;
  // G-29: actions redirect here with ?refused=<reason> instead of returning
  // silently, so a declined click is legible instead of looking broken.
  searchParams: Promise<{ refused?: string; recorded?: string }>;
}) {
  const { householdId } = await params;
  const { refused, recorded } = await searchParams;
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
  const [gestures, strangerTests, members, exclusions, incidents] = await Promise.all([getGestures(hh.id), getStrangerTests(hh.id), getHouseholdMembers(hh.id), getExclusions(hh.id), getIncidents(hh.id)]);
  // Session B: the resolve form's optional related-rule picker.
  const ruleRows = await db.select().from(triggerRule);
  const ruleOptions = ruleRows.map((r) => ({ id: r.id, packName: (r.definition as { packName?: string }).packName ?? r.id.slice(0, 8) }));
  // Capture sessions 1+2: trailing-30-day hours by category and costs.
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timeRows = await db.select({ category: timeEntry.category, minutes: timeEntry.minutes })
    .from(timeEntry)
    .where(and(eq(timeEntry.householdId, hh.id), gte(timeEntry.startedAt, since30)));
  const minutesByCat = new Map<string, number>();
  for (const t of timeRows) minutesByCat.set(t.category, (minutesByCat.get(t.category) ?? 0) + t.minutes);
  const timeByCategory = Array.from(minutesByCat, ([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  const recentCosts = await db.select().from(costEntry)
    .where(and(eq(costEntry.householdId, hh.id), gte(costEntry.incurredOn, since30.toISOString().slice(0, 10))))
    .orderBy(desc(costEntry.incurredOn))
    .limit(20);
  // WK-DEV-007 s3: the shadow log, founder/CFO/developer visibility ONLY.
  // corporate_ops never receives these rows; the query is role-gated, not
  // merely the render.
  // RFC-PRIM-01: the household's tracked work, live rows first.
  const workItems = (await db.select().from(workItem)
    .where(eq(workItem.householdId, hh.id))
    .orderBy(desc(workItem.createdAt)).limit(30))
    .sort((a, b) => Number(a.status === "done" || a.status === "abandoned") - Number(b.status === "done" || b.status === "abandoned"));
  // WK-DEV-009 s8: the human router's queue, unfiled first.
  const captures = (await db.select().from(captureArtifact)
    .where(eq(captureArtifact.householdId, hh.id))
    .orderBy(desc(captureArtifact.createdAt)).limit(30))
    .sort((a, b) => Number(a.status !== "captured") - Number(b.status !== "captured"));
  // RFC-PRIM-01 build 2: what needs noticing, open first.
  const attention = (await db.select().from(attentionRecord)
    .where(eq(attentionRecord.householdId, hh.id))
    .orderBy(desc(attentionRecord.createdAt)).limit(30))
    .sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved"));
  // RFC-PRIM-01 build 3: routed choices, pending first.
  const decisions = (await db.select().from(decisionRecord)
    .where(eq(decisionRecord.householdId, hh.id))
    .orderBy(desc(decisionRecord.createdAt)).limit(20))
    .sort((a, b) => Number(Boolean(a.outcome ?? a.expiredAt)) - Number(Boolean(b.outcome ?? b.expiredAt)));
  const canSeeShadow = role === "corporate_admin" || role === "cfo_readonly";
  const shadowRows = canSeeShadow
    ? await db.select().from(shadowLog)
        .where(eq(shadowLog.householdId, hh.id))
        .orderBy(desc(shadowLog.evaluatedAt))
        .limit(20)
    : [];
  const unscoredFirst = [...shadowRows].sort((a, b) => Number(Boolean(a.score)) - Number(Boolean(b.score)));
  // Capture session 3: the household's commercial history, oldest first —
  // reconstructable from the event sequence.
  const membershipEvents = await db.select().from(membershipEvent)
    .where(eq(membershipEvent.householdId, hh.id))
    .orderBy(membershipEvent.effectiveOn);
  // Addendum A1 T4: corporate sees every bound provision, source notes included.
  const seedReviewed = await standardsSeedReviewed();
  const provisionsFor = (f: Record<string, unknown>) =>
    bindProvisions(f["governingProvisions"] as string[] | null, provisionsById(), "corporate", seedReviewed);
  const totpEnrolled = await getTotpEnrolled(members.map((m) => m.userId));
  const visitPhotos = await getVisitPhotos(hh.id);
  const isAdmin = role === "corporate_admin";
  const isAdminOrOps = role === "corporate_admin" || role === "corporate_ops";
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
      <RefusalBanner reason={refused} />
      {/* Success made legible (2026-07-27, round two of G-29's lesson): a
          write that landed SAYS so. No green line = it did not happen —
          the table's existing rows can no longer impersonate a new one. */}
      {recorded && (
        <div className="card" role="status" style={{ borderColor: "#2E6B3F", marginBottom: 12 }}>
          <strong>Recorded:</strong> {recorded}; it is in the table below and in the audit trail.
        </div>
      )}
      <div className="card">
        <div className="row" style={{ alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>
            <Link href="/oversight" style={{ color: "var(--grey)", textDecoration: "none" }}>Fleet</Link> → {hh.name}
            {hh.isFixture && <span className="tag s2" style={{ marginLeft: 8 }}>FIXTURE; not a client</span>}
          </h2>
          {/* CEO master view: read-only previews through the other roles' projections. */}
          {isAdmin && <Link className="pill" href={`/oversight/${hh.id}/preview/hm`}>View as HM</Link>}
          {isAdmin && <Link className="pill" href={`/oversight/${hh.id}/preview/client`}>View as client</Link>}
          <Link className="pill" href={`/oversight/${hh.id}/exhibit`}>Exhibit pack</Link>
        </div>
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
        <div className="note">
          Image bytes purge on a rolling window (default 90 days; `photo_retention`
          setting); the record survives as a tombstone. A hold exempts a photo
          (open incident or dispute) until released.
        </div>
        {visitPhotos.length === 0 ? (
          <div className="note">No photos captured yet. House managers add them from the field app; they appear here after sync.</div>
        ) : (
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {visitPhotos.map((p) => (
              <span key={p.id} style={{ textAlign: "center" }}>
                {p.purgedAt ? (
                  <span className="prov" style={{ display: "inline-block", width: 84, height: 84, border: "1px dashed var(--grey)", borderRadius: 6, padding: 6, fontSize: 10 }}>
                    purged {new Date(p.purgedAt).toLocaleDateString()}<br />record retained
                  </span>
                ) : (
                  <a href={`/api/mobile/photo?id=${p.id}`} target="_blank" rel="noreferrer" title={`captured ${new Date(p.createdAt).toLocaleString()}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/mobile/photo?id=${p.id}`} alt="visit photo" width={84} height={84} style={{ objectFit: "cover", borderRadius: 6, border: p.retentionHold ? "2px solid var(--brick)" : "1px solid #e2e0d8" }} />
                  </a>
                )}
                {isAdmin && !p.purgedAt && (
                  <span className="row" style={{ gap: 4, justifyContent: "center" }}>
                    <form action={setPhotoRetentionHold}>
                      <input type="hidden" name="photoId" value={p.id} />
                      <input type="hidden" name="hold" value={(!p.retentionHold).toString()} />
                      <button className="act subtle" style={{ fontSize: 10, padding: "2px 6px" }}>
                        {p.retentionHold ? "Release hold" : "Hold"}
                      </button>
                    </form>
                    {/* REQ-006: reuse is opt-in per photo, never on NDA households. */}
                    {!hh.isNda && (
                      <form action={setPhotoReuseAllowed}>
                        <input type="hidden" name="photoId" value={p.id} />
                        <input type="hidden" name="allow" value={(!p.reuseAllowed).toString()} />
                        <button className="act subtle" style={{ fontSize: 10, padding: "2px 6px" }}>
                          {p.reuseAllowed ? "Reuse: yes" : "Reuse: no"}
                        </button>
                      </form>
                    )}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Incidents &amp; complaints</h2>
        <div className="note">
          A complaint, breakage, injury, or near-miss; in a dispute, the most important
          record in the business. Append-only: no edits; corrections are new entries,
          outcomes are resolution notes. Every entry and resolution is audited.
        </div>
        {incidents.length === 0 ? (
          <div className="note">No incidents recorded.</div>
        ) : (
          <table className="panel">
            <thead>
              <tr><th>Occurred</th><th>Kind</th><th>Severity</th><th>Via</th><th>Description</th><th>Status</th></tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  {/* G-61: occurred_at is a date-only fact from a date input, stored as a
                      timestamp; UTC render shows the stored date as written (the date
                      column itself waits for the Temporal window). */}
                  <td>{i.occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</td>
                  <td>{i.kind.replace(/_/g, " ")}</td>
                  <td><span className={`tag ${i.severity === "high" ? "CRITICAL" : i.severity === "medium" ? "CAUTION" : "s2"}`}>{i.severity}</span></td>
                  <td>{i.reportedVia.replace(/_/g, " ")}</td>
                  <td>
                    {i.description.slice(0, 90)}{i.description.length > 90 ? "…" : ""}
                    {i.resolutionNote && <div className="prov">resolved: {i.resolutionNote.slice(0, 90)}</div>}
                  </td>
                  <td>
                    {i.status === "open" ? (
                      isAdmin ? (
                        <form action={resolveIncident} className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                          <input type="hidden" name="incidentId" value={i.id} />
                          <input name="resolutionNote" aria-label="Resolution note" placeholder="resolution note" required style={{ marginTop: 0, fontSize: 12 }} />
                          {/* Session B: the back-link question. Skippable on
                              purpose (founder decision); blank means
                              unanswered, never guessed. */}
                          <select name="preventableByPrompt" aria-label="Could a prompt have prevented this?" defaultValue="" className="inline" style={{ fontSize: 12 }}>
                            <option value="">preventable by a prompt? (skip)</option>
                            <option value="fired_and_ignored">prompt fired, was ignored</option>
                            <option value="fired_too_late">prompt fired too late</option>
                            <option value="no_prompt_existed">no prompt existed</option>
                            <option value="not_preventable">not preventable</option>
                            <option value="unclear">unclear</option>
                          </select>
                          <select name="relatedRuleId" aria-label="Related rule, if one applies" defaultValue="" className="inline" style={{ fontSize: 12 }}>
                            <option value="">related rule (none)</option>
                            {ruleOptions.map((r) => (
                              <option key={r.id} value={r.id}>{r.packName}</option>
                            ))}
                          </select>
                          <button className="act subtle">Resolve</button>
                        </form>
                      ) : (
                        <span className="tag CAUTION">OPEN</span>
                      )
                    ) : (
                      <span>
                        resolved
                        {i.preventableByPrompt && (
                          <span className="prov" style={{ display: "block" }}>
                            {i.preventableByPrompt.replace(/_/g, " ")}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form action={createIncident} className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap" }}>
          <input type="hidden" name="householdId" value={hh.id} />
          <select key={`ik-${incidents.length}`} name="kind" defaultValue="complaint" className="inline" aria-label="Incident kind">
            {["complaint", "breakage", "injury", "near_miss", "other"].map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}
          </select>
          <select key={`is-${incidents.length}`} name="severity" defaultValue="low" className="inline" aria-label="Severity">
            {["low", "medium", "high"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select key={`iv-${incidents.length}`} name="reportedVia" defaultValue="client_call" className="inline" aria-label="Reported via">
            {["client_call", "client_email", "hm_visit", "corporate", "other"].map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
          </select>
          <label className="sans" style={{ fontWeight: "normal", fontSize: 12, marginTop: 0 }}>
            Occurred <input type="date" name="occurredAt" required style={{ marginTop: 0 }} />
          </label>
          <input name="description" aria-label="What happened" placeholder="what happened (s2, internal)" required style={{ flex: 2, marginTop: 0 }} />
          <button className="act">Log incident</button>
        </form>
      </div>

      {/* Capture sessions 1+2: hours by category and non-labor cost,
          trailing 30 days. The read that makes travel separable from
          delivery; the full unit-economics surface is session 4, gated on
          real data. ADR-004: hours and costs in, never pay or invoices. */}
      <div className="card">
        <h2>Time &amp; costs; trailing 30 days</h2>
        {timeByCategory.length === 0 && recentCosts.length === 0 ? (
          <div className="note">
            Nothing recorded yet. Delivery hours record themselves when a visit closes;
            travel/intake/admin/training and costs are logged after the fact on the
            visit surface (or the forms below at need).
          </div>
        ) : (
          <>
            <div className="prov">
              {timeByCategory.length === 0 ? "no time entries" : timeByCategory
                .map((t) => `${t.category} ${(t.minutes / 60).toFixed(1)}h`)
                .join(" · ")}
            </div>
            {recentCosts.length > 0 && (
              <table className="panel" style={{ marginTop: 6 }}>
                <thead>
                  <tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {recentCosts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.incurredOn}</td>
                      <td>{c.category}{c.miles !== null ? ` (${c.miles} mi)` : ""}</td>
                      <td>${(c.amountCents / 100).toFixed(2)}</td>
                      <td className="prov">{c.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        <form action={createTimeEntry} className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input type="hidden" name="householdId" value={hh.id} />
          <input type="hidden" name="returnTo" value={`/oversight/${hh.id}`} />
          <select key={`tcat-${timeRows.length}`} name="category" defaultValue="intake" className="inline" aria-label="Time category">
            {["intake", "admin", "training", "travel", "delivery"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="sans" style={{ fontWeight: "normal", fontSize: 12, marginTop: 0 }}>
            From <input type="datetime-local" name="startedAt" required style={{ marginTop: 0 }} />
          </label>
          <label className="sans" style={{ fontWeight: "normal", fontSize: 12, marginTop: 0 }}>
            To <input type="datetime-local" name="endedAt" required style={{ marginTop: 0 }} />
          </label>
          <button className="act subtle">Log time</button>
        </form>
        <form action={createCostEntry} className="row" style={{ marginTop: 6, gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input type="hidden" name="householdId" value={hh.id} />
          <input type="hidden" name="returnTo" value={`/oversight/${hh.id}`} />
          <select key={`ccat-${recentCosts.length}`} name="category" defaultValue="supplies" className="inline" aria-label="Cost category">
            {["supplies", "materials", "mileage", "other"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <input name="amount" aria-label="Amount in dollars" inputMode="decimal" placeholder="$ amount" required style={{ marginTop: 0, width: 90 }} />
          <label className="sans" style={{ fontWeight: "normal", fontSize: 12, marginTop: 0 }}>
            On <input type="date" name="incurredOn" required style={{ marginTop: 0 }} />
          </label>
          <input name="miles" aria-label="Miles, mileage only" inputMode="numeric" placeholder="miles" style={{ marginTop: 0, width: 70 }} />
          <input name="note" aria-label="Note" placeholder="note (optional, s2)" style={{ flex: 1, marginTop: 0, minWidth: 120 }} />
          <button className="act subtle">Log cost</button>
        </form>
        <div className="note" style={{ marginTop: 6 }}>
          Capture, not accounting: QuickBooks remains the book of record for money
          (ADR-004). Mileage is entered, never derived from travel time.
        </div>
      </div>

      <div className="card">
        <h2>People &amp; access (REQ-002)</h2>
        <div className="note">
          One role per person per household; no fleet-wide wildcard (REQ-001). Assigning an email
          that has never signed in creates the account; they get in with a magic link.
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
                <td>{m.ndaApproved ? "approved" : "–"}</td>
                <td title={staff ? "Staff roles require a TOTP second factor (REQ-003)" : "Clients sign in by magic link only"}>
                  {!staff ? "–" : totpEnrolled.has(m.userId) ? <span className="prov">on</span> : <span className="prov" style={{ opacity: 0.6 }}>pending</span>}
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
            <input name="email" type="email" aria-label="Email address to add" placeholder="person@example.com" required style={{ flex: 2, marginTop: 0 }} />
            <select key={`ar-${members.length}`} name="role" defaultValue="client" className="inline">
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

      {/* Capture session 3: commercial attributes. Referral recorded once
          (corrections re-record, audited); membership history as append-only
          events. ADR-004: QuickBooks bills; this records state, not money. */}
      <div className="card">
        <h2>Commercial record (capture session 3)</h2>
        <div className="prov">
          Referral: {hh.referralSource ? hh.referralSource.replace(/_/g, " ") : "not recorded"}
          {hh.referralNote && `; ${hh.referralNote}`}
        </div>
        {isAdmin && (
          <form action={setReferralSource} className="row" style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="householdId" value={hh.id} />
            <select key={hh.referralSource ?? "unset"} name="referralSource" defaultValue={hh.referralSource ?? "client_referral"} className="inline" aria-label="Referral source">
              {["client_referral", "professional_referral", "personal_network", "community", "press_or_search", "other"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input name="referralNote" aria-label="Referral note" placeholder="note (who referred, s2, optional)" defaultValue={hh.referralNote ?? ""} style={{ flex: 1, marginTop: 0, minWidth: 160 }} />
            <button className="act subtle">Record referral</button>
          </form>
        )}
        {membershipEvents.length === 0 ? (
          <div className="note" style={{ marginTop: 8 }}>
            No membership events. The history starts with a &ldquo;start&rdquo; event when
            the household signs; record it the day it happens, with the tier and price.
          </div>
        ) : (
          <table className="panel" style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Date</th><th>Event</th><th>Tier</th><th>Price</th><th>Reason / initiator</th></tr>
            </thead>
            <tbody>
              {membershipEvents.map((e) => (
                <tr key={e.id}>
                  <td>{e.effectiveOn}</td>
                  <td>{e.kind.replace(/_/g, " ")}</td>
                  <td>{e.tier ? e.tier.replace(/_/g, " ") : ""}</td>
                  <td>{e.priceCents !== null ? `$${(e.priceCents / 100).toFixed(2)}` : ""}</td>
                  <td className="prov">{[e.reason, e.initiatedBy].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isAdmin && (
          <form action={recordMembershipEvent} className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
            <input type="hidden" name="householdId" value={hh.id} />
            {/* key: an uncontrolled select keeps its DOM value across
                server-action re-renders (the statusTag select learned this
                first); remount after every recorded event so a stale
                choice can never ride into the next submission. It already
                mis-kinded two fixture rows on 2026-07-27. */}
            <select key={`kind-${membershipEvents.length}`} name="kind" defaultValue="start" className="inline" aria-label="Event kind">
              {["start", "tier_change", "pause", "resume", "cancel"].map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}
            </select>
            <label className="sans" style={{ fontWeight: "normal", fontSize: 12, marginTop: 0 }}>
              Effective <input type="date" name="effectiveOn" required style={{ marginTop: 0 }} />
            </label>
            <select key={`tier-${membershipEvents.length}`} name="tier" defaultValue="" className="inline" aria-label="Tier (start and tier change)">
              <option value="">tier…</option>
              {["essential", "family_ops", "concierge"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <input name="price" aria-label="Price in dollars" inputMode="decimal" placeholder="$ price" style={{ marginTop: 0, width: 90 }} />
            <select key={`init-${membershipEvents.length}`} name="initiatedBy" defaultValue="" className="inline" aria-label="Initiated by (required on cancel)">
              <option value="">initiated by…</option>
              <option value="client">client</option>
              <option value="corporate">corporate</option>
            </select>
            <select key={`cause-${membershipEvents.length}`} name="causeCode" defaultValue="" className="inline" aria-label="Cause code (required on cancel)">
              <option value="">cause (required on cancel)…</option>
              {["relocated", "ended_by_member", "ended_by_company", "financial", "life_event", "other_documented"].map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input name="reason" aria-label="Reason (required on cancel)" placeholder="reason (required on cancel, s2)" style={{ flex: 1, marginTop: 0, minWidth: 150 }} />
            <button className="act">Record event</button>
          </form>
        )}
        <div className="note" style={{ marginTop: 6 }}>
          Append-only: corrections add a superseding event. QuickBooks remains the
          billing system of record (ADR-004); this records that state changed.
        </div>
      </div>

      <div className="card">
        <h2>Decisions (RFC-PRIM-01)</h2>
        <div className="note">
          A genuine choice, routed to a person: the recommendation, the alternatives, the
          evidence, and the authority rule it would run under. One choice, one decider,
          never a batch; a decision expires if nobody takes it, and expiry is the
          system&apos;s, never a decider.
        </div>
        {decisions.length === 0 && <div className="prov">No decisions routed on this household.</div>}
        {decisions.map((d) => (
          <div key={d.id} className="field">
            <span className="fname">
              {d.question}
              <span className="prov" style={{ marginLeft: 8 }}>
                {d.audience} decides · runs under {d.authorityClass}
              </span>
            </span>
            <div className="prov">recommended: {d.recommendation}</div>
            {Array.isArray(d.alternatives) && (d.alternatives as string[]).length > 0 && (
              <div className="prov">alternatives: {(d.alternatives as string[]).join(" · ")}</div>
            )}
            {d.outcome ? (
              <div className="prov">{d.outcome}{d.outcomeNote ? `: ${d.outcomeNote}` : ""}</div>
            ) : d.expiredAt ? (
              <div className="prov">expired undecided</div>
            ) : (
              <form action={decideDecision} className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <input type="hidden" name="householdId" value={hh.id} />
                <input type="hidden" name="decisionId" value={d.id} />
                <select name="outcome" defaultValue="accepted" className="inline" aria-label="Decision outcome">
                  <option value="accepted">accept</option>
                  <option value="declined">decline</option>
                </select>
                <input name="note" aria-label="Decision note (optional)" placeholder="note (optional)" style={{ flex: 1, marginTop: 0, minWidth: 120 }} />
                <button className="act subtle">Decide</button>
              </form>
            )}
          </div>
        ))}
        {isAdmin && (
          <form action={routeDecision} className="row" style={{ marginTop: 8, gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="householdId" value={hh.id} />
            <input name="question" aria-label="The choice, in words" placeholder="the choice, in words" required style={{ flex: 2, marginTop: 0, minWidth: 170 }} />
            <input name="recommendation" aria-label="Recommendation" placeholder="recommendation" required style={{ flex: 1, marginTop: 0, minWidth: 130 }} />
            <select name="audience" defaultValue="corporate" className="inline" aria-label="Who decides">
              <option value="hom">the HOM</option>
              <option value="corporate">corporate</option>
              <option value="founder">the founder</option>
            </select>
            <select name="authorityClass" defaultValue="A3" className="inline" aria-label="Authority class">
              {["A0", "A1", "A2", "A3", "A4", "A5"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="act">Route decision</button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Needs noticing (RFC-PRIM-01)</h2>
        <div className="note">
          Reasons a person should look: the overdue surfaces write these once on the daily
          sweep instead of every screen recomputing. A record informs; resolving it closes
          the noticing, never the work it points at. Nothing here acts on its own.
        </div>
        {attention.length === 0 && <div className="prov">Nothing needs noticing on this household.</div>}
        {attention.map((a) => (
          <div key={a.id} className="field">
            <span className="fname">
              {a.reason}
              <span className="prov" style={{ marginLeft: 8 }}>
                {a.sourceKind.replace(/_/g, " ")} · {a.urgency}{a.deadline ? ` · since ${a.deadline}` : ""} · for the {a.audience}
              </span>
            </span>
            {a.status === "resolved" ? (
              <div className="prov">resolved: {a.resolution}</div>
            ) : (
              <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {!a.acknowledgedAt && (
                  <form action={acknowledgeAttention}>
                    <input type="hidden" name="householdId" value={hh.id} />
                    <input type="hidden" name="attentionId" value={a.id} />
                    <button className="act subtle">Seen</button>
                  </form>
                )}
                <form action={resolveAttention} className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <input type="hidden" name="householdId" value={hh.id} />
                  <input type="hidden" name="attentionId" value={a.id} />
                  <input name="note" aria-label="How it was answered" placeholder="how it was answered" style={{ marginTop: 0, minWidth: 160 }} />
                  <button className="act subtle">Resolve</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Work items (RFC-PRIM-01)</h2>
        <div className="note">
          Any meaningful unit of new work: vendor jobs, follow-ups, Runways, internal
          chores. Rhythm work stays with the anticipation engine; client-visible
          noticed-and-left records stay deferrals. Staff-only; the client never sees this.
        </div>
        {workItems.length === 0 && <div className="prov">No work items on this household yet.</div>}
        {workItems.map((w) => (
          <div key={w.id} className="field">
            <span className="fname">
              {w.title}
              <span className="prov" style={{ marginLeft: 8 }}>
                {w.kind} · {w.status}{w.dueDate ? ` · due ${w.dueDate}` : w.windowCondition ? ` · when ${w.windowCondition}` : ""}
              </span>
            </span>
            {w.status === "blocked" && <div className="prov">blocked: {w.blockedReason}</div>}
            {(w.status === "done" || w.status === "abandoned") ? (
              <div className="prov">{w.status}: {w.resolution}</div>
            ) : (
              <form action={progressWorkItem} className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <input type="hidden" name="householdId" value={hh.id} />
                <input type="hidden" name="workItemId" value={w.id} />
                <select name="decision" defaultValue={w.status === "blocked" ? "reopen" : "done"} className="inline" aria-label="Work item decision">
                  <option value="done">done</option>
                  <option value="abandoned">abandoned</option>
                  <option value="block">block</option>
                  <option value="reopen">reopen</option>
                </select>
                <input name="note" aria-label="Reason or completion note" placeholder="reason or completion note" style={{ flex: 1, marginTop: 0, minWidth: 140 }} />
                <button className="act subtle">Apply</button>
              </form>
            )}
          </div>
        ))}
        <form action={createWorkItem} className="row" style={{ marginTop: 8, gap: 6, flexWrap: "wrap" }}>
          <input type="hidden" name="householdId" value={hh.id} />
          <input name="title" aria-label="Work item title" placeholder="the work, in words" required style={{ flex: 2, marginTop: 0, minWidth: 160 }} />
          <select name="kind" defaultValue="followup" className="inline" aria-label="Work item kind">
            <option value="vendor">vendor</option>
            <option value="followup">follow-up</option>
            <option value="runway">runway</option>
            <option value="internal">internal</option>
          </select>
          <label className="sans" style={{ fontWeight: "normal", fontSize: 12, marginTop: 0 }}>
            Due <input type="date" name="dueDate" style={{ marginTop: 0 }} />
          </label>
          <input name="windowCondition" aria-label="Or a stated window" placeholder="or a stated window" style={{ flex: 1, marginTop: 0, minWidth: 120 }} />
          <button className="act">Open work item</button>
        </form>
      </div>

      <div className="card">
        <h2>Tell Well Kept queue (WK-DEV-009 §8)</h2>
        <div className="note">
          What a HOM said once, in their words, so they never have to know the
          filing system. Routing is a person until the Tier M gate opens: file
          it as a work item or dismiss it with the reason. No automatic
          severity routing exists in v1; that vocabulary is a founder decision.
        </div>
        {captures.length === 0 && <div className="prov">Nothing captured on this household yet.</div>}
        {captures.map((c) => (
          <div key={c.id} className="field">
            <span className="fname">
              {c.content}
              <span className="prov" style={{ marginLeft: 8 }}>
                {c.kind} · {c.status} · {c.createdAt.toISOString().slice(0, 10)}
              </span>
            </span>
            {c.status !== "captured" ? (
              <div className="prov">{c.status}: {c.disposition}</div>
            ) : isAdminOrOps ? (
              <form action={fileCaptureArtifact} className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <input type="hidden" name="householdId" value={hh.id} />
                <input type="hidden" name="captureArtifactId" value={c.id} />
                <select name="decision" defaultValue="work_item" className="inline" aria-label="Filing decision">
                  <option value="work_item">file as work item</option>
                  <option value="dismiss">dismiss</option>
                </select>
                <input name="disposition" aria-label="Where it went, or why not" placeholder="where it went, or why not" style={{ flex: 1, marginTop: 0, minWidth: 160 }} />
                <button className="act subtle">File</button>
              </form>
            ) : (
              <div className="prov">awaiting the router</div>
            )}
          </div>
        ))}
      </div>

      {canSeeShadow && (
        <div className="card">
          <h2>Shadow log (WK-DEV-007 §3 · engine in shadow mode)</h2>
          <div className="note">
            What the anticipation engine WOULD have surfaced, and nothing else. Nothing here
            reaches a HOM, a client, or a task until a per-trigger promotion flag flips, and
            the A0 cap holds regardless. Weekly scoring is the calibration input: per-trigger
            precision accumulates from these rows, and promotion is earned on that evidence.
          </div>
          {unscoredFirst.length === 0 && <div className="prov">No shadow evaluations recorded for this household yet.</div>}
          {unscoredFirst.map((s) => (
            <div key={s.id} className="field">
              <div className="fname">
                {s.signal}
                <span className="prov" style={{ marginLeft: 8 }}>
                  {s.triggerKey} · confidence {s.confidence}% · proposes {s.proposedClass} · {s.evaluatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                </span>
              </div>
              <div className="prov">{Array.isArray(s.evidence) ? (s.evidence as string[]).join(" · ") : ""}</div>
              {s.score ? (
                <div className="prov">scored: {s.score.replace("_", " ")}</div>
              ) : isAdmin ? (
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  {(["true_signal", "noise", "unknowable"] as const).map((sc) => (
                    <form key={sc} action={scoreShadowSignal}>
                      <input type="hidden" name="householdId" value={hh.id} />
                      <input type="hidden" name="shadowLogId" value={s.id} />
                      <input type="hidden" name="score" value={sc} />
                      <button className="act subtle">{sc.replace("_", " ")}</button>
                    </form>
                  ))}
                </div>
              ) : (
                <div className="prov">unscored; the founder scores weekly</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Household consent (ADR-001 guardrail 3 · LAUNCH 1.5)</h2>
        {hh.consentSignedAt ? (
          <div className="fval">
            {/* G-61: same class as occurred_at above; UTC shows the signed date as recorded. */}
            Signed consent on record: {hh.consentSignedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
            {" · "}doc version {hh.consentDocVersion}
          </div>
        ) : (
          <div className="banner">
            NO CONSENT ON RECORD. Written consent is the precondition for real household
            data (ADR-001 guardrail 3). Sign legal/household-consent.md, file the paper,
            and record it here; the client-side counterpart of the staff NDA flag.
          </div>
        )}
        {isAdmin && (
          <form action={recordHouseholdConsent} className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="householdId" value={hh.id} />
            <label className="sans" style={{ fontWeight: "normal", fontSize: 12, marginTop: 0 }}>
              Signed on <input type="date" name="signedAt" required style={{ marginTop: 0 }} />
            </label>
            <input name="docVersion" aria-label="Consent document version" placeholder="doc version, e.g. household-consent v1 (2026-07)" required style={{ flex: 2, marginTop: 0 }} />
            <button className="act">Record consent</button>
          </form>
        )}
        <div className="note" style={{ marginTop: 6 }}>
          The paper stays the artifact; this records that it exists, when, and which
          version. Corrections re-record; the audit trail keeps every prior value.
        </div>
      </div>

      <div className="card">
        <h2>Anticipation exclusions (REQ-056)</h2>
        <div className="note">
          What NOT to surface: enforced server-side in the scheduler before anything is
          queued, fail closed. Safety floors bypass exclusions entirely. Approval is
          corporate only, always; ending an exclusion closes its window (nothing deletes).
        </div>
        {exclusions.length === 0 ? (
          <div className="note">No exclusions recorded.</div>
        ) : (
          <table className="panel">
            <thead>
              <tr><th>Scope</th><th>Target</th><th>Requested by</th><th>Window</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {exclusions.map((x) => {
                const ended = x.effectiveTo && x.effectiveTo <= new Date();
                return (
                  <tr key={x.id} style={ended ? { opacity: 0.55 } : undefined}>
                    <td>{x.scope}</td>
                    <td>{x.scope === "all" ? "everything" : x.target}</td>
                    <td>{x.requestedBy.replace("_", " ")}</td>
                    <td>
                      {x.effectiveFrom.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}
                      {" – "}
                      {x.effectiveTo ? x.effectiveTo.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "open"}
                    </td>
                    {isAdmin && (
                      <td>
                        {!ended && (
                          <form action={endAnticipationExclusion}>
                            <input type="hidden" name="exclusionId" value={x.id} />
                            <button className="act subtle danger">End</button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {isAdmin && (
          <form action={createAnticipationExclusion} className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="householdId" value={hh.id} />
            <select key={`xs-${exclusions.length}`} name="scope" defaultValue="topic" className="inline" aria-label="Exclusion scope">
              {["rule", "topic", "person", "field", "all"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <input name="target" aria-label="Exclusion target" placeholder="rule id, topic, person, or field ref" style={{ flex: 2, marginTop: 0 }} />
            <select key={`xr-${exclusions.length}`} name="requestedBy" defaultValue="client" className="inline" aria-label="Requested by">
              {["client", "house_manager", "corporate"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <input name="reason" aria-label="Reason (internal, s2)" placeholder="reason (internal, s2)" style={{ flex: 2, marginTop: 0 }} />
            <button className="act">Approve exclusion</button>
          </form>
        )}
      </div>

      <RegistryCard
        entries={await getRegistries(hh.id, role)}
        showSensitivity
        series={await getObjectObservations(hh.id)}
        observe={recordObjectObservation}
        supersede={supersedeObjectObservation}
        returnTo={`/oversight/${hh.id}`}
        householdId={hh.id}
      />

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
                    <input name="idea" aria-label="Gesture idea" placeholder="The gesture idea" style={{ flex: 1 }} />
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
          Cultural fit first, HM notified second, executed third; the order is enforced in the
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
                    <input name="costDollars" aria-label="Cost in dollars" className="inline" placeholder="$" style={{ width: 70 }} />
                    <button className="act">Executed; to the quiet log</button>
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
              S{sec} · {SECTION_NAMES[sec] ?? "–"} <span className="pill">{fields.length}</span>
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
                            <input name="vaultValue" aria-label="Vault value to seal" placeholder="Sealed with the household key; never stored in plain text" style={{ flex: 1 }} />
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
                <ProvisionList provisions={provisionsFor(f)} />
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
