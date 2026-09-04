import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "vitest";
import { JUDGMENT_FREE_PATTERNS, JUDGMENT_FREE_EXCEPTIONS } from "./judgment-free.ts";

/**
 * Q-4: the judgment-free schema guard (RFC-001 §4 absorbed by
 * RFC-ATTR-01 Amendment 1 §A1.4; the pattern list extended per Ruling 2
 * §5). Two refusals, both computed from tables.ts (the inputs doctrine):
 *
 *  1. No column may carry a name matching the founder-editable pattern
 *     list (ranking constructs over HOMs; stress, emotion, cognitive
 *     load and health inference; social-content inference;
 *     person-characterizing words) without a WRITTEN exception.
 *  2. No table may DEFINE more than one household-named column: a table
 *     referencing two households is the cross-tenant join the whole
 *     permission model assumes cannot exist. (The composite
 *     same-household FKs reuse the one column; the census counts
 *     definitions, not usages.)
 *
 * Not covered, honestly: free text and stored VALUES, which no name
 * census can read; inference living in code rather than schema, which
 * is review's; and the pattern list's own completeness, which is the
 * founder's to grow. The guard bars the INFERENCE and permits the
 * human record (the load_concern_raised adoption ruling), which is a
 * distinction the list encodes by what it does not match.
 */

const here = dirname(fileURLToPath(import.meta.url));
const TABLES = readFileSync(join(here, "tables.ts"), "utf8");

function tableColumns(): Array<{ table: string; column: string }> {
  const out: Array<{ table: string; column: string }> = [];
  for (const m of TABLES.matchAll(/export const \w+ = pgTable\("(\w+)",\s*\{([\s\S]*?)\n\}\s*,?\s*(?:\(t\)|\))/g)) {
    const table = m[1] ?? "";
    for (const cm of (m[2] ?? "").matchAll(/\w+:\s*\w+\("([^"]+)"/g)) {
      out.push({ table, column: cm[1] ?? "" });
    }
  }
  return out;
}

test("no column name matches the judgment-free pattern list without a written exception", () => {
  const cols = tableColumns();
  // Floor: a broken census finds a tiny set and would pass vacuously.
  assert.ok(cols.length >= 300,
    `only ${cols.length} columns found - the census broke, not the schema`);
  const offenders: string[] = [];
  for (const { table, column } of cols) {
    const key = `${table}.${column}`;
    if (key in JUDGMENT_FREE_EXCEPTIONS) continue;
    for (const p of JUDGMENT_FREE_PATTERNS) {
      if (p.re.test(column)) offenders.push(`${key} (matches ${p.re}: ${p.why})`);
    }
  }
  assert.deepEqual(offenders, [],
    `judgment-free violation(s): ${offenders.join("; ")}. The pattern list is founder-editable `
    + `(judgment-free.ts) and every legitimate exception is a WRITTEN entry there naming its `
    + `authority; a matching column with no entry is the inference getting a schema home.`);
  // The reverse direction: a stale exception is a false claim.
  const known = new Set(cols.map((c) => `${c.table}.${c.column}`));
  for (const [key, reason] of Object.entries(JUDGMENT_FREE_EXCEPTIONS)) {
    assert.ok(reason.trim().length > 20, `exception reason for ${key} is too thin to be a reason`);
    assert.ok(known.has(key), `${key} is excepted but no longer in the schema; remove its entry`);
  }
});

test("no table defines more than one household-named column", () => {
  const byTable = new Map<string, string[]>();
  for (const { table, column } of tableColumns()) {
    if (/household/.test(column)) byTable.set(table, [...(byTable.get(table) ?? []), column]);
  }
  assert.ok(byTable.size >= 30,
    `only ${byTable.size} household-scoped tables found - the census broke, not the schema`);
  const multi = [...byTable.entries()].filter(([, cols]) => cols.length > 1);
  assert.deepEqual(multi, [],
    `table(s) defining two household columns: ${multi.map(([t, c]) => `${t} (${c.join(", ")})`).join("; ")}. `
    + `A table referencing two households is the cross-tenant join the permission model assumes cannot exist.`);
});
