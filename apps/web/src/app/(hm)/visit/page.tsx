import Link from "next/link";
import { redirect } from "next/navigation";
import { filterFields } from "@wellkept/permissions";
import { bindProvisions } from "@wellkept/schema";
import { getFieldHouseholdAndPrincipal, getFields, getOpenDots, getUpcomingPackItems, getDeltasSince, getSeasonRecall, getPromptOutcomes } from "@/lib/data";
import { provisionsById, standardsSeedReviewed } from "@/lib/standards";
import { latestAppliedVisit } from "@/lib/visit-command-store";
import { logStrangerTest, recordPromptOutcome, createTimeEntry, createCostEntry } from "@/lib/actions";
import { VisitWizard } from "./VisitWizard";
import { VisitAlerts } from "./VisitAlerts";
import { PushRegister } from "./PushRegister";
import { ProvisionList } from "../../ProvisionList";

export const dynamic = "force-dynamic";

const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);

/**
 * Session A: one answer = one tap, with the second dimension (was it news?
 * why dismissed?) carried by hidden fields instead of a second screen — a
 * driveway answer beats a modal. Each choice is its own form because only
 * the clicked submit button's value travels with the POST.
 */
function OutcomeChoice({ promptId, outcome, label, wasNews, dismissReason }: {
  promptId: string; outcome: string; label: string; wasNews?: string; dismissReason?: string;
}) {
  return (
    <form action={recordPromptOutcome} style={{ display: "inline" }}>
      <input type="hidden" name="promptId" value={promptId} />
      <input type="hidden" name="outcome" value={outcome} />
      {wasNews !== undefined && <input type="hidden" name="wasNews" value={wasNews} />}
      {dismissReason !== undefined && <input type="hidden" name="dismissReason" value={dismissReason} />}
      <button className="act subtle">{label}</button>
    </form>
  );
}

/** Session A: render an answer with its second dimension, if recorded. */
function outcomeLabel(o: { outcome: string; wasNews: boolean | null; dismissReason: string | null }): string {
  if (o.outcome === "acted" && o.wasNews === true) return "acted — good catch";
  if (o.outcome === "acted" && o.wasNews === false) return "acted — already on it";
  if (o.outcome === "dismissed" && o.dismissReason === "wrong") return "dismissed — wrong for this home";
  if (o.outcome === "dismissed" && o.dismissReason === "bad_timing") return "dismissed — bad timing";
  return o.outcome.replace(/_/g, " ");
}

/**
 * The HM surface (REQ-030/031), mobile-web per the verified foundation-repo
 * pattern: briefing (flags first, LIFE-EVENT suppression) + the close-flow
 * wizard with offline queue. The Expo app remains the sprint 3-5 native
 * deliverable; it will reuse @wellkept/close-flow and @wellkept/offline-queue
 * unchanged.
 */
export default async function VisitPage() {
  const { hh, principal } = await getFieldHouseholdAndPrincipal();
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!principal) redirect("/signin");
  if (!FIELD_ROLES.has(principal.role)) redirect("/");

  const [allFields, dots, packItems, lastVisit, seedReviewed, recall] = await Promise.all([
    getFields(hh.id),
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id),
    latestAppliedVisit(hh.id),
    standardsSeedReviewed(),
    getSeasonRecall(hh.id),
  ]);
  const fields = filterFields(principal.role, allFields, {
    ndaMode: hh.isNda && !principal.ndaApproved,
  });
  // Addendum A1 T4: bound provisions render beneath the field, collapsed.
  // Bundled per release (airplane test); dark until the corrected seed loads.
  const provisions = provisionsById();
  const provisionsFor = (f: Record<string, unknown>) =>
    bindProvisions(f["governingProvisions"] as string[] | null, provisions, "hm", seedReviewed);
  const fieldById = new Map(fields.map((f) => [String(f.id), f]));
  const flagged = fields.filter((f) => f.flag && f.flag !== "none");
  const lifeEvent = hh.statusTag === "LIFE-EVENT";
  const stranger = principal.role === "backup_hm"; // REQ-033: amplified first-visit mode
  const radarAll = packItems.filter((i) => !i.suppressedByTag);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const specials = radarAll.filter((i) => i.fireAt <= endOfToday);
  const radar = radarAll.filter((i) => i.fireAt > endOfToday);
  // A2/REQ-055: this user's answers on the surfaced prompts. Answering never
  // gates anything; an ignored prompt is itself the signal.
  const outcomes = await getPromptOutcomes(specials.map((i) => i.id), principal.userId);
  const deltasRaw = await getDeltasSince(hh.id, lastVisit ? lastVisit.receivedAt : null);
  const visibleIds = new Set(fields.map((f) => String(f.id)));
  const deltas = deltasRaw.filter((d) => visibleIds.has(d.id) && d.value).slice(-6);
  // First-visit essentials for stranger mode: flags plus captured
  // pets/property/access content — what a stranger needs to not fumble.
  const essentials = stranger
    ? fields.filter((f) => [4, 6, 7].includes(f.section as number) && f.value).slice(0, 8)
    : [];
  const fmtDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card" style={{ background: "var(--green)", color: "#fff" }}>
        <div className="sans" style={{ fontSize: 11, color: "var(--sage)", letterSpacing: "0.1em" }}>
          BRIEFING FROM THE LIVE RECORD.
        </div>
        <div style={{ fontSize: 22, marginTop: 4 }}>{hh.name}</div>
        <div className="sans" style={{ fontSize: 12, color: "var(--sage)", marginTop: 2 }}>
          {hh.tier}
          {lifeEvent && <span style={{ color: "var(--gold-bright)", fontWeight: 700 }}> | LIFE-EVENT set by corporate</span>}
          {stranger && <span style={{ color: "var(--gold-bright)", fontWeight: 700 }}> | STRANGER MODE — first-visit runbook</span>}
        </div>
        <div style={{ marginTop: 8 }}>
          <Link className="pill" href="/intake" style={{ background: "var(--sage)", color: "var(--green)" }}>Intake mode</Link>
        </div>
      </div>

      {stranger && (
        <>
          <div className="eyebrow">First-visit essentials (pets · property · access)</div>
          <div className="card">
            {essentials.length === 0 ? (
              <div className="note">Nothing captured yet in the access/property sections.</div>
            ) : (
              essentials.map((f) => (
                <div key={String(f.id)} className="field">
                  <span className="fname">{String(f.name).split(":")[0]}</span>
                  <div className="fval">{String(f.value)}</div>
                  <ProvisionList provisions={provisionsFor(f)} />
                </div>
              ))
            )}
          </div>
        </>
      )}

      <VisitAlerts />
      <PushRegister />

      <div className="eyebrow">Flags first</div>
      {flagged.length === 0 ? (
        <div className="note">No flagged fields on this record yet.</div>
      ) : (
        flagged.map((f) => (
          <div key={String(f.id)} className={`card field ${String(f.flag)}`}>
            <span className="fname">
              {f.name}
              <span className={`tag ${String(f.flag)}`}>{String(f.flag)}</span>
            </span>
            {f.value ? <div className="fval">{String(f.value)}</div> : null}
            <ProvisionList provisions={provisionsFor(f)} />
          </div>
        ))
      )}

      <div className="eyebrow">Changed since last visit</div>
      {deltas.length === 0 ? (
        <div className="note">No field changes since the last visit report.</div>
      ) : (
        <div className="card">
          {deltas.map((d) => (
            <div key={d.id} className="field">
              <span className="fname">{d.name.split(":")[0]}</span>
              <div className="fval sans" style={{ fontSize: 13 }}>{d.value.slice(0, 110)}{d.value.length > 110 ? "…" : ""}</div>
              <div className="prov">updated {fmtDay(d.updatedAt)} · {d.provenance}</div>
              {fieldById.has(d.id) && <ProvisionList provisions={provisionsFor(fieldById.get(d.id)!)} />}
            </div>
          ))}
        </div>
      )}

      <div className="eyebrow">Today&apos;s specials</div>
      {lifeEvent ? (
        <div className="note">Held with the rest of the prompts (LIFE-EVENT).</div>
      ) : specials.length === 0 ? (
        <div className="note">Nothing due today.</div>
      ) : (
        specials.map((i) => (
          <div key={i.id} className="card" style={{ background: "var(--sage)", marginBottom: 8 }}>
            <div style={{ fontSize: 15, color: "var(--green)" }}>{i.itemText}</div>
            <div className="prov">{i.packName} · due today</div>
            {outcomes.has(i.id) ? (
              <div className="prov">Answered: {outcomeLabel(outcomes.get(i.id)!)}</div>
            ) : (
              // A2/REQ-055 + Session A: "already done" (right rule, wrong
              // lead time) and "not applicable" (wrong rule for this
              // household) imply opposite corrections; acted splits by
              // whether it was news (informative rate), dismissed by why.
              // Optional always.
              <div style={{ marginTop: 8 }}>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="prov">Acted:</span>
                  <OutcomeChoice promptId={i.id} outcome="acted" wasNews="true" label="Good catch" />
                  <OutcomeChoice promptId={i.id} outcome="acted" wasNews="false" label="Already on it" />
                  <OutcomeChoice promptId={i.id} outcome="already_done" label="Already done" />
                  <OutcomeChoice promptId={i.id} outcome="not_applicable" label="Not applicable" />
                </div>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                  <span className="prov">Dismiss:</span>
                  <OutcomeChoice promptId={i.id} outcome="dismissed" dismissReason="wrong" label="Wrong for this home" />
                  <OutcomeChoice promptId={i.id} outcome="dismissed" dismissReason="bad_timing" label="Bad timing" />
                </div>
              </div>
            )}
          </div>
        ))
      )}

      <div className="eyebrow">Coming up — the anticipation engine</div>
      {lifeEvent ? (
        <div className="card" style={{ border: "1px dashed var(--grey)", background: "var(--cream)" }}>
          <div className="note">Held. LIFE-EVENT pauses every prompt; nothing is deleted.</div>
        </div>
      ) : radar.length === 0 ? (
        <div className="note">Nothing scheduled in the window.</div>
      ) : (
        radar.map((i) => (
          <div key={i.id} className="card" style={{ background: "#F3EAD2", marginBottom: 8 }}>
            <div style={{ fontSize: 15, color: "var(--green)" }}>{i.itemText}</div>
            <div className="prov">
              {i.packName} · fires {fmtDay(i.fireAt)}
            </div>
          </div>
        ))
      )}

      <div className="eyebrow">Last year at this time — repeat-season memory</div>
      {recall.length === 0 ? (
        <div className="note">
          Builds from this household&apos;s own record: recall lines appear once there is a
          year of history behind them. Not a defect — the memory is accruing now.
        </div>
      ) : (
        <div className="card">
          {recall.map((r) => (
            <div key={r.id} className="field">
              <div className="fval sans" style={{ fontSize: 14 }}>{r.summary}</div>
              <div className="prov">
                recall · from a {r.anchorKind.replace(/_/g, " ")} on{" "}
                {fmtDay(r.observedAt)} {r.observedAt.getFullYear()} · fact, not a prompt
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="eyebrow">Open dots</div>
      {dots.length === 0 ? (
        <div className="note">No open dots.</div>
      ) : (
        <div className="card">
          {dots.map((d) => (
            <div key={d.id} className="field">
              <span className="fval" style={{ fontStyle: "italic" }}>&ldquo;{d.verbatim}&rdquo;</span>
              <div className="prov">heard {fmtDay(d.heardAt)} · never client-visible</div>
            </div>
          ))}
        </div>
      )}

      <div className="eyebrow">Proposal window</div>
      {lifeEvent ? (
        <div className="card" style={{ border: "1px dashed var(--grey)", background: "var(--cream)" }}>
          <div className="note">
            Suppressed. LIFE-EVENT is set for this household, so no proposal appears anywhere in
            the app. Care continues; asks stop.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="fval sans" style={{ fontSize: 14 }}>
            Proposals follow this household&apos;s protocol: raise once, warmly, in person, never
            in the report.
          </div>
        </div>
      )}

      {stranger && (
        <>
          <div className="eyebrow">Stranger test (REQ-033)</div>
          <div className="card">
            <div className="note">
              You are the test: could a competent stranger run this visit from the record alone?
              Friction notes route to the primary HM and log as a Stranger Test record.
            </div>
            <form action={logStrangerTest}>
              <input type="hidden" name="householdId" value={hh.id} />
              <label>Friction noticed (one per line; blank only if it truly ran clean)</label>
              <textarea name="frictionNotes" aria-label="Friction noticed" rows={3} placeholder="e.g. Could not find the mudroom bin key from the record alone" />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="act" name="passed" value="yes">Ran clean — PASS</button>
                <button className="act danger" name="passed" value="no">Friction found — log it</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Capture sessions 1+2: after-the-fact time and cost entry (founder
          decisions 2026-07-27). The visit close already produces the
          delivery entry automatically — these forms cover everything else:
          travel, intake, admin, training, and the costs. Hours in, never
          pay out (ADR-004). */}
      <div className="eyebrow">Time &amp; costs — after the fact</div>
      <div className="note">
        Your visit&apos;s delivery hours record themselves when you close. Log travel and
        anything else here; costs go to the household&apos;s record (QuickBooks stays the
        book of record for money).
      </div>
      <form action={createTimeEntry} className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input type="hidden" name="householdId" value={hh.id} />
        <span>
          <label htmlFor="te-cat">Time</label>
          <select id="te-cat" name="category" defaultValue="travel" className="inline">
            {["travel", "intake", "admin", "training", "delivery"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </span>
        <span>
          <label htmlFor="te-start">From</label>
          <input id="te-start" name="startedAt" type="datetime-local" required style={{ marginTop: 0 }} />
        </span>
        <span>
          <label htmlFor="te-end">To</label>
          <input id="te-end" name="endedAt" type="datetime-local" required style={{ marginTop: 0 }} />
        </span>
        <button className="act subtle">Log time</button>
      </form>
      <form action={createCostEntry} className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "flex-end", marginTop: 6 }}>
        <input type="hidden" name="householdId" value={hh.id} />
        <span>
          <label htmlFor="ce-cat">Cost</label>
          <select id="ce-cat" name="category" defaultValue="supplies" className="inline">
            {["supplies", "materials", "mileage", "other"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </span>
        <span>
          <label htmlFor="ce-amt">Amount ($)</label>
          <input id="ce-amt" name="amount" inputMode="decimal" placeholder="12.50" required style={{ marginTop: 0, width: 90 }} />
        </span>
        <span>
          <label htmlFor="ce-date">Date</label>
          <input id="ce-date" name="incurredOn" type="date" required style={{ marginTop: 0 }} />
        </span>
        <span>
          <label htmlFor="ce-miles">Miles (mileage only)</label>
          <input id="ce-miles" name="miles" inputMode="numeric" placeholder="—" style={{ marginTop: 0, width: 80 }} />
        </span>
        <span style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor="ce-note">Note</label>
          <input id="ce-note" name="note" placeholder="optional" style={{ marginTop: 0 }} />
        </span>
        <button className="act subtle">Log cost</button>
      </form>

      <div className="eyebrow">Close the visit</div>
      <VisitWizard householdId={hh.id} />
    </div>
  );
}
