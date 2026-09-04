/**
 * Q-6-1: reading the Decision Rights seed from the FROZEN values package
 * rather than restating its figures in source.
 *
 * The founder's ruling, and the reason it is better than a TypeScript
 * constant: the figures entered the repository once, under the 4
 * September intake that froze and hash-pinned the file, so no second
 * copy exists to drift from the first. This module is a PURE reader over
 * `docs/intake/2026-09-04-founder-values/decision_rights_by_tier.csv`.
 * Nothing here touches a database.
 *
 * FROZEN FILES ARE NEVER EDITED. Every disagreement between the source's
 * vocabulary and the shipped one is resolved by MAPPING here, named, with
 * its reason. Three of them exist and each is proven by name.
 */

/** The shipped tier vocabulary. The CSV's header says `family_operations`. */
const TIER_COLUMN: Record<string, string> = {
  // Adoption MAPS, never renames (the status-tag ruling, now the second
  // instance in this same package). Neither side is edited: the shipped
  // enum keeps `family_ops` and the frozen CSV keeps its own header.
  essential: "essential",
  family_ops: "family_operations",
  concierge: "concierge",
};

/**
 * The materiality column carries two values the SIGNED three-value enum
 * cannot store, and the enum is not widened to fit them. Each is named
 * here with its reason, so the NULL in the row is a recorded decision
 * rather than a parse that gave up.
 */
export const MATERIALITY_NOT_A_MATERIALITY: Record<string, string> = {
  all: "the source says this right applies across ALL materialities, which is a statement about scope rather than a fourth class. A materiality of 'all' is a different question and is the founder's, not a value to invent here.",
  "": "the source leaves it blank for a review CADENCE, which has no consequence class of its own. Blank is the honest answer and is stored as NULL.",
};

/** The source's own shorthand for "the value in the column to my left". */
const SAME_AS_PREVIOUS = "same";

export interface DecisionRightSeed {
  rightKey: string;
  valueCents: number | null;
  valueText: string | null;
  materiality: string | null;
  materialityResidueReason: string | null;
  note: string | null;
}

/**
 * Quote-aware CSV split. One seed row carries a quoted field containing
 * commas, so a naive split on "," reads it as seven columns and silently
 * truncates the right it is describing. No new dependency: the stack is
 * pinned and this is eleven lines.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * A right whose key ends `_usd` is money and lands in `value_cents`.
 * The SOURCE'S OWN KEY carries the unit, so the money set is computed
 * rather than kept as a hand-list that drifts when a row is added.
 *
 * Deliberately NOT keyed on "the value parses as a number":
 * `schedule_visit_shift_hours` is numeric and is not money. That row's
 * value stays TEXT, verbatim, because its key already names its unit,
 * because a third typed column invented for one row is shape nobody
 * asked for, and because a duration-typed column would enter the
 * client-duration census for a value that is not staff time at all.
 */
export function isMoneyKey(rightKey: string): boolean {
  return rightKey.endsWith("_usd");
}

/** USD in the source, integer cents in the column (the standing rule). */
export function usdToCents(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`decision rights: "${raw}" is not a number for a _usd right`);
  const cents = Math.round(n * 100);
  if (!Number.isInteger(cents)) throw new Error(`decision rights: "${raw}" does not convert to integer cents`);
  return cents;
}

/**
 * Parse the frozen CSV for ONE tier. Returns one seed per right, in the
 * file's own order.
 *
 * Preconditions are asserted before any row is read, because an empty
 * result and a correct result look identical to a caller that only
 * checks for a throw.
 */
export function parseDecisionRights(csv: string, tier: string): DecisionRightSeed[] {
  const column = TIER_COLUMN[tier];
  if (!column) throw new Error(`decision rights: unknown tier "${tier}"; the shipped vocabulary is ${Object.keys(TIER_COLUMN).join(", ")}`);

  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("decision rights: the source has no rows; refusing rather than seeding nothing");

  const header = splitCsvLine(lines[0]!).map((h) => h.trim());
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`decision rights: the source has no "${name}" column; header is ${header.join(", ")}`);
    return i;
  };
  const iRight = idx("right");
  const iValue = idx(column);
  const iMateriality = idx("materiality");
  const iNotes = idx("notes");
  // The leftmost tier column, which `same` refers back to.
  const iFirstTier = idx(TIER_COLUMN.essential!);

  const seeds: DecisionRightSeed[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const rightKey = (cells[iRight] ?? "").trim();
    if (!rightKey) continue;

    let raw = (cells[iValue] ?? "").trim();
    // The source writes `same` where a tier repeats the first tier's
    // value. Storing the literal word would record a right that says
    // "same", which is not what the household agreed to.
    if (raw === SAME_AS_PREVIOUS) raw = (cells[iFirstTier] ?? "").trim();
    if (!raw) throw new Error(`decision rights: "${rightKey}" has no value for tier ${tier}`);

    const materialityRaw = (cells[iMateriality] ?? "").trim();
    const residue = MATERIALITY_NOT_A_MATERIALITY[materialityRaw];
    const money = isMoneyKey(rightKey);

    seeds.push({
      rightKey,
      valueCents: money ? usdToCents(raw) : null,
      valueText: money ? null : raw,
      materiality: residue === undefined ? materialityRaw : null,
      materialityResidueReason: residue ?? null,
      note: (cells[iNotes] ?? "").trim() || null,
    });
  }
  if (seeds.length === 0) throw new Error("decision rights: parsed zero rights; refusing rather than seeding nothing");
  return seeds;
}
