import { test } from "vitest";
import assert from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
