import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { filterFields, assertClientPayloadSafe, type FieldRecord } from "@wellkept/permissions";
import { SECTION_NAMES, bindProvisions, assertNoProvisionRows, assertNoAnticipationRows } from "@wellkept/schema";
import { provisionsById, standardsSeedReviewed } from "@/lib/standards";
import { ProvisionList } from "@/app/ProvisionList";
import { getHouseholdAndPrincipalById, getFields, getOpenDots, getUpcomingPackItems, getDeltasSince, getSeasonRecall, getRegistries } from "@/lib/data";
import { latestAppliedVisit } from "@/lib/visit-command-store";
import { RegistryCard } from "@/app/RegistryCard";

export const dynamic = "force-dynamic";

/**
 * The CEO master view: preview a household THROUGH another role's projection
 * — client or HM — from the corporate seat. Read-only by construction: no
 * form posts here, no actions imported, and the data path runs the SAME
 * server-side filters the real surfaces run (filterFields by role, the
 * client payload guards live). This grants nothing new — corporate already
 * sees the full record on the drill-in; a preview is a strictly NARROWER
 * projection of it — so no extra audit is required (REQ-005 audits s3
 * reads and writes; there are neither here).
 */
export default async function RolePreview({ params }: { params: Promise<{ householdId: string; role: string }> }) {
  const { householdId, role } = await params;
  if (role !== "client" && role !== "hm") notFound();

  const { hh, principal } = await getHouseholdAndPrincipalById(householdId);
  if (!hh) return <div className="card">No household seeded.</div>;
  if (!principal) redirect("/signin");
  if (principal.role !== "corporate_admin") redirect("/oversight"); // the master view is the CEO's

  const all = await getFields(hh.id);

  const switcher = (
    <div className="card" style={{ background: "var(--green)", color: "#fff" }}>
      <div className="sans" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--sage)" }}>
        MASTER VIEW — READ-ONLY PREVIEW OF THE {role === "client" ? "CLIENT" : "HOUSE-MANAGER"} PROJECTION.
        SAME SERVER-SIDE MATRIX AS THE REAL SURFACE; NOTHING HERE IS WRITABLE.
      </div>
      <div style={{ fontSize: 20, marginTop: 4 }}>{hh.name}</div>
      <div className="row" style={{ gap: 6, marginTop: 8, justifyContent: "flex-start" }}>
        <Link className="pill" href={`/oversight/${hh.id}`}>Corporate (full record)</Link>
        <Link className="pill" href={`/oversight/${hh.id}/preview/hm`} style={role === "hm" ? { background: "var(--gold)", color: "var(--green)" } : undefined}>As house manager</Link>
        <Link className="pill" href={`/oversight/${hh.id}/preview/client`} style={role === "client" ? { background: "var(--gold)", color: "var(--green)" } : undefined}>As client</Link>
      </div>
    </div>
  );

  if (role === "client") {
    // EXACTLY the client portal's projection: render-only keys, then the
    // three payload guards live — this page continuously proves, under
    // corporate eyes, that the client projection is safe.
    const visible: FieldRecord[] = filterFields("client", all).map((f) => ({
      id: f.id, section: f.section, name: f.name, value: f.value,
      flag: f.flag, sensitivity: f.sensitivity,
    }));
    assertClientPayloadSafe(visible);
    assertNoProvisionRows(visible);
    assertNoAnticipationRows(visible);

    const latest = await latestAppliedVisit(hh.id);
    const payload = (latest?.payload ?? {}) as { report?: string[]; photoIds?: string[] };
    const captured = visible.filter((f) => f.value);
    const uncapturedCount = visible.length - captured.length;
    const summary = captured.find((f) => String(f.name).startsWith("Household summary paragraph"));
    const flagged = captured.filter((f) => f.flag && f.flag !== "none" && f !== summary);
    const rest = captured.filter((f) => f !== summary && !flagged.includes(f));

    return (
      <>
        {switcher}
        <div className="card">
          <h2>Latest visit report</h2>
          {!latest ? (
            <div className="note">No visit report yet. During the pilot, the printed report remains the record.</div>
          ) : (
            <>
              {(payload.report ?? []).map((sentence, i) => (
                <div key={i} className="fval" style={{ lineHeight: 1.7 }}>{sentence}</div>
              ))}
              <div className="prov">{(payload.photoIds ?? []).length} photo(s) attached · photo-supported report</div>
            </>
          )}
        </div>
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
              <div key={String(f.id)} className="field">
                <span className="fname">{String(f.name).split(":")[0]}<span className={`tag ${String(f.flag)}`}>{String(f.flag)}</span></span>
                <div className="fval">{String(f.value)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="card">
          <h2>Your Playbook</h2>
          {rest.length === 0 && !summary && flagged.length === 0 ? (
            <div className="note">The client sees entries appear here as they&apos;re captured and confirmed.</div>
          ) : (
            [...new Set(rest.map((f) => f.section as number))].sort((a, b) => a - b).map((sec) => (
              <div key={sec}>
                <div className="eyebrow">{SECTION_NAMES[sec] ?? `Section ${sec}`}</div>
                {rest.filter((f) => f.section === sec).map((f) => (
                  <div key={String(f.id)} className="field">
                    <span className="fname">{String(f.name).split(":")[0]}</span>
                    <div className="fval">{String(f.value)}</div>
                  </div>
                ))}
              </div>
            ))
          )}
          {uncapturedCount > 0 && (
            <div className="note">…and {uncapturedCount} more still to capture (the client sees one quiet line, never empty prompts).</div>
          )}
        </div>
        <div className="note">
          Not shown to the client, by policy: dots, prompts, recall, provisions, s2/s3,
          incidents, photos. The guards proving that ran live rendering this page.
        </div>
      </>
    );
  }

  // role === "hm": the pre-visit briefing as an assigned HM sees it.
  // NDA households: previewed as an NDA-APPROVED house manager (the normal
  // assignment); an unapproved cover sees less.
  const [dots, packItems, lastVisit, seedReviewed, recall] = await Promise.all([
    getOpenDots(hh.id),
    getUpcomingPackItems(hh.id),
    latestAppliedVisit(hh.id),
    standardsSeedReviewed(),
    getSeasonRecall(hh.id),
  ]);
  const fields = filterFields("house_manager", all, { ndaMode: false });
  const provisions = provisionsById();
  const provisionsFor = (f: Record<string, unknown>) =>
    bindProvisions(f["governingProvisions"] as string[] | null, provisions, "hm", seedReviewed);
  const flaggedHm = fields.filter((f) => f.flag && f.flag !== "none");
  const lifeEvent = hh.statusTag === "LIFE-EVENT";
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const radarAll = packItems.filter((i) => !i.suppressedByTag);
  const specials = radarAll.filter((i) => i.fireAt <= endOfToday);
  const radar = radarAll.filter((i) => i.fireAt > endOfToday);
  const deltasRaw = await getDeltasSince(hh.id, lastVisit ? lastVisit.receivedAt : null);
  const visibleIds = new Set(fields.map((f) => String(f.id)));
  const deltas = deltasRaw.filter((d) => visibleIds.has(d.id) && d.value).slice(-6);
  const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return (
    <>
      {switcher}
      {hh.isNda && <div className="note">NDA household — previewed as an NDA-approved house manager; an unapproved cover sees less.</div>}
      <div className="eyebrow">Flags first</div>
      {flaggedHm.length === 0 ? (
        <div className="note">No flagged fields on this record yet.</div>
      ) : (
        flaggedHm.map((f) => (
          <div key={String(f.id)} className={`card field ${String(f.flag)}`}>
            <span className="fname">{f.name}<span className={`tag ${String(f.flag)}`}>{String(f.flag)}</span></span>
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
            <div className="prov">{i.packName} · due today · answer buttons exist only in the field app</div>
          </div>
        ))
      )}
      <div className="eyebrow">Coming up — the anticipation engine</div>
      {lifeEvent ? (
        <div className="note">Held. LIFE-EVENT pauses every prompt; nothing is deleted.</div>
      ) : radar.length === 0 ? (
        <div className="note">Nothing scheduled in the window.</div>
      ) : (
        radar.map((i) => (
          <div key={i.id} className="card" style={{ background: "#F3EAD2", marginBottom: 8 }}>
            <div style={{ fontSize: 15, color: "var(--green)" }}>{i.itemText}</div>
            <div className="prov">{i.packName} · fires {fmtDay(i.fireAt)}</div>
          </div>
        ))
      )}
      <div className="eyebrow">Last year at this time — repeat-season memory</div>
      {recall.length === 0 ? (
        <div className="note">
          Builds from this household&apos;s own record: recall lines appear once there is a
          year of history behind them. Exclusions you set on the drill-in filter this list.
        </div>
      ) : (
        <div className="card">
          {recall.map((r) => (
            <div key={r.id} className="field">
              <div className="fval sans" style={{ fontSize: 14 }}>{r.summary}</div>
              <div className="prov">recall · from a {r.anchorKind.replace(/_/g, " ")} on {fmtDay(r.observedAt)} {r.observedAt.getFullYear()} · fact, not a prompt</div>
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
      <div className="note">
        The close flow, stranger-test form, and prompt answers exist only on the real
        field surfaces — this preview shows what the HM reads, not what they do.
      </div>
    </>
  );
}
