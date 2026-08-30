import Link from "next/link";
import { redirect } from "next/navigation";
import { filterFields } from "@wellkept/permissions";
import { bindProvisions, readFeatureFlags, shadowLog } from "@wellkept/schema";
import { surfacesBeyondShadow, partitionPrompts, promptTiming, type ShadowSignal } from "@wellkept/trigger-engine";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getFieldHouseholdAndPrincipal, getFields, getOpenDots, getUpcomingPackItems, getDeltasSince, getSeasonRecall, getPromptOutcomes, getOpenConditionFlags, getRegistries, getDeferrals, getPausedDecisions } from "@/lib/data";
import { provisionsById, standardsSeedReviewed } from "@/lib/standards";
import { latestAppliedVisit } from "@/lib/visit-command-store";
import { composeFieldBrief, recordAndDeliverBrief } from "@/lib/field-brief";
import { logStrangerTest, createTimeEntry, createCostEntry, createPausedDecision, tellWellKept } from "@/lib/actions";
import { VisitWizard } from "./VisitWizard";
import { FlagCaptureForm, FlagLookForm, FlagCloseForm, ResolveButtons, OutcomeButton } from "./OfflineCapture";
import { VisitAlerts } from "./VisitAlerts";
import { PushRegister } from "./PushRegister";
import { ProvisionList } from "../../ProvisionList";
import { RefusalBanner } from "@/components/RefusalBanner";
import { RecordedBanner } from "@/components/RecordedBanner";

export const dynamic = "force-dynamic";

// AJ decision (founder, 2026-07-28, option 2): corporate_admin may run
// the field surfaces when covering a visit - a founder-run pilot means
// the administrator plausibly IS the cover. The audit row records
// actorRole honestly, so "the admin closed this visit" stays a true and
// visible statement. corporate_ops deliberately not included.
const FIELD_ROLES = new Set(["house_manager", "backup_hm", "corporate_admin"]);

/**
 * Session A: one answer = one tap, with the second dimension (was it news?
 * why dismissed?) carried by hidden fields instead of a second screen — a
 * driveway answer beats a modal. Each choice is its own form because only
 * the clicked submit button's value travels with the POST.
 */
function OutcomeChoice({ householdId, promptId, outcome, label, wasNews, dismissReason }: {
  householdId: string; promptId: string; outcome: string; label: string; wasNews?: string; dismissReason?: string;
}) {
  // Input spine build 1: the tap enqueues offline-first; same one-tap shape.
  return (
    <OutcomeButton householdId={householdId} promptId={promptId} outcome={outcome}
      label={label} wasNews={wasNews} dismissReason={dismissReason} />
  );
}

/** Session A: render an answer with its second dimension, if recorded. */
function outcomeLabel(o: { outcome: string; wasNews: boolean | null; dismissReason: string | null }): string {
  if (o.outcome === "acted" && o.wasNews === true) return "acted; good catch";
  if (o.outcome === "acted" && o.wasNews === false) return "acted; already on it";
  if (o.outcome === "dismissed" && o.dismissReason === "wrong") return "dismissed; wrong for this home";
  if (o.outcome === "dismissed" && o.dismissReason === "bad_timing") return "dismissed; bad timing";
  return o.outcome.replace(/_/g, " ");
}

/**
 * The HM surface (REQ-030/031), mobile-web per the verified foundation-repo
 * pattern: briefing (flags first, LIFE-EVENT suppression) + the close-flow
 * wizard with offline queue. The Expo app remains the sprint 3-5 native
 * deliverable; it will reuse @wellkept/close-flow and @wellkept/offline-queue
 * unchanged.
 */
export default async function VisitPage({ searchParams }: {
  // G-29 completion: time/cost verdicts land HERE when submitted here -
  // recorded=<what> on success (with a nonce r that remounts the selects,
  // G-39), refused=<reason> on refusal.
  searchParams: Promise<{ recorded?: string; refused?: string; r?: string }>;
}) {
  const { recorded, refused, r } = await searchParams;
  const { hh, principal, seeded } = await getFieldHouseholdAndPrincipal();
  // G-95: `seeded` distinguishes "the database has no households at all"
  // (a development state, worth saying) from "you are signed in with no
  // assignment" (which belongs at sign-in). This used to be told apart by
  // an ARBITRARY household row standing in as a truthy value.
  if (!hh && !seeded) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!hh || !principal) redirect("/signin");
  if (!FIELD_ROLES.has(principal.role)) redirect("/");

  // Cockpit unification, step 1: the web brief now composes through the
  // SAME composer as the mobile briefing, records the section 2.1
  // snapshot (deduped by content, so a reload writes nothing), and
  // delivers the firewall's previsit_brief attention records here too;
  // a web-only HOM no longer misses what needs noticing. The page's
  // richer surfaces below keep their own queries; the snapshot claims
  // the canonical brief core both surfaces share.
  const composedBrief = await composeFieldBrief(hh, principal);
  await recordAndDeliverBrief(hh, principal, composedBrief);
  const needsNoticing = composedBrief.payload.needsNoticing;
  // 0056: bundled records arrive as ONE situation card each ("one
  // winter-storm situation, not five notifications"); unbundled records
  // keep their individual lines below.
  const situations = composedBrief.payload.situations;

  const [allFields, dots, packItems, lastVisit, seedReviewed, recall, openFlags, registries] = await Promise.all([
    getFields(hh.id),
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id),
    latestAppliedVisit(hh.id),
    standardsSeedReviewed(),
    getSeasonRecall(hh.id),
    getOpenConditionFlags(hh.id),
    getRegistries(hh.id, "house_manager"),
  ]);
  const deferrals = await getDeferrals(hh.id);
  const pausedDecisions = await getPausedDecisions(hh.id);
  const today = new Date().toISOString().slice(0, 10);
  // AB/AD: an overdue deferral (date-based timing passed, unresolved) is
  // SHOWN to the HOM, who decides what it means. Nothing
  // promotes or fires automatically; the system shows what it noticed.
  const openDeferrals = deferrals.filter((d) => !d.resolvedAt);
  const overdueDeferrals = openDeferrals.filter((d) => d.revisitDate && d.revisitDate < today);
  // AD: the same posture for a paused decision whose timing has arrived.
  const openPaused = pausedDecisions.filter((p) => !p.resolvedAt);
  const overduePaused = openPaused.filter((p) => p.revisitDate && p.revisitDate < today);
  // Stranger-mode ruling (c): backup_hm gets the stranger projection on the
  // web field surface too, server-side, same as the mobile briefing.
  const fields = filterFields(principal.role, allFields, {
    ndaMode: hh.isNda && !principal.ndaApproved,
    strangerMode: principal.role === "backup_hm",
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
  // The label is COMPUTED per item and the two lists are capped
  // SEPARATELY, so a past-due backlog can no longer starve the forward
  // panel (the founder's ruling, 27 August 2026). `specials` keeps its
  // name because it is the same panel; what changed is that "due today"
  // is now true when it is rendered.
  const now = new Date();
  const parts = partitionPrompts(radarAll, now);
  const specials = parts.now;
  const radar = parts.upcoming;
  // A2/REQ-055: this user's answers on the surfaced prompts. Answering never
  // gates anything; an ignored prompt is itself the signal.
  const outcomes = await getPromptOutcomes(specials.map((i) => i.id), principal.userId);
  const deltasRaw = await getDeltasSince(hh.id, lastVisit ? lastVisit.receivedAt : null);
  // WK-DEV-007 s3: the SIGNALS panel. Empty until the founder flips a
  // per-trigger promotion flag; even then surfacesBeyondShadow re-asserts
  // the A0 cap (it throws above the cap, a defect worth hearing about).
  // Single-consent stands: a surfaced signal is information for the HOM
  // to weigh, never an instruction and never an action.
  const featureFlags = await readFeatureFlags(db as never);
  const shadowRecent = await db.select().from(shadowLog)
    .where(eq(shadowLog.householdId, hh.id))
    .orderBy(desc(shadowLog.evaluatedAt))
    .limit(10);
  const promotedSignals = shadowRecent.filter((s) =>
    surfacesBeyondShadow({
      triggerKey: s.triggerKey, householdId: s.householdId, signal: s.signal,
      confidence: s.confidence / 100, evidence: (s.evidence as string[]) ?? [],
      proposedClass: s.proposedClass as ShadowSignal["proposedClass"],
      inputsHash: s.inputsHash, evaluatedAt: s.evaluatedAt.toISOString(),
    }, featureFlags));
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
          {stranger && <span style={{ color: "var(--gold-bright)", fontWeight: 700 }}> | STRANGER MODE; first-visit runbook</span>}
        </div>
        <div style={{ marginTop: 8 }}>
          <Link className="pill" href="/intake" style={{ background: "var(--sage)", color: "var(--green)" }}>Intake mode</Link>
        </div>
      </div>

      {(needsNoticing.length > 0 || situations.length > 0) && (
        <>
          <div className="eyebrow">Needs noticing</div>
          <div className="card">
            {situations.map((s) => (
              <div key={s.id} className="field">
                <span className="fname">{s.label}
                  <span className="prov" style={{ marginLeft: 8 }}>
                    one situation · {s.records.length} item{s.records.length === 1 ? "" : "s"}
                  </span>
                </span>
                {s.records.map((n) => (
                  <div key={n.id} className="prov" style={{ marginLeft: 12 }}>
                    {n.reason} · {n.sourceKind}{n.deadline ? ` · by ${n.deadline}` : ""}{n.seen ? " · seen" : ""}
                  </div>
                ))}
              </div>
            ))}
            {needsNoticing.map((n) => (
              <div key={n.id} className="field">
                <span className="fname">{n.reason}
                  <span className="prov" style={{ marginLeft: 8 }}>
                    {n.sourceKind}{n.deadline ? ` · by ${n.deadline}` : ""}{n.seen ? " · seen" : ""}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

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

      <RefusalBanner reason={refused} />
      <RecordedBanner what={recorded} />
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

      {/* W-5 (STD-016 S5): flagged conditions are re-observed at EVERY
          visit, not only on the revisit date - the standard asks for more
          than the obvious mechanism, so open flags live in the briefing
          itself. Promotion candidates rise to the top; promotion raises
          attention, never a prompt. */}
      <div className="eyebrow">Flagged for revisit</div>
      {openFlags.length === 0 ? (
        <div className="note">No open condition flags. Notice something on the way through? Flag it below.</div>
      ) : (
        openFlags.map((f) => (
          <div key={f.id} className="card field">
            <span className="fname">
              {f.subject}
              {f.promotionCandidate && <span className="tag CRITICAL">MOVING FASTER THAN ASSUMED</span>}
            </span>
            <div className="fval sans" style={{ fontSize: 13 }}>{f.location}; {f.concern}</div>
            <div className="prov">
              revisit {f.revisitDate ?? f.revisitCondition}
              {f.looks.length > 0 && <> · condition {f.looks.map((l) => l.value).join(" then ")}</>}
              {f.ratePer30Days !== null && f.ratePer30Days > 0 && <> · losing {f.ratePer30Days.toFixed(1)} points per 30 days</>}
            </div>
            {/* Input spine build 1: looks and closes enqueue offline-first. */}
            <FlagLookForm householdId={hh.id} flagId={f.id} />
            <FlagCloseForm householdId={hh.id} flagId={f.id} />
          </div>
        ))
      )}
      {openDeferrals.length > 0 && (
        <div className="card" style={overdueDeferrals.length > 0 ? { borderColor: "var(--gold-bright)" } : undefined}>
          {/* AI (sync-defect sessions): resolution is available whenever a
              deferral is OPEN, independent of the revisit date; the date
              drives the overdue surfacing (the tag, the briefing), never
              the ability to resolve. Early completion is completion, and
              an open card the client can see must be closable the day the
              work is done. Overdue items sort first; nothing happens
              automatically either way. */}
          <h2>Deferrals on record</h2>
          <p className="note" style={{ marginTop: 0 }}>
            Noticed and left on purpose, still open. Resolve one whenever the
            work happens; a passed date only raises it here, you decide what
            it means.
          </p>
          {[...overdueDeferrals, ...openDeferrals.filter((d) => !overdueDeferrals.some((o) => o.id === d.id))].map((d) => (
            <div key={d.id} className="field">
              <span className="fname">
                {d.noticed}
                {overdueDeferrals.some((o) => o.id === d.id) && <span className="tag CRITICAL">PAST ITS TIMING</span>}
              </span>
              <div className="fval sans" style={{ fontSize: 13 }}>{d.reason}</div>
              <div className="prov">planned for {d.revisitDate ?? d.revisitCondition}</div>
              <ResolveButtons householdId={hh.id} kind="deferral" targetId={d.id} />
            </div>
          ))}
        </div>
      )}

      {/* WK-DEV-009 s8, Tier D: the universal escape hatch. One box, the
          HOM's words, no taxonomy; the corporate router files it. */}
      <div className="card">
        <h2>Tell Well Kept</h2>
        <p className="note" style={{ marginTop: 0 }}>
          Anything unexpected, in your own words. Say it once; we handle the
          filing. You never need to know which record it belongs in.
        </p>
        <form action={tellWellKept}>
          <input type="hidden" name="householdId" value={hh.id} />
          <input type="hidden" name="returnTo" value="/visit" />
          <input name="content" aria-label="Tell Well Kept" placeholder="the shelf in the pantry is pulling away from the wall" />
          <p><button className="act">Tell Well Kept</button></p>
        </form>
      </div>

      <div className="card">
        <h2>Flag a condition</h2>
        <p className="note" style={{ marginTop: 0 }}>
          Something worth watching, in your own words. Every flag needs a revisit
          plan: a date, or the condition that would bring you back to it.
        </p>
        {/* Input spine build 1: flag capture enqueues offline-first. */}
        <FlagCaptureForm householdId={hh.id} registries={registries.map((r) => ({ id: r.id, label: r.label }))} />
      </div>

      {/* AD (W-7): research done and then paused, logged so it is not
          lost to time. Internal; the client never sees it. When the
          timing arrives nothing happens automatically - the card marks
          it and the person decides, the Misses-panel posture. */}
      <div className="card">
        <h2>Paused decisions</h2>
        <p className="note" style={{ marginTop: 0 }}>
          Research you did and then paused. Internal; the client never sees
          this. Give it a revisit plan so it is not lost to time.
        </p>
        {openPaused.map((p) => (
          <div key={p.id} className="field">
            <span className="fname">
              {p.decision}
              {overduePaused.some((o) => o.id === p.id) && <span className="tag CRITICAL">TIMING ARRIVED</span>}
            </span>
            <div className="fval sans" style={{ fontSize: 13 }}>{p.research}</div>
            <div className="prov">revisit {p.revisitDate ?? p.revisitCondition}</div>
            <ResolveButtons householdId={hh.id} kind="pausedDecision" targetId={p.id} />
          </div>
        ))}
        <form action={createPausedDecision}>
          <input type="hidden" name="householdId" value={hh.id} />
          <input type="hidden" name="returnTo" value="/visit" />
          <input name="decision" aria-label="What is being decided" placeholder="what is being decided (replace or repair the softener)" />
          <input name="research" aria-label="What you learned" placeholder="what you learned before pausing" />
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <input name="revisitDate" aria-label="Pick it back up by" type="date" style={{ marginTop: 0 }} />
            <span className="note">or</span>
            <input name="revisitCondition" aria-label="Pick it back up when" placeholder="pick it back up when (quotes come back)" style={{ flex: 1, marginTop: 0 }} />
          </div>
          <p><button className="act">Log the pause</button></p>
        </form>
      </div>

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
        <div className="note">Nothing due or overdue.</div>
      ) : (
        specials.map((i) => (
          <div key={i.id} className="card" style={{ background: "var(--sage)", marginBottom: 8 }}>
            <div style={{ fontSize: 15, color: "var(--green)" }}>{i.itemText}</div>
            <div className="prov">{i.packName} · {promptTiming(i.fireAt, now).label}</div>
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
                  <OutcomeChoice householdId={hh.id} promptId={i.id} outcome="acted" wasNews="true" label="Good catch" />
                  <OutcomeChoice householdId={hh.id} promptId={i.id} outcome="acted" wasNews="false" label="Already on it" />
                  <OutcomeChoice householdId={hh.id} promptId={i.id} outcome="already_done" label="Already done" />
                  <OutcomeChoice householdId={hh.id} promptId={i.id} outcome="not_applicable" label="Not applicable" />
                </div>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                  <span className="prov">Dismiss:</span>
                  <OutcomeChoice householdId={hh.id} promptId={i.id} outcome="dismissed" dismissReason="wrong" label="Wrong for this home" />
                  <OutcomeChoice householdId={hh.id} promptId={i.id} outcome="dismissed" dismissReason="bad_timing" label="Bad timing" />
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {parts.nowHidden > 0 ? (
        <div className="note">
          Showing the {specials.length} oldest of {parts.nowTotal}. {parts.nowHidden} more are
          open and not shown here; the drill-in has the full list.
        </div>
      ) : null}

      <div className="eyebrow">Coming up; the anticipation engine</div>
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

      <div className="eyebrow">Signals</div>
      {promotedSignals.length === 0 ? (
        <div className="note">
          Nothing promoted. The engine watches in shadow; a signal appears here only after
          the founder promotes its trigger on scored evidence.
        </div>
      ) : (
        promotedSignals.map((s) => (
          <div key={s.id} className="card" style={{ background: "#EFE9DC", marginBottom: 8 }}>
            <div style={{ fontSize: 15, color: "var(--green)" }}>{s.signal}</div>
            <div className="prov">observed by the engine · confidence {s.confidence}% · yours to weigh, nothing acts on its own</div>
          </div>
        ))
      )}

      <div className="eyebrow">Last year at this time; repeat-season memory</div>
      {recall.length === 0 ? (
        <div className="note">
          Builds from this household&apos;s own record: recall lines appear once there is a
          year of history behind them. Not a defect; the memory is accruing now.
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
                <button className="act" name="passed" value="yes">Ran clean; PASS</button>
                <button className="act danger" name="passed" value="no">Friction found; log it</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Capture sessions 1+2: after-the-fact time and cost entry (founder
          decisions 2026-07-27). The visit close already produces the
          delivery entry automatically; these forms cover everything else:
          travel, intake, admin, and the costs (training is person-scoped now, G-111, and logs elsewhere). Hours in, never
          pay out (ADR-004). */}
      <div className="eyebrow">Time &amp; costs; after the fact</div>
      <div className="note">
        Your visit&apos;s delivery hours record themselves when you close. Log travel and
        anything else here; costs go to the household&apos;s record (QuickBooks stays the
        book of record for money).
      </div>
      <form action={createTimeEntry} className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input type="hidden" name="householdId" value={hh.id} />
        <input type="hidden" name="returnTo" value="/visit" />
        <span>
          <label htmlFor="te-cat">Time</label>
          <select key={`te-${r ?? "0"}`} id="te-cat" name="category" defaultValue="travel" className="inline">
            {["travel", "intake", "admin", "delivery"].map((c) => <option key={c}>{c}</option>)}
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
        <input type="hidden" name="returnTo" value="/visit" />
        <span>
          <label htmlFor="ce-cat">Cost</label>
          <select key={`ce-${r ?? "0"}`} id="ce-cat" name="category" defaultValue="supplies" className="inline">
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
          <input id="ce-miles" name="miles" inputMode="numeric" placeholder="–" style={{ marginTop: 0, width: 80 }} />
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
