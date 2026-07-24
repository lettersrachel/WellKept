import type { BoundProvision } from "@wellkept/schema";

/**
 * Bound provisions beneath a field (brief T4): collapsed by default, floors
 * in the red-block treatment, method/preference quiet. Server-rendered; the
 * collapse is a plain <details>, no client JS. A field with no (visible)
 * provisions renders nothing at all.
 */
export function ProvisionList({ provisions }: { provisions: BoundProvision[] }) {
  if (provisions.length === 0) return null;
  const floors = provisions.filter((p) => p.treatment === "red-block").length;
  return (
    <details className="provisions">
      <summary className="prov" style={{ cursor: "pointer" }}>
        The standard behind this field ({provisions.length}
        {floors > 0 ? `, ${floors} floor${floors === 1 ? "" : "s"}` : ""})
      </summary>
      {provisions.map((p) => (
        <div key={p.id} className={`provision ${p.treatment === "red-block" ? "floor" : "quiet"}`}>
          <span className="pid">
            {p.id}
            {p.treatment === "red-block" && <span className="tag FLOOR">FLOOR</span>}
          </span>
          <div className="ptext">{p.text}</div>
          {p.sourceNote ? <div className="psource">Source: {p.sourceNote}</div> : null}
        </div>
      ))}
    </details>
  );
}
