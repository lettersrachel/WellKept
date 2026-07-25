import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { triggerRule } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";
import { getPrincipal } from "@/lib/session";
import { setTriggerRuleEnabled, createTriggerRule } from "@/lib/actions";

export const dynamic = "force-dynamic";

interface RuleDef { packName?: string; items?: { offsetDays: number; text: string; methodRef?: string | null }[] }

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
        return (
          <div className="card" key={r.id} style={r.enabled ? undefined : { opacity: 0.65 }}>
            <div className="row" style={{ alignItems: "baseline" }}>
              <h2 style={{ border: "none", margin: 0, padding: 0, flex: 1 }}>
                {def.packName ?? "(unnamed pack)"}
                <span className="pill" style={{ marginLeft: 8 }}>{r.family}</span>
                {!r.enabled && <span className="tag s2">DISABLED</span>}
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
