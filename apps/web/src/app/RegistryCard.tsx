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
}

/** REQ-014: one renderer for the structured registries, shared by the
 * client and corporate surfaces — what differs is only the (already
 * permission-filtered) rows each receives. */
export function RegistryCard({ entries, showSensitivity = false }: { entries: Entry[]; showSensitivity?: boolean }) {
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
              ].filter(Boolean);
              return (
                <div key={e.id} className="field">
                  <span className="fname">
                    {e.label}
                    {showSensitivity && e.sensitivity !== "s1" && (
                      <span className={`tag ${e.sensitivity}`}>{e.sensitivity.toUpperCase()}</span>
                    )}
                  </span>
                  <div className="fval sans" style={{ fontSize: 13 }}>{bits.join(" · ")}</div>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
