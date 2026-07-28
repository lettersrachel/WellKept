import type { RegistryKind } from "@wellkept/schema";

const KIND_LABELS: Record<RegistryKind, string> = {
  dates: "Important dates",
  sizes: "Sizes",
  appliance: "Appliances & equipment",
  vendor: "Vendors & services",
  subscription: "Subscriptions",
  commitment: "Commitments",
  horizon: "The horizon",
};

interface Entry {
  id: string;
  kind: RegistryKind | string;
  label: string;
  detail: unknown;
  keyDate: Date | null;
  cadence: string | null;
  sensitivity: string;
  // G-49 part two: typed horizon inputs (optional; sweep derives dates).
  installedAt?: Date | null;
  lifespanMonths?: number | null;
  maintenanceIntervalMonths?: number | null;
  lastServicedAt?: Date | null;
}

interface Observation {
  id: string;
  measure: string;
  value: number;
  observedAt: Date;
}

/** REQ-014: one renderer for the structured registries, shared by the
 * client and corporate surfaces — what differs is only the (already
 * permission-filtered) rows each receives. The observation series and its
 * entry form (G-49) appear ONLY when a staff surface passes them; client
 * pages pass neither, so the series never renders there. */
export function RegistryCard({ entries, showSensitivity = false, series, observe, supersede, returnTo, householdId }: {
  entries: Entry[];
  showSensitivity?: boolean;
  series?: Map<string, Observation[]>;
  observe?: (formData: FormData) => Promise<void>;
  supersede?: (formData: FormData) => Promise<void>;
  returnTo?: string;
  householdId?: string;
}) {
  if (entries.length === 0) return null;
  const kinds = [...new Set(entries.map((e) => e.kind))];
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  return (
    <div className="card">
      <h2>Registries</h2>
      {kinds.map((kind) => (
        <div key={kind}>
          <div className="eyebrow">{KIND_LABELS[kind as RegistryKind] ?? kind}</div>
          {entries
            .filter((e) => e.kind === kind)
            .map((e) => {
              const d = (e.detail ?? {}) as Record<string, unknown>;
              const bits = [
                d.size && `${d.size}`,
                d.rhythm && `${d.rhythm}`,
                d.filterSize && `filter ${d.filterSize}`,
                d.installYear && `installed ${d.installYear}`,
                d.what && `${d.what}`,
                d.window && `${d.window}`,
                e.keyDate && fmt(e.keyDate),
                e.cadence,
                e.installedAt && `installed ${fmt(e.installedAt)}`,
                e.lifespanMonths && `${e.lifespanMonths}mo lifespan`,
                e.lastServicedAt && `serviced ${fmt(e.lastServicedAt)}`,
                e.maintenanceIntervalMonths && `service every ${e.maintenanceIntervalMonths}mo`,
              ].filter(Boolean);
              // G-49: a series reads as its trajectory — "condition 4 → 3"
              // is the prediction a single state can never be.
              const trend = (["condition", "fill_level"] as const).map((m) => {
                const obs = series?.get(`${e.id}:${m}`) ?? [];
                if (obs.length === 0) return null;
                const path = [...obs].reverse().map((o) => o.value).join(" → ");
                return `${m === "condition" ? "condition" : "fill"} ${path}${m === "fill_level" ? "%" : "/5"}`;
              }).filter(Boolean);
              return (
                <div key={e.id} className="field">
                  <span className="fname">
                    {e.label}
                    {showSensitivity && e.sensitivity !== "s1" && (
                      <span className={`tag ${e.sensitivity}`}>{e.sensitivity.toUpperCase()}</span>
                    )}
                  </span>
                  <div className="fval sans" style={{ fontSize: 13 }}>{bits.join(" · ")}</div>
                  {trend.length > 0 && (
                    <div className="fval sans" style={{ fontSize: 12, opacity: 0.85 }}>
                      {trend.join(" · ")}
                      {/* W-1: the latest look is correctable — supersede, never
                          delete. Only the newest row gets the control; older
                          rows are history the next look already answered. */}
                      {supersede && householdId && (["condition", "fill_level"] as const).map((m) => {
                        const latest = series?.get(`${e.id}:${m}`)?.[0];
                        if (!latest) return null;
                        return (
                          <form key={`sup-${e.id}-${m}`} action={supersede} style={{ display: "inline", marginLeft: 6 }}>
                            <input type="hidden" name="householdId" value={householdId} />
                            <input type="hidden" name="observationId" value={latest.id} />
                            {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
                            <button className="act" style={{ fontSize: 11 }} title={`Mark the latest ${m === "condition" ? "condition" : "fill"} look (${latest.value}) as entered in error; the row is kept but leaves the series.`}>
                              supersede last {m === "condition" ? "condition" : "fill"}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  )}
                  {observe && householdId && (
                    <form action={observe} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                      <input type="hidden" name="householdId" value={householdId} />
                      <input type="hidden" name="registryEntryId" value={e.id} />
                      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
                      <select key={`om-${e.id}-${(series?.get(`${e.id}:condition`)?.length ?? 0) + (series?.get(`${e.id}:fill_level`)?.length ?? 0)}`} name="measure" defaultValue="condition" className="inline" aria-label="Measure">
                        {/* W-4: the direction is printed at the point of entry
                            (founder decision 2026-07-28) — two HMs reading
                            "3 of 5" oppositely is the calibration failure the
                            Stranger Test exists to surface. */}
                        <option value="condition">condition 1-5 (5 = like new, 1 = failing)</option>
                        <option value="fill_level">fill % (100 = full)</option>
                      </select>
                      <input name="value" aria-label="Value" placeholder="value" inputMode="numeric" style={{ width: 64, marginTop: 0 }} />
                      <input name="note" aria-label="Note (internal, s2)" placeholder="note (optional, s2)" style={{ flex: 1, marginTop: 0 }} />
                      <button className="act">Log look</button>
                    </form>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
