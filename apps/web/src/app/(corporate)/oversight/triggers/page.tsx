import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { appSetting, household, incidentReport, promptOutcome, promptPackItem, triggerRule } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";
import { getPrincipal } from "@/lib/session";
import { setTriggerRuleEnabled, createTriggerRule } from "@/lib/actions";

export const dynamic = "force-dynamic";
// Headroom over Vercel's ~10s default (2026-07-27, see drill-in note): a slow
// dependency must degrade the page, not silently truncate it mid-stream.
export const maxDuration = 60;

interface RuleDef { packName?: string; items?: { offsetDays: number; text: string; methodRef?: string | null }[] }

interface RuleHealth {
  fired: number; answered: number; acted: number; notApplicable: number;
  alreadyDone: number; actedNews: number; actedNewsKnown: number;
  leads: number[]; households: Set<string>; users: Set<string>;
}

/**
 * A2/REQ-055 rule health, trailing 90 days. fired_count reads the PROMPT
 * table, never outcomes — an ignored rule must not look clean (finding 3).
 * The retirement thresholds are founder policy shipped as configuration
 * (app_setting `rule_health`), not constants (finding 4).
 */
async function ruleHealthByRule(now: Date) {
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fired = await db.select({ ruleId: promptPackItem.triggerRuleId })
    .from(promptPackItem)
    .where(and(gte(promptPackItem.fireAt, since), lte(promptPackItem.fireAt, now), eq(promptPackItem.suppressedByTag, false)));
  const answers = await db.select().from(promptOutcome).where(gte(promptOutcome.answeredAt, since));
  const [cfgRow] = await db.select().from(appSetting).where(eq(appSetting.key, "rule_health"));
  // Session A: informativeRateFloor is DELIBERATELY absent from the
  // defaults (founder decision 2026-07-27 — set it after real numbers).
  // Until the knob carries it, no rule gets a retirement flag; act rate is
  // display only either way.
  const cfg = {
    actRateFloor: 0.25, minHouseholds: 3, minUsers: 2,
    ...(cfgRow?.value as object | undefined),
  } as { actRateFloor: number; minHouseholds: number; minUsers: number; informativeRateFloor?: number };

  const health = new Map<string, RuleHealth>();
  const get = (ruleId: string) => {
    let h = health.get(ruleId);
    if (!h) { h = { fired: 0, answered: 0, acted: 0, notApplicable: 0, alreadyDone: 0, actedNews: 0, actedNewsKnown: 0, leads: [], households: new Set(), users: new Set() }; health.set(ruleId, h); }
    return h;
  };
  for (const f of fired) get(f.ruleId).fired += 1;
  for (const a of answers) {
    const h = get(a.ruleId);
    h.answered += 1;
    if (a.outcome === "acted") {
      h.acted += 1;
      if (a.leadDays !== null) h.leads.push(a.leadDays);
      // Session A: informative = acted AND news. Historical acted rows have
      // was_news null and are excluded from the known-denominator, never
      // counted either way (the metric ignores nulls, it doesn't guess).
      if (a.wasNews !== null) { h.actedNewsKnown += 1; if (a.wasNews) h.actedNews += 1; }
    }
    if (a.outcome === "not_applicable") h.notApplicable += 1;
    if (a.outcome === "already_done") h.alreadyDone += 1;
    h.households.add(a.householdId);
    h.users.add(a.userId);
  }
  return { health, cfg };
}

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2]! : Math.round((s[s.length / 2 - 1]! + s[s.length / 2]!) / 2);
};

const pct = (n: number, d: number) => (d === 0 ? "–" : `${Math.round((n / d) * 100)}%`);

/**
 * REQ-045: the trigger library, administered. The library was always data
 * (corporate-edited, versioned); this surface lists every rule with its
 * steps and method refs, retires by disabling (rules never hard-delete),
 * and creates fleet-level rules with the definition validated before it
 * can reach the engine. The three original cascades and the sweep's
 * synthetic families all show here.
 */
export default async function TriggersPage() {
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) redirect("/");
  const anchor = corporate[0]!.hh.id;
  const isAdmin = (await getPrincipal(anchor))?.role === "corporate_admin";

  const rules = await db.select().from(triggerRule).orderBy(asc(triggerRule.createdAt));
  const { health, cfg } = await ruleHealthByRule(new Date());

  // Session B: the Misses panel reads resolved incidents whose resolver
  // answered no_prompt_existed, grouped by what the incident was about.
  const misses = await db.select({
    id: incidentReport.id, kind: incidentReport.kind, severity: incidentReport.severity,
    description: incidentReport.description, occurredAt: incidentReport.occurredAt,
    householdName: household.name,
  })
    .from(incidentReport)
    .innerJoin(household, eq(incidentReport.householdId, household.id))
    .where(eq(incidentReport.preventableByPrompt, "no_prompt_existed"))
    .orderBy(asc(incidentReport.occurredAt));
  const missesByKind = new Map<string, typeof misses>();
  for (const m of misses) {
    if (!missesByKind.has(m.kind)) missesByKind.set(m.kind, []);
    missesByKind.get(m.kind)!.push(m);
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: "center", gap: 10 }}>
          <h2 style={{ border: "none", margin: 0, padding: 0, flex: 1 }}>
            Trigger library — {rules.length} rule(s), {rules.filter((r) => r.enabled).length} enabled
          </h2>
          <Link className="pill" href="/oversight">Fleet board</Link>
        </div>
        <div className="note">
          Rules are versioned corporate content (WK-DEV-005 S4). Disable is the retirement
          path; nothing hard-deletes. A step&apos;s method ref points at the standards store;
          an empty ref is a finding, not an error (Addendum A1 S4).
        </div>
      </div>

      {rules.map((r) => {
        const def = r.definition as RuleDef;
        const h = health.get(r.id);
        const actRate = h && h.answered > 0 ? h.acted / h.answered : null;
        // Session A: informative rate = acted-and-news over fired (roadmap
        // item A). A rule that reminds people of what they already planned
        // scores act-rate green and informative-rate zero — the difference
        // is the whole point.
        const informativeRate = h && h.fired > 0 ? h.actedNews / h.fired : null;
        // Both guards required (A2): never retire a fleet rule on the
        // evidence of one household or one HM having a bad month. Session A
        // demotes act rate to display: retirement keys ONLY to the
        // informative floor, and only once the founder sets it in the knob.
        const retirementCandidate = h !== undefined && informativeRate !== null
          && cfg.informativeRateFloor !== undefined
          && informativeRate < cfg.informativeRateFloor
          && h.households.size >= cfg.minHouseholds
          && h.users.size >= cfg.minUsers;
        const medianLead = h ? median(h.leads) : null;
        return (
          <div className="card" key={r.id} style={r.enabled ? undefined : { opacity: 0.65 }}>
            <div className="row" style={{ alignItems: "baseline" }}>
              <h2 style={{ border: "none", margin: 0, padding: 0, flex: 1 }}>
                {def.packName ?? "(unnamed pack)"}
                <span className="pill" style={{ marginLeft: 8 }}>{r.family}</span>
                {!r.enabled && <span className="tag s2">DISABLED</span>}
                {retirementCandidate && <span className="tag CAUTION">RETIREMENT CANDIDATE</span>}
              </h2>
              {isAdmin && (
                <form action={setTriggerRuleEnabled}>
                  <input type="hidden" name="ruleId" value={r.id} />
                  <input type="hidden" name="anchorHouseholdId" value={anchor} />
                  <input type="hidden" name="enabled" value={(!r.enabled).toString()} />
                  <button className={`act subtle${r.enabled ? " danger" : ""}`}>
                    {r.enabled ? "Disable" : "Enable"}
                  </button>
                </form>
              )}
            </div>
            <div className="prov">
              binds to fields matching &ldquo;{r.bindsToFieldName ?? "(none)"}&rdquo;
              {r.householdId ? " · household-scoped" : " · fleet-level"}
            </div>
            {/* A2/REQ-055 rule health, trailing 90d. Retirement is evidence
                for the founder's decision, never an automatic act. */}
            <div className="prov">
              health 90d: fired {h?.fired ?? 0} · answered {h?.answered ?? 0}
              {" · "}informative {pct(h?.actedNews ?? 0, h?.fired ?? 0)}
              {(h?.acted ?? 0) > (h?.actedNewsKnown ?? 0) && ` (news data on ${h!.actedNewsKnown} of ${h!.acted} acted)`}
              {" · "}act {pct(h?.acted ?? 0, h?.answered ?? 0)}
              {" · "}ignored {pct((h?.fired ?? 0) - (h?.answered ?? 0), h?.fired ?? 0)}
              {" · "}n/a {pct(h?.notApplicable ?? 0, h?.answered ?? 0)}
              {" · "}already done {pct(h?.alreadyDone ?? 0, h?.answered ?? 0)}
              {medianLead !== null && ` · median lead ${medianLead}d (n=${h!.leads.length})`}
              {" · "}{h?.households.size ?? 0} household(s), {h?.users.size ?? 0} user(s)
            </div>
            {(def.items ?? []).map((item, i) => (
              <div className="field" key={i}>
                <span className="fname">T+{item.offsetDays}d</span>
                <div className="fval">{item.text}</div>
                <div className="prov">{item.methodRef ? `method: ${item.methodRef}` : "no method ref (a finding, per the addendum)"}</div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Session B: the Misses panel — incidents the resolver marked
          no_prompt_existed. The only false-negative stream the business
          gets; this list IS the rule library's backlog. Never inferred. */}
      <div className="card">
        <h2>Misses — incidents no prompt existed for</h2>
        {misses.length === 0 ? (
          <div className="note">
            None recorded. Rows appear when an incident is resolved with
            &ldquo;no prompt existed&rdquo; — the question is asked (and skippable)
            on the incident resolution form.
          </div>
        ) : (
          Array.from(missesByKind.entries()).map(([kind, rows]) => (
            <div key={kind} style={{ marginBottom: 8 }}>
              <div className="eyebrow">{kind.replace(/_/g, " ")} · {rows.length}</div>
              {rows.map((m) => (
                <div className="field" key={m.id}>
                  <span className="fname">{m.householdName}</span>
                  <div className="fval">{m.description.length > 140 ? `${m.description.slice(0, 140)}…` : m.description}</div>
                  <div className="prov">
                    occurred {m.occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}
                    {" · "}severity {m.severity} · resolved
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {isAdmin && (
        <div className="card">
          <h2>New fleet-level rule</h2>
          <form action={createTriggerRule}>
            <input type="hidden" name="anchorHouseholdId" value={anchor} />
            <div className="row" style={{ gap: 8 }}>
              <span style={{ flex: 1 }}>
                <label htmlFor="tr-family">Family</label>
                <select id="tr-family" name="family" defaultValue="calendar">
                  {["roster_age", "calendar", "threshold", "signal", "relationship", "external"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </span>
              <span style={{ flex: 1 }}>
                <label htmlFor="tr-binds">Binds to field name containing</label>
                <input id="tr-binds" name="bindsToFieldName" placeholder="e.g. school" required />
              </span>
              <span style={{ flex: 1 }}>
                <label htmlFor="tr-pack">Pack name (kebab-case)</label>
                <input id="tr-pack" name="packName" placeholder="e.g. new-pet-welcome" required />
              </span>
            </div>
            <label htmlFor="tr-items">Steps, one per line: offsetDays | prompt text | optional provision id</label>
            <textarea
              id="tr-items"
              name="items"
              rows={4}
              required
              placeholder={"7 | Confirm the welcome kit is stocked. | STD-009.3.1\n30 | Ask how the first month has gone."}
            />
            <button className="act" style={{ marginTop: 8 }}>Create rule (enabled)</button>
            <div className="note">
              Validated before it can reach the engine: 1-10 steps, 0-365 day offsets, real
              provision ids only, no em dashes in prompt text (DEV-005).
            </div>
          </form>
        </div>
      )}
    </>
  );
}
