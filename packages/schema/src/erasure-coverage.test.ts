import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Session J (POST_DEPLOY_SESSIONS_2.md): the erasure rule as a GUARD, not a
 * policy. The standing rule — a data category ships with its erasure
 * treatment or it does not ship — was half-applied within one commit of
 * being written, and the mechanical version of this check found four more
 * missing tables the day it was drafted (anticipation_exclusion,
 * notification, event_outbox, trigger_rule). Same move G-37 made for
 * version skew: detect the CLASS of failure automatically.
 *
 * Mechanism: every table whose definition carries a household reference
 * must be NAMED in erase-household.mjs — mentioning it is the floor, and
 * forces the author to decide its treatment. Deliberate exceptions go in
 * the allowlist below WITH A WRITTEN REASON; an empty-reason entry fails.
 *
 * The match is word-bounded, not substring: underscore is a word
 * character, so `visit_photo` cannot vicariously satisfy `visit`, and a
 * comment naming the table counts exactly as much as a query does (the
 * floor is being NAMED — the treatment decision — not a particular SQL
 * shape). Verified to fire: blanking every standalone mention of one
 * table turns the suite red.
 *
 * THAT FLOOR IS DECIDED AND STAYS (founder ruling, 4 September 2026),
 * recorded here so the next reader meets the answer rather than
 * re-deriving the question. Q-6-1 tested it by accident: removing only
 * the executable `UPDATE decision_right ...` left this guard GREEN,
 * because the header comment still named the table, and that was
 * reported as a hole before the sentence above was read. The ruling:
 * **naming and deciding is the property worth having**, and a guard
 * demanding a particular SQL shape would fail on every legitimate
 * no-op treatment and be allowlisted into silence, which is the exact
 * failure mode CLAUDE.md already names as the reason the per-column
 * producer rule cannot become a guard.
 *
 * THAT NARROWER FINDING IS NOW BUILT (Q-6g, 5 September 2026): the
 * second test below. A treatment DESCRIBED in a comment and written
 * nowhere does not pass. It is a smaller claim than "the guard should
 * demand SQL", and the shape matters: it detects the ABSENCE OF ANY
 * statement touching the table rather than the presence of a particular
 * one, so a deliberate no-op recorded as a statement passes and only
 * prose-without-code fails. Demanding a shape is the thing the ruling
 * above forbids.
 */
const ALLOWLIST: Record<string, string> = {
  // (none today — the tool names every household-referencing table.
  //  Add entries as `table_name: "reason it is deliberately absent"`.)
};

/**
 * Q-6g's own allowlist, deliberately SEPARATE from the one above. A table
 * may legitimately be named in the tool and touched by no statement, and
 * the reason is different from "deliberately absent from the tool", so
 * folding the two lists would let one reason excuse the other question.
 */
const PROSE_ONLY_ALLOWLIST: Record<string, string> = {
  // (none today. Add entries as `table_name: "why prose is the right treatment"`.)
};

const here = path.dirname(fileURLToPath(import.meta.url));
const tablesSrc = readFileSync(path.join(here, "tables.ts"), "utf8");
const toolSrc = readFileSync(
  path.join(here, "../../../apps/web/scripts/erase-household.mjs"),
  "utf8",
);

test("every household-referencing table appears in the erasure tool", () => {
  const blocks = tablesSrc.split(/export const \w+ = pgTable\("(\w+)"/);
  const missing: string[] = [];
  for (let i = 1; i < blocks.length; i += 2) {
    const table = blocks[i]!;
    const body = (blocks[i + 1] ?? "").split("pgTable")[0]!;
    const carriesHousehold = body.includes("household_id") || table === "household";
    if (!carriesHousehold) continue;
    if (table in ALLOWLIST) {
      assert.ok(
        ALLOWLIST[table]!.trim().length > 10,
        `allowlist entry for ${table} needs a real written reason`,
      );
      continue;
    }
    if (!new RegExp(`\\b${table}\\b`).test(toolSrc)) missing.push(table);
  }
  assert.deepEqual(
    missing,
    [],
    `household-referencing table(s) missing from erase-household.mjs: ${missing.join(", ")} — ` +
      `a data category ships with its erasure treatment or it does not ship (G-40). ` +
      `Either handle each table in the tool or allowlist it here with a written reason.`,
  );
});

/**
 * Q-6g: prose is not a treatment.
 *
 * The floor above is being NAMED, and a comment names as well as a query
 * does. That floor stays (founder ruling, 4 September 2026). This is the
 * one case it cannot catch: a table discussed at length in the tool's
 * header and touched by no statement at all reads, to every reader and
 * to the first guard, exactly like a table with a decided treatment.
 *
 * DETECTION IS BY ABSENCE, NOT BY SHAPE. The tool's source is stripped
 * of comments and the table must appear in what is left, whatever it is
 * doing there: an UPDATE, a DELETE, a name in an executable list, a
 * deliberate no-op recorded as a statement. Demanding a particular SQL
 * shape is exactly what the ruling forbids, because every legitimate
 * no-op would fail it and the allowlist would fill up until the guard
 * meant nothing.
 *
 * The strip is conservative about strings: `//` inside a quoted literal
 * is not a comment, and a SQL string mentioning a table is code. Being
 * wrong in that direction would invent failures; being wrong the other
 * way only leaves this test as weak as the one above it.
 */
function stripComments(src: string): string {
  const noBlocks = src.replace(/\/\*[\s\S]*?\*\//g, " ");
  return noBlocks.split("\n").map((line) => {
    let quote: string | null = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;
      if (quote) {
        if (c === "\\") { i++; continue; }
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") {
        quote = c;
      } else if (c === "/" && line[i + 1] === "/") {
        return line.slice(0, i);
      }
    }
    return line;
  }).join("\n");
}

test("a treatment written only in a comment is not a treatment (Q-6g)", () => {
  const executable = stripComments(toolSrc);
  // The strip must actually remove something, or this test is asserting
  // over the whole file and can never fail. A proof asserts its own
  // preconditions.
  assert.ok(
    executable.length < toolSrc.length * 0.9,
    `the comment strip removed almost nothing (${toolSrc.length} to ${executable.length}); ` +
      `the detection is broken and this test would pass vacuously`,
  );

  const blocks = tablesSrc.split(/export const \w+ = pgTable\("(\w+)"/);
  const proseOnly: string[] = [];
  let checked = 0;
  for (let i = 1; i < blocks.length; i += 2) {
    const table = blocks[i]!;
    const body = (blocks[i + 1] ?? "").split("pgTable")[0]!;
    const carriesHousehold = body.includes("household_id") || table === "household";
    if (!carriesHousehold) continue;
    if (table in ALLOWLIST) continue;
    if (table in PROSE_ONLY_ALLOWLIST) {
      assert.ok(
        PROSE_ONLY_ALLOWLIST[table]!.trim().length > 10,
        `prose-only allowlist entry for ${table} needs a real written reason`,
      );
      continue;
    }
    checked++;
    const named = new RegExp(`\\b${table}\\b`).test(toolSrc);
    const executed = new RegExp(`\\b${table}\\b`).test(executable);
    if (named && !executed) proseOnly.push(table);
  }
  // The census must be non-trivial, for the same reason as the strip.
  assert.ok(checked >= 30, `only ${checked} tables checked; the detection is broken`);

  assert.deepEqual(
    proseOnly,
    [],
    `table(s) whose erasure treatment exists only as PROSE: ${proseOnly.join(", ")}. ` +
      `The tool discusses them and no statement touches them, which reads like a decided ` +
      `treatment to every reader and to the naming guard above. Give each one a statement ` +
      `of any shape, including a deliberate no-op recorded as one, or allowlist it here ` +
      `with a written reason.`,
  );
});
