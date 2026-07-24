/**
 * load-bindings.ts : attach governing_provisions to an EXISTING household's
 * playbook fields from a bindings CSV (section,name,provision_ids with
 * semicolon-separated ids) — the post-import path for Addendum A1 S4.
 *
 * Usage: node src/load-bindings.ts [bindings.csv] --household "Name"
 * Defaults to tooling/seed/fernbrook_bindings.csv.
 *
 * ONLY governing_provisions is written; values, notes, flags and provenance
 * are never touched (unlike load-seed, which clobbers operational edits and
 * is dev-only). Every provision id must resolve to a live, non-tombstoned
 * standard_provision row before anything is written — the app-code FK check,
 * fail loudly (WK-DEV-005 S3). Bindings for fields the household does not
 * carry are reported, not silently skipped.
 */
import { readFile } from "node:fs/promises";
import pg from "pg";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { household, playbookField, standardProvision } from "./tables.ts";

const args = process.argv.slice(2);
const hhFlag = args.indexOf("--household");
const householdName = hhFlag >= 0 ? args[hhFlag + 1] : null;
const csvPath = args.filter((a, i) => !a.startsWith("--") && i !== hhFlag + 1)[0]
  ?? new URL("../../../tooling/seed/fernbrook_bindings.csv", import.meta.url).pathname;

if (!householdName) {
  console.error('Usage: node src/load-bindings.ts [bindings.csv] --household "Name"');
  process.exit(2);
}

// section,name,provision_ids — name may be quoted with doubled inner quotes.
const lines = (await readFile(csvPath, "utf8")).trim().split(/\r?\n/);
if (lines[0] !== "section,name,provision_ids") {
  console.error(`FAIL: ${csvPath} is not a bindings CSV (bad header)`);
  process.exit(2);
}
const bindings: { section: number; name: string; ids: string[] }[] = [];
for (const line of lines.slice(1)) {
  const m = line.match(/^(\d+),(?:"((?:[^"]|"")*)"|([^,]*)),(.*)$/);
  if (!m) {
    console.error(`FAIL: unparseable bindings line: ${line.slice(0, 80)}`);
    process.exit(2);
  }
  const [, section, quoted, bare, ids] = m;
  bindings.push({
    section: Number(section),
    name: quoted !== undefined ? quoted.replaceAll('""', '"') : bare!,
    ids: ids!.split(";").map((s) => s.trim()).filter(Boolean),
  });
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const [hh] = await db.select().from(household).where(eq(household.name, householdName));
if (!hh) {
  const all = await db.select({ name: household.name }).from(household);
  console.error(`FAIL: no household named "${householdName}". Households here: `
    + all.map((h) => `"${h.name}"`).join(", "));
  await pool.end();
  process.exit(2);
}

// The FK check: every referenced provision must be live in the store.
const wanted = [...new Set(bindings.flatMap((b) => b.ids))];
const live = await db
  .select({ id: standardProvision.id })
  .from(standardProvision)
  .where(and(inArray(standardProvision.id, wanted), isNull(standardProvision.tombstonedAt)));
const liveIds = new Set(live.map((p) => p.id));
const dangling = wanted.filter((id) => !liveIds.has(id));
if (dangling.length) {
  console.error(`FAIL: ${dangling.length} provision ids not live in the standards store `
    + `(load the provision seed first?): ${dangling.slice(0, 10).join(", ")}`);
  await pool.end();
  process.exit(2);
}

let bound = 0;
const unmatched: string[] = [];
for (const b of bindings) {
  const updated = await db
    .update(playbookField)
    .set({ governingProvisions: b.ids, updatedAt: new Date() })
    .where(and(
      eq(playbookField.householdId, hh.id),
      eq(playbookField.section, b.section),
      eq(playbookField.name, b.name),
      isNull(playbookField.tombstonedAt),
    ))
    .returning({ id: playbookField.id });
  if (updated.length) bound += updated.length;
  else unmatched.push(`S${b.section} ${b.name.slice(0, 60)}`);
}

console.log(`bound ${bound} fields of "${hh.name}" to governing provisions `
  + `(${bindings.length} CSV rows, ${wanted.length} distinct provisions)`);
if (unmatched.length) {
  console.log(`NOTE: ${unmatched.length} bindings had no matching field on this household:`);
  for (const u of unmatched) console.log(`  - ${u}`);
}
await pool.end();
