/**
 * import-household.ts : restore an archive into a CLEAN household
 * (pnpm db:import-household).
 *
 * Q-8b's acceptance is a ROUND TRIP: the archive restores a complete
 * household in a clean instance. This is the other half.
 *
 * It refuses to write into an existing household. An importer that
 * merged into a live tenant would be a data-loss tool wearing a
 * restore tool's name, and the refusal is structural rather than a
 * warning: the target id is checked before anything is written.
 *
 * Usage: pnpm db:import-household --file <path> --as <uuid> [--dry-run]
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { ARCHIVE_FORMAT_VERSION } from "./household-archive.ts";

const argv = process.argv.slice(2);
const arg = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const file = arg("--file");
const asId = arg("--as");
const dryRun = argv.includes("--dry-run");
if (!file || !asId) {
  console.error("REFUSED: --file <path> and --as <uuid> are both required.");
  process.exit(1);
}

const archive = JSON.parse(readFileSync(file, "utf8"));
if (archive?.manifest?.formatVersion !== ARCHIVE_FORMAT_VERSION) {
  console.error(`REFUSED: archive format version ${archive?.manifest?.formatVersion}, this importer reads ${ARCHIVE_FORMAT_VERSION}.`);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});

// The archive PRESERVES row ids, because an archive that renumbered a
// household would not be the same record on the other side. That is why
// the acceptance says a CLEAN INSTANCE and not a clean household id:
// restoring into a database that already holds these rows collides on
// their primary keys. Proven by running it, not by reasoning: the first
// round-trip attempt refused and rolled back on
// `attention_record_pkey`, which is this importer working.
//
// The migration count is checked FIRST, because restoring a 67-migration
// archive into a 62-migration database fails somewhere in the middle
// with a confusing column error rather than at the door with a true one.
const { rows: journal } = await pool.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations");
const here = journal[0]?.n ?? 0;
if (here !== archive.manifest.migrationCount) {
  console.error(`REFUSED: the archive was written at migration count ${archive.manifest.migrationCount} and this database is at ${here}. Migrate the target to match before restoring.`);
  await pool.end();
  process.exit(1);
}

const { rows: existing } = await pool.query("SELECT id FROM household WHERE id = $1", [asId]);
if (existing.length > 0) {
  console.error(`REFUSED: household ${asId} already exists. An import restores into a CLEAN id; it never merges into a live tenant.`);
  await pool.end();
  process.exit(1);
}

const oldId = archive.manifest.householdId;
console.log(`Restoring ${archive.household.name} from ${oldId} as ${asId}.`);
console.log(`Known losses, from the archive's own manifest:`);
for (const l of archive.manifest.knownLosses) console.log(`  - ${l}`);

if (dryRun) {
  for (const t of archive.manifest.tables) {
    console.log(`  DRY RUN would insert ${archive.manifest.rowCounts[t]} row(s) into ${t}`);
  }
  console.log("DRY RUN: nothing was written.");
  await pool.end();
  process.exit(0);
}

const c = await pool.connect();
let inserted = 0;
try {
  await c.query("BEGIN");
  const hh = { ...archive.household, id: asId };
  const hCols = Object.keys(hh);
  await c.query(
    `INSERT INTO household (${hCols.map((k) => `"${k}"`).join(",")}) VALUES (${hCols.map((_, i) => `$${i + 1}`).join(",")})`,
    hCols.map((k) => hh[k]),
  );
  for (const table of archive.manifest.tables) {
    for (const row of archive.data[table] ?? []) {
      const r = { ...row, household_id: asId };
      const cols = Object.keys(r);
      await c.query(
        `INSERT INTO "${table}" (${cols.map((k) => `"${k}"`).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
        cols.map((k) => r[k]),
      );
      inserted++;
    }
  }
  await c.query("COMMIT");
} catch (e) {
  await c.query("ROLLBACK");
  console.error(`REFUSED and rolled back: ${(e as Error).message}`);
  c.release();
  await pool.end();
  process.exit(1);
}
c.release();
console.log(`Restored ${inserted} row(s) across ${archive.manifest.tables.length} tables.`);
await pool.end();
