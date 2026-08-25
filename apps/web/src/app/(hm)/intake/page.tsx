import Link from "next/link";
import { redirect } from "next/navigation";
import { SECTION_NAMES, bindProvisions } from "@wellkept/schema";
import { getFieldHouseholdAndPrincipal, getFields } from "@/lib/data";
import { provisionsById, standardsSeedReviewed } from "@/lib/standards";
import { captureField } from "@/lib/actions";
import { RefusalBanner } from "@/components/RefusalBanner";
import { RecordedBanner } from "@/components/RecordedBanner";
import { ProvisionList } from "../../ProvisionList";

export const dynamic = "force-dynamic";

const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);

/**
 * Intake mode: the in-app walk-through that replaces the intake workbook
 * for a single household. The 258-field template is already seeded; this
 * screen fills it in, one field at a time, with the same provenance,
 * sensitivity and flag vocabulary the importer enforces. Each save is a
 * full audited field write (captureField), so triggers, standards and the
 * briefing light up as capture progresses. s3 fields take no value here:
 * secured values go to the vault through corporate (REQ-013).
 */
export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; refused?: string; recorded?: string }>;
}) {
  const { hh, principal } = await getFieldHouseholdAndPrincipal();
  if (!hh) return <div className="card">No household seeded. Run `pnpm db:seed`.</div>;
  if (!principal) redirect("/signin");
  if (!FIELD_ROLES.has(principal.role)) redirect("/");

  const [fields, seedReviewed] = await Promise.all([getFields(hh.id), standardsSeedReviewed()]);
  const provisionsFor = (f: Record<string, unknown>) =>
    bindProvisions(f["governingProvisions"] as string[] | null, provisionsById(), "hm", seedReviewed);

  const { section, refused, recorded } = await searchParams;
  const sectionNum = section ? Number(section) : null;
  const captured = fields.filter((f) => f.value).length;

  const bySection = new Map<number, typeof fields>();
  for (const f of fields) {
    if (!bySection.has(f.section)) bySection.set(f.section, []);
    bySection.get(f.section)!.push(f);
  }
  const sections = [...bySection.keys()].sort((a, b) => a - b);

  if (sectionNum === null || !bySection.has(sectionNum)) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <RefusalBanner reason={refused} />
        <RecordedBanner what={recorded} />
        <div className="card" style={{ background: "var(--green)", color: "#fff" }}>
          <div className="sans" style={{ fontSize: 11, color: "var(--sage)", letterSpacing: "0.1em" }}>
            INTAKE MODE
          </div>
          <div style={{ fontSize: 22, marginTop: 4 }}>{hh.name}</div>
          <div className="sans" style={{ fontSize: 12, color: "var(--sage)", marginTop: 2 }}>
            {captured} of {fields.length} fields captured
          </div>
        </div>
        <div className="card">
          <div className="note">
            Walk the house section by section. Blank is honest; a guess is not. Secured (s3)
            values never go in here: mark the field s3 and the real value goes to the vault
            through corporate.
          </div>
          {sections.map((s) => {
            const fs = bySection.get(s)!;
            const done = fs.filter((f) => f.value).length;
            return (
              <div key={s} className="field" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <Link href={`/intake?section=${s}`} style={{ color: "var(--green)", fontWeight: "bold" }}>
                  S{s} · {SECTION_NAMES[s] ?? `Section ${s}`}
                </Link>
                <span className={`pill${done === fs.length ? "" : ""}`} style={done === fs.length ? { background: "var(--sage)" } : undefined}>
                  {done}/{fs.length}
                </span>
              </div>
            );
          })}
        </div>
        <div className="note" style={{ textAlign: "center" }}>
          <Link href="/visit">Back to the briefing</Link>
        </div>
      </div>
    );
  }

  const fs = bySection.get(sectionNum)!;
  const idx = sections.indexOf(sectionNum);
  const prev = sections[idx - 1];
  const next = sections[idx + 1];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <RefusalBanner reason={refused} />
      <RecordedBanner what={recorded} />
      <div className="card" style={{ background: "var(--green)", color: "#fff" }}>
        <div className="sans" style={{ fontSize: 11, color: "var(--sage)", letterSpacing: "0.1em" }}>
          INTAKE MODE · {hh.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 20, marginTop: 4 }}>
          S{sectionNum} · {SECTION_NAMES[sectionNum] ?? "Section"}
        </div>
        <div className="sans" style={{ fontSize: 12, color: "var(--sage)", marginTop: 2 }}>
          {fs.filter((f) => f.value).length} of {fs.length} captured in this section
        </div>
      </div>

      <div className="row" style={{ justifyContent: "space-between", margin: "8px 0" }}>
        <Link className="pill" href="/intake">All sections</Link>
        <span className="row" style={{ gap: 6 }}>
          {prev !== undefined && <Link className="pill" href={`/intake?section=${prev}`}>Prev S{prev}</Link>}
          {next !== undefined && <Link className="pill" href={`/intake?section=${next}`}>Next S{next}</Link>}
        </span>
      </div>

      {fs.map((f) => (
        <div key={f.id} className={`card field ${f.flag !== "none" ? f.flag : ""}`}>
          <span className="fname">
            {f.name}
            {f.sensitivity !== "s1" && <span className={`tag ${f.sensitivity}`}>{f.sensitivity.toUpperCase()}</span>}
            {f.flag !== "none" && <span className={`tag ${f.flag}`}>{f.flag}</span>}
            {!f.value && <span className="prov"> · not yet captured</span>}
          </span>
          <form action={captureField}>
            <input type="hidden" name="fieldId" value={f.id} />
            {/* G-68: the section rides with the write so the confirmation
                comes back to the section being walked, not the index. */}
            <input type="hidden" name="section" value={sectionNum} />
            {f.sensitivity === "s3" ? (
              <div className="note">
                Secured field: the value lives in the vault, set by corporate. Capture the note
                and flags here only.
              </div>
            ) : (
              <textarea
                name="value"
                rows={2}
                defaultValue={f.value}
                aria-label={`Value for ${f.name}`}
                placeholder="Blank means not asked yet. N/A-confirmed is an answer."
              />
            )}
            <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <select name="provenance" defaultValue={["asked", "observed", "verified_by_touch"].includes(f.provenance) ? f.provenance : "asked"} className="inline" aria-label="How you know">
                <option value="asked">asked</option>
                <option value="observed">observed</option>
                <option value="verified_by_touch">verified by touch</option>
              </select>
              <select name="sensitivity" defaultValue={f.sensitivity} className="inline" aria-label="Sensitivity">
                <option value="s1">s1 · client-visible</option>
                <option value="s2">s2 · staff only</option>
                <option value="s3">s3 · vault</option>
              </select>
              <select name="flag" defaultValue={f.flag} className="inline" aria-label="Flag">
                <option value="none">no flag</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="CAUTION">CAUTION</option>
                <option value="DELIGHT">DELIGHT</option>
              </select>
            </div>
            <label className="sans" style={{ display: "block", fontWeight: "normal", fontSize: 12, marginTop: 6 }}>
              <input type="checkbox" name="strangerVisible" defaultChecked={f.strangerVisible} />{" "}
              Visible in stranger mode (a covering stranger must know this; matters for staff-only fields)
            </label>
            <input name="note" defaultValue={f.note} aria-label="Note for a covering stranger" placeholder="Note a covering stranger would need" style={{ marginTop: 6 }} />
            <button className="act subtle" style={{ marginTop: 6 }}>Save</button>
          </form>
          <ProvisionList provisions={provisionsFor(f)} />
        </div>
      ))}

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 24 }}>
        <Link className="pill" href="/intake">All sections</Link>
        {next !== undefined && <Link className="pill" href={`/intake?section=${next}`}>Next S{next}</Link>}
      </div>
    </div>
  );
}
