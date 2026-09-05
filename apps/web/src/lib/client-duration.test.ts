import { test } from "vitest";
import assert from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

/**
 * WK-DEV-006 D7, the product-code expression of the staffing wall (register
 * A564): the client product never displays visit durations, service-hour
 * totals, staffing ratios, or households-per-HOM, anywhere, including
 * receipts, reports, and notification copy. Internal surfaces keep full
 * duration data for payroll and REQ-083; the wall is about what a CLIENT
 * can see.
 *
 * Both halves of the input are computed, per the inputs doctrine:
 * duration-typed columns are extracted from the schema source (a broken
 * extractor fails the floor instead of passing vacuously), and the client
 * surface set is walked from the (client) route group plus the named
 * client-reaching copy builders (mail, push). Free-text copy that states a
 * duration in prose without touching an identifier is NOT covered; that
 * stays on review, and this header says so.
 *
 * The escape hatch is the allowlist below, one entry per (file, term) with
 * a written reason; the first legitimate exception is a reviewed line,
 * never a commented-out guard.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../../..");

/** (file, term) pairs excused in writing. None yet. */
const ALLOWLIST: { file: string; term: string; reason: string }[] = [];

/** Duration-typed columns, extracted from the schema source. */
function durationColumnsFromSchema(): string[] {
  const src = readFileSync(path.join(root, "packages/schema/src/tables.ts"), "utf8");
  const out = new Set<string>();
  // Column definitions like `minutes: integer("minutes")` or any TS
  // property / SQL name carrying minutes/hours/duration.
  const colDef = /(\w+):\s*\w+\(\s*"(\w+)"/g;
  for (const m of src.matchAll(colDef)) {
    for (const name of [m[1], m[2]]) {
      if (name && /(^|_)(minutes|hours|duration)(_|$)|Minutes|Hours|Duration/.test(name)) out.add(name);
    }
  }
  return [...out];
}

/** The D7 ban-list vocabulary, fixed terms so future covenant-era columns
 * are caught by name even before the schema extractor sees them. */
const D7_VOCABULARY = [
  "durationMinutes", "duration_minutes", "serviceHours", "service_hours",
  "utilization", "householdsPerHom", "households_per_hom", "caseload",
];

/** Every client-reaching source file: the (client) route group walked
 * recursively, plus the copy builders that reach a client off-page. */
function clientSurfaceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts")) files.push(p);
    }
  };
  walk(path.join(root, "apps/web/src/app/(client)"));
  for (const rel of ["apps/web/src/lib/mail.ts", "apps/web/src/lib/push.ts", "packages/mail/src/index.ts"]) {
    files.push(path.join(root, rel));
  }
  return files;
}

test("no client surface renders a duration-typed field or D7 quantity (WK-DEV-006 D7)", () => {
  const schemaTerms = durationColumnsFromSchema();
  assert.ok(schemaTerms.length >= 1,
    "duration-column extractor found nothing - time_entry.minutes exists, so the extractor is broken, not the schema clean");
  const terms = [...new Set([...schemaTerms, ...D7_VOCABULARY])];
  const files = clientSurfaceFiles();
  assert.ok(files.length >= 3,
    `client surface walk found only ${files.length} file(s) - the route group or a named copy source moved; fix the walk, do not trust a tiny set`);

  const violations: string[] = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    const src = readFileSync(file, "utf8");
    for (const term of terms) {
      const re = new RegExp(`\\b${term}\\b`);
      if (!re.test(src)) continue;
      if (ALLOWLIST.some((a) => a.file === rel && a.term === term)) continue;
      violations.push(`${rel}: "${term}"`);
    }
  }
  assert.deepEqual(violations, [],
    `D7: client surfaces must never carry time quantities (visit durations, service hours, ` +
    `staffing ratios, households-per-HOM). Violations:\n  ${violations.join("\n  ")}\n` +
    `If one is legitimate, it is an ALLOWLIST entry with a written reason, reviewed.`);
});

/**
 * Q-11k: the D7 wall on the MEMBER ARCHIVE, which the scan above cannot reach.
 *
 * Opened as a queue row by the freeze-packet item A layout, which found that
 * `clientSurfaceFiles()` walks the `(client)` route group plus three named copy
 * builders and NOTHING ELSE, so `packages/schema/src/household-archive.ts` and
 * `export-household.ts` are outside it: a duration reaching the member archive
 * is invisible to CI.
 *
 * **ADDING THOSE FILES TO THE WALK ABOVE WOULD NOT HAVE CAUGHT IT**, and that
 * is the finding this test exists on rather than a detail of it. The scan above
 * looks for duration IDENTIFIERS in a file's source. The archive's risk is a
 * duration-carrying TABLE being admitted to `MEMBER_SCOPE`, and admitting
 * `visit_command` means writing that table's NAME into a list; no duration
 * identifier appears anywhere in the edit. A file-level text scan would have
 * read the archive, found nothing, and passed while the member archive shipped
 * every visit's hours.
 *
 * So the check is a COMPUTED SET COMPARISON rather than a text scan: the tables
 * carrying a duration-typed column, intersected with the member scope, must be
 * empty. Both sides are derived, so a column added to a member-scope table
 * tomorrow fails here without anyone remembering this rule.
 *
 * WHAT IT STILL DOES NOT COVER, in the guard-table's own spirit: the INSIDE of
 * a jsonb payload. `visit_command.payload` carries the hours the HOM typed and
 * no column name says so, so if that table is ever admitted under a projection
 * that drops duration KEYS, this test sees a table with no duration column and
 * passes. That is freeze-packet item A shape (b), and its dropped-key list is a
 * written, reviewed list precisely because no schema-derived check can read it.
 */
const MEMBER_SCOPE_DURATION_ALLOWLIST: Record<string, string> = {
  // (none. Add as `table_name: "why a duration-carrying table belongs in the
  //  member scope"`, which under D7 today would need the founder's amendment.)
};

test("no duration-carrying table is in the member archive scope (Q-11k, D7)", async () => {
  // Imported by PATH rather than from the package index: `household-archive`
  // is not re-exported from `@wellkept/schema`, and exporting it to satisfy a
  // test would widen a package's public API for a guard's convenience. This
  // file already reads `packages/schema/src/tables.ts` by path, so the idiom
  // is the file's own.
  const { MEMBER_SCOPE } = await import(
    pathToFileURL(path.join(root, "packages/schema/src/household-archive.ts")).href
  ) as { MEMBER_SCOPE: Record<string, unknown> };
  const src = readFileSync(path.join(root, "packages/schema/src/tables.ts"), "utf8");

  // table -> does it define a duration-typed column, computed the same way
  // the identifier scan computes its terms.
  const blocks = src.split(/export const \w+ = pgTable\("(\w+)"/);
  const durationTables = new Set<string>();
  let tablesSeen = 0;
  for (let i = 1; i < blocks.length; i += 2) {
    const table = blocks[i]!;
    const body = (blocks[i + 1] ?? "").split("pgTable")[0]!;
    tablesSeen++;
    for (const m of body.matchAll(/(\w+):\s*\w+\(\s*"(\w+)"/g)) {
      for (const name of [m[1], m[2]]) {
        if (name && /(^|_)(minutes|hours|duration)(_|$)|Minutes|Hours|Duration/.test(name)) {
          durationTables.add(table);
        }
      }
    }
  }

  // Preconditions, before any conclusion: both inputs must be non-trivial, or
  // an empty intersection means the detection is broken rather than the tree
  // clean. `time_entry` carries minutes and the member scope is not empty.
  assert.ok(tablesSeen >= 30, `only ${tablesSeen} tables parsed; the table split is broken`);
  assert.ok(durationTables.size >= 1,
    "no duration-carrying table found at all - time_entry.minutes exists, so the detection is broken, not the schema clean");
  const scope = Object.keys(MEMBER_SCOPE);
  assert.ok(scope.length >= 1, "MEMBER_SCOPE is empty; the comparison would pass vacuously");

  const leaked = scope
    .filter((t) => durationTables.has(t))
    .filter((t) => !(t in MEMBER_SCOPE_DURATION_ALLOWLIST));
  assert.deepEqual(
    leaked,
    [],
    `member-scope table(s) carrying a duration column: ${leaked.join(", ")}. ` +
      `D7 bars a duration from a client surface and the member archive is one the ` +
      `member is handed. Hold the table out of MEMBER_SCOPE, project the duration ` +
      `away, or allowlist it here with a written reason (which under D7 today ` +
      `would need the founder's amendment; see the freeze packet's Ruling A).`,
  );
});
