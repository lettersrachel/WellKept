import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Q-11q (G-133): a queue row that contradicts itself is not detected by
 * anything.
 *
 * Q-10's prerequisite cell read `WK-STD-028 (not in repository)` while
 * its status cell read `**NEW.**`, three cells apart on one line, and had
 * done since the 3 September re-cut. Every other check here compares one
 * artefact against another. Nothing compared a queue row against itself,
 * and a row is read a cell at a time by someone looking for one thing, so
 * the contradiction survives until somebody builds from it. It cost
 * nothing that time only because the row was blocked for three other
 * reasons as well, which is luck rather than a control.
 *
 * THE DETECTION IS A SAME-ROW COMPARISON RATHER THAN A JUDGMENT. Where a
 * row's Spec cell names an input as ABSENT, the row must say what it does
 * about that absence. Both vocabularies below are taken from the file's
 * own existing text rather than invented, which is what keeps this a
 * consistency check and not a new taxonomy: every phrase is asserted to
 * be in live use, so the lists cannot silently accumulate dead patterns
 * that make the guard look wider than it is.
 *
 * WHAT IT DOES NOT COVER, and the limit belongs here rather than in a
 * reader's head. It reads PROSE. It catches a STATED contradiction and
 * nothing else:
 *   - a prerequisite that is absent and not SAID to be absent is
 *     invisible to it, which is most of the ways a row can be wrong;
 *   - a disposition naming the right document for the wrong reason reads
 *     as a pass, because no text comparison can weigh a reason;
 *   - `(bundle)` is deliberately NOT read as an absence phrasing. It
 *     names a document's origin rather than asserting it is missing, and
 *     reading it as an absence would put the guard in the business of
 *     inferring what a parenthetical means.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const QUEUE = path.join(here, "../../..", "docs/BUILD_QUEUE.md");

/**
 * Phrasings that state an input is not in this repository. Taken from the
 * Spec cells that already use them; each is asserted in use below.
 */
const ABSENCE_PATTERNS = [
  // Both spellings, because the file writes both and a second list entry
  // would have been dead vocabulary in the Spec column: "not in the
  // repository" occurs four times in this file and never in a Spec cell,
  // which the in-use assertion below caught on this guard's first run.
  /not in (?:the )?repository/i,
  /not in the tree/i,
  /unwritten/i,
];

/**
 * Status markers, read from the FIRST BOLDED RUN of the Standing cell,
 * which is where every row in this file states its status. Matching the
 * opener rather than the whole cell is deliberate: `membrane-gated` deep
 * in Q-14's body is about cross-household batching and says nothing about
 * that row's absent spec, and a whole-cell match would have read it as a
 * disposition. Same unit, different question.
 */
const STATUS_MARKERS = [
  "closed",
  "delivered",
  "deferred",
  "founder-side",
  "corrected",
  "blocked",
  "gated",
  "split",
];

/**
 * Dispositions that may live in the Spec cell itself, beside the absence.
 * Q-1 and Q-13 both say the row runs on its acceptance criterion instead
 * of on the missing document, which is the answer written where the
 * question is asked.
 */
const SPEC_DISPOSITIONS = ["runs on its acceptance", "ran on its acceptance"];

type Row = { id: string; spec: string; standing: string; line: number };

function readRows(): Row[] {
  const lines = readFileSync(QUEUE, "utf8").split("\n");
  const rows: Row[] = [];
  lines.forEach((l, i) => {
    if (!l.startsWith("| Q-")) return;
    // Split on UNESCAPED pipes only: a row may carry `\\|` inside a code
    // span (Q-8b's `--scope corporate\\|member`), and reading that as a cell
    // boundary is how a mis-split row reports the wrong cell as its status.
    const cells = l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split(/(?<!\\)\|/)
      .map((c) => c.replace(/\\\|/g, "|"));
    assert.equal(
      cells.length,
      6,
      `docs/BUILD_QUEUE.md line ${i + 1}: expected six cells, got ${cells.length}. ` +
        `A row that does not parse cannot be checked, so this fails rather than skipping.`,
    );
    rows.push({
      id: (cells[0] ?? "").trim(),
      spec: (cells[2] ?? "").trim(),
      standing: (cells[4] ?? "").trim(),
      line: i + 1,
    });
  });
  return rows;
}

/** The first bolded run of a cell, which is the row's stated status. */
function statusOpener(standing: string): string {
  const m = standing.match(/\*\*([\s\S]*?)\*\*/);
  return (m?.[1] ?? standing).toLowerCase();
}

/** Strip markdown emphasis and backticks so a bolded name still matches. */
function plain(s: string): string {
  return s.replace(/[*`]/g, "");
}

/**
 * The names of the absent inputs a Spec cell declares. A segment is the
 * text up to the absence phrase; the name is what precedes the opening
 * parenthesis, plus any comma-separated id inside it (A129, A130, A128),
 * since a row may refer to either.
 */
function absentInputNames(spec: string): string[] {
  const names: string[] = [];
  for (const segment of plain(spec).split(";")) {
    const lower = segment.toLowerCase();
    if (!ABSENCE_PATTERNS.some((p) => p.test(lower))) continue;
    const cut = segment.search(/\(|not in |unwritten|NOT IN /i);
    const head = (cut > 0 ? segment.slice(0, cut) : segment).trim();
    if (head) names.push(head.replace(/[,.]$/, ""));
    const paren = segment.match(/\(([^)]*)/);
    if (paren?.[1]) {
      for (const part of paren[1].split(",")) {
        const p = part.trim();
        if (/^[A-Z]{1,4}[-]?\d{2,4}$/.test(p) || /^A\d{2,4}$/.test(p)) names.push(p);
      }
    }
  }
  return names.filter((n) => n.length > 2);
}

test("every absence phrasing and status marker is in live use", () => {
  const rows = readRows();
  const specs = rows.map((r) => plain(r.spec).toLowerCase()).join("\n");
  const openers = rows.map((r) => statusOpener(r.standing)).join("\n");
  for (const p of ABSENCE_PATTERNS) {
    assert.ok(
      p.test(specs),
      `absence phrasing ${p} is in no Spec cell. The vocabulary is taken from the ` +
        `file's own text, so a phrase nothing uses is either a typo or an invention ` +
        `and makes this guard read wider than it reaches.`,
    );
  }
  for (const m of STATUS_MARKERS) {
    assert.ok(
      openers.includes(m),
      `status marker "${m}" opens no row. Same reason: a marker nothing uses is dead ` +
        `vocabulary that would silently accept a status this file never writes.`,
    );
  }
  for (const d of SPEC_DISPOSITIONS) {
    assert.ok(
      specs.includes(d),
      `spec disposition "${d}" is in no Spec cell.`,
    );
  }
});

test("a row whose prerequisite is absent says what it does about that", () => {
  const rows = readRows();

  // The unit at risk is the ROW, and the floor is on rows rather than on
  // absent-input rows: a parse that returns nothing at all must fail
  // rather than report a clean zero (the inputs doctrine).
  assert.ok(
    rows.length >= 50,
    `only ${rows.length} queue rows parsed out of docs/BUILD_QUEUE.md. The detection ` +
      `is broken; a small set passing vacuously is the failure this floor exists for.`,
  );

  const failures: string[] = [];
  let checked = 0;

  for (const row of rows) {
    const names = absentInputNames(row.spec);
    if (names.length === 0) continue;
    checked += 1;

    const opener = statusOpener(row.standing);
    if (STATUS_MARKERS.some((m) => opener.includes(m))) continue;

    const standing = plain(row.standing).toLowerCase();
    if (names.some((n) => standing.includes(n.toLowerCase()))) continue;

    const spec = plain(row.spec).toLowerCase();
    if (SPEC_DISPOSITIONS.some((d) => spec.includes(d))) continue;

    failures.push(
      `${row.id} (line ${row.line}): prerequisite names ${names
        .map((n) => `"${n}"`)
        .join(", ")} as absent, and the status opener reads "${opener.trim()}" ` +
        `without naming it. Say what the row does about the missing input: mark the ` +
        `status blocked or gated, or name the input in the status text.`,
    );
  }

  assert.ok(
    checked >= 8,
    `only ${checked} rows were found to name an absent prerequisite. The Spec-cell ` +
      `detection is broken; today the file carries more than that.`,
  );

  assert.deepEqual(
    failures,
    [],
    `queue rows contradict themselves:\n${failures.join("\n")}`,
  );
});
