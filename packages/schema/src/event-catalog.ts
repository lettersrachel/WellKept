/**
 * Q-3b: the domain-event family catalog, adopted VERBATIM from the
 * withdrawn RFC-001 §3a through RFC-ATTR-01 Amendment 1 §A1.3 (the
 * estimate-hierarchy verbatim-adoption pattern: the list is the ruled
 * document's own, not invented here).
 *
 * This is a FORWARD namespace. The live s4 kinds (`work_item.*`,
 * `work_requirement.*`, `decision_record.*`, `visit.*`,
 * `field.changed`, ...) predate the catalog, are deliberately OUTSIDE
 * it, and stay legal: renaming shipped kinds would be a
 * shipped-semantics change nobody ruled. New consumers (the Q-12b
 * reconciliation layer first) name their kinds inside a family, and
 * the drain consumes a family kind exactly as it consumes any
 * registered kind, keyed on the full kind string.
 *
 * `delight.*` is present because dropping a name would be editing the
 * adopted list; the Delight EPIC itself is held post-E4 (the benchmark
 * adoption record). A reserved name is not a build.
 */

export const EVENT_FAMILIES = [
  "capture",
  "knowledge",
  "expectation",
  "source",
  "commitment",
  "changeset",
  "work",
  "decision",
  "vendor",
  "ai",
  "delight",
] as const;

export type EventFamily = (typeof EVENT_FAMILIES)[number];

const FAMILY_SET: ReadonlySet<string> = new Set(EVENT_FAMILIES);

/**
 * The catalog family a kind belongs to, or null: `expectation.opened`
 * resolves to `expectation`; `work_item.opened` resolves to null,
 * because `work_item` is a legacy s4 namespace, not the RFC-001
 * `work` family, and the boundary is honest rather than fuzzy.
 */
export function catalogFamilyOf(kind: string): EventFamily | null {
  const dot = kind.indexOf(".");
  if (dot <= 0) return null;
  const family = kind.slice(0, dot);
  return FAMILY_SET.has(family) ? (family as EventFamily) : null;
}

export function isCatalogKind(kind: string): boolean {
  return catalogFamilyOf(kind) !== null;
}
