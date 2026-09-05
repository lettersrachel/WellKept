/**
 * export-household.ts : the provider-independent export (pnpm db:export-household).
 *
 * Q-8b. A CORPORATE ACT today: the member-facing control is FREEZE-GATED
 * (WK-DEV-007, Part C section 2.2), so generation happens on the
 * member's request rather than at their keystroke. Nothing here is a
 * member surface.
 *
 * Usage: pnpm db:export-household --household <uuid> --out <file>
 */
import pg from "pg";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  archiveTableSet, ARCHIVE_EXCLUSIONS, ARCHIVE_PROJECTIONS,
  ARCHIVE_FORMAT_VERSION, ARCHIVE_KNOWN_LOSSES,
} from "./household-archive.ts";

const argv = process.argv.slice(2);
const arg = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const householdId = arg("--household");
const out = arg("--out");
if (!householdId || !out) {
  console.error("REFUSED: --household <uuid> and --out <file> are both required.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});

const { rows: hh } = await pool.query("SELECT * FROM household WHERE id = $1", [householdId]);
if (hh.length === 0) {
  console.error(`REFUSED: no household ${householdId}.`);
  await pool.end();
  process.exit(1);
}

const set = archiveTableSet();
const data: Record<string, unknown[]> = {};
const rowCounts: Record<string, number> = {};

for (const { table } of set) {
  const projection = ARCHIVE_PROJECTIONS[table];
  const { rows } = await pool.query(`SELECT * FROM "${table}" WHERE household_id = $1`, [householdId]);
  if (!projection) {
    data[table] = rows;
  } else {
    // The manifest shape: every column EXCEPT the bytes, plus a content
    // hash in their place. Naming the dropped column rather than the
    // kept ones means a column added tomorrow stays in the manifest.
    const dropped = projection.dropForHash;
    data[table] = rows.map((r) => {
      if (!(dropped in r)) throw new Error(`archive projection for ${table} drops "${dropped}", which the table does not have`);
      const kept: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) if (k !== dropped) kept[k] = v;
      kept.content_sha256 = r[dropped] ? createHash("sha256").update(r[dropped] as Buffer).digest("hex") : null;
      return kept;
    });
  }
  rowCounts[table] = data[table]!.length;
}

const { rows: journal } = await pool.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations");

const archive = {
  manifest: {
    formatVersion: ARCHIVE_FORMAT_VERSION,
    generatedAt: new Date().toISOString(),
    householdId,
    migrationCount: journal[0]?.n ?? 0,
    tables: set.map((t) => t.table),
    exclusions: ARCHIVE_EXCLUSIONS,
    projections: Object.fromEntries(Object.entries(ARCHIVE_PROJECTIONS).map(([k, v]) => [k, v.why])),
    rowCounts,
    knownLosses: ARCHIVE_KNOWN_LOSSES,
  },
  household: hh[0],
  data,
};

writeFileSync(out, JSON.stringify(archive, null, 2));
const total = Object.values(rowCounts).reduce((a, b) => a + b, 0);
console.log(`${hh[0].name}: ${set.length} tables, ${total} rows, migration count ${archive.manifest.migrationCount}.`);
console.log(`Excluded by design: ${Object.keys(ARCHIVE_EXCLUSIONS).join(", ")}.`);
console.log(`Wrote ${out}.`);
await pool.end();
