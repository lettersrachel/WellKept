#!/usr/bin/env node
/**
 * Render the seeded Decision Rights tier rows as ONE PAGE PER TIER, so the
 * COO's 25 September review is a page of yes-or-no rather than a database
 * query (preparation batch item 8).
 *
 * IT GENERATES RATHER THAN TRANSCRIBES, and that is the point. The source is
 * the frozen intake CSV; a hand-copied sheet would be a second copy of the
 * values that drifts from the first, which is the class this repository keeps
 * filing. Re-run it and the sheet is current by construction.
 *
 * Reads no database and writes one file. `decision_right` holds ZERO rows
 * today: these values are the intake's recommended defaults, not stored state,
 * and the sheet says so on its face so nobody reads a confirmation as a
 * description of the system.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "docs/intake/2026-09-04-founder-values/decision_rights_by_tier.csv";
const OUT = "docs/DECISION_RIGHTS_REVIEW_SHEET.md";

/** CSV with quoted fields carrying commas (one row uses them). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

const rows = parseCsv(readFileSync(SRC, "utf8"));
const header = rows.shift();
const [, ...tierCols] = header;
const TIERS = tierCols.slice(0, 3); // essential, family_operations, concierge

const human = (s) => s.replace(/_/g, " ").replace(/\busd\b/i, "USD");
const money = (k, v) => (/_usd$/.test(k) && /^\d+$/.test(v) ? `$${Number(v).toLocaleString("en-US")}` : human(v));

let out = `---
status: living
---
# Decision Rights: confirm or amend

**Preparation batch item 8**, for the 25 September review. One page per tier,
so the pass is a page of yes-or-no rather than a database query.

**GENERATED, not transcribed.** Source:
\`${SRC}\` (frozen intake, adopted 4 September 2026).
Re-run \`node tooling/review/decision-rights-sheet.mjs\` and this file is
current by construction. **Do not edit it by hand**: an edit here is a second
copy of the values that drifts from the first, which is exactly what generating
it prevents.

## Read this before confirming

**\`decision_right\` holds ZERO rows today.** Every value below is the intake's
RECOMMENDED DEFAULT, not stored state, so **confirming one is a decision and
not a description**. Nothing in the software reads these yet: the routing half
of Q-5 that would consume them is blocked on Q-6.

**How to mark a row.** Write \`Y\` to confirm as stated, or write the amended
value in its place. A blank is not a confirmation and the row stays open;
that distinction is the whole reason the column exists.

**One row is marked non-negotiable across tiers** by the intake itself and is
reproduced on every page rather than once, so a tier page is complete on its
own.

`;

for (const tier of TIERS) {
  const col = header.indexOf(tier);
  out += `\n---\n\n# ${human(tier).replace(/\b\w/g, (c) => c.toUpperCase())}\n\n`;
  out += `| # | Right | Recommended | Materiality | Y or amended value | Note |\n|---|---|---|---|---|---|\n`;
  rows.forEach((r, i) => {
    const [key, , , , materiality, note] = [r[0], r[1], r[2], r[3], r[header.indexOf("materiality")], r[header.indexOf("notes")]];
    const val = r[col] ?? "";
    out += `| ${i + 1} | ${human(key)} | **${money(key, val)}** | ${materiality || "not set"} |  | ${note || ""} |\n`;
  });
  out += `\n**${rows.length} rows.** Blank rows in the fifth column are unconfirmed.\n`;
}

out += `
---

## What this sheet cannot tell you, said plainly

- **Whether a value is right.** It shows what was proposed and by whom, never
  whether it fits a household.
- **Whether anything enforces it.** Nothing does today.
- **What happens between tiers.** Several rows read \`same\` on the higher
  tiers in the source; they render as the source wrote them rather than being
  expanded, because expanding one would be interpreting it.
`;

writeFileSync(OUT, out);
console.log(`${OUT}: ${TIERS.length} tier pages, ${rows.length} rows each, generated from ${SRC}`);
