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
 * THE INSERT ORDER IS COMPUTED, not listed. The archive's tables
 * reference each other (a work requirement needs its task profile, an
 * attention record needs its situation), and alphabetical order breaks
 * on the first such pair. So the importer reads the foreign keys among
 * the carried tables from information_schema and sorts them, which
 * means a table added tomorrow orders itself. Self-references are
 * handled separately: the column is written NULL on insert and filled
 * by an UPDATE in the same transaction, because a table cannot be
 * ordered against itself.
 *
 * Usage: pnpm db:import-household --file <path> --as <uuid> [--dry-run]
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import {
  ARCHIVE_FORMAT_VERSION, ARCHIVE_PROJECTIONS, archivePersonEmail,
} from "./household-archive.ts";

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
const globalTables = Object.keys(archive.globals ?? {});
const carried: string[] = [...globalTables, ...archive.manifest.tables];

// The foreign keys among the carried tables, read from the database
// rather than listed here, plus the self-referencing ones.
const { rows: edges } = await pool.query(
  `SELECT tc.constraint_name AS name, tc.table_name AS child, ccu.table_name AS parent, kcu.column_name AS col
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ANY($1::text[])
      AND ccu.table_name = ANY($1::text[])`,
  [carried],
);
const { rows: nullableRows } = await pool.query(
  `SELECT table_name AS t, column_name AS c FROM information_schema.columns
    WHERE table_schema = 'public' AND is_nullable = 'YES' AND table_name = ANY($1::text[])`,
  [carried],
);
const nullable = new Set(nullableRows.map((r: { t: string; c: string }) => `${r.t}.${r.c}`));

/**
 * The json/jsonb columns, computed the same way, because node-postgres
 * serializes a JS OBJECT to JSON and a JS ARRAY to a POSTGRES ARRAY LITERAL.
 *
 * So a jsonb column holding `{"location":"basement"}` round-trips and one
 * holding `["a","b"]` arrives as `{a,b}` and Postgres refuses it as invalid
 * json. **The two failure modes are not symmetric and that is what hid this:**
 * every archive restored before 5 September 2026 happened to carry objects
 * only, so the portability proof passed while exercising one of the two
 * shapes. The authorized erasure run restored a second fixture and the
 * importer refused on `decision_record.alternatives`, which is the first
 * jsonb ARRAY any restore has met.
 *
 * The fix is to stop relying on the driver's guess and say what the column is.
 * Stringifying is correct for every json value, not only arrays: an object
 * arrives as the same JSON text the driver would have produced, and a bare
 * string arrives as a quoted json string rather than as invalid json, which is
 * the third shape nobody had hit yet either.
 */
const { rows: jsonRows } = await pool.query(
  `SELECT table_name AS t, column_name AS c FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type IN ('json','jsonb') AND table_name = ANY($1::text[])`,
  [carried],
);
const jsonCols = new Set(jsonRows.map((r: { t: string; c: string }) => `${r.t}.${r.c}`));
const bind = (table: string, col: string, value: unknown) =>
  value != null && jsonCols.has(`${table}.${col}`) ? JSON.stringify(value) : value;

/**
 * A self-referencing foreign key is deferred by writing ONE of its
 * columns NULL, which under MATCH SIMPLE switches the whole constraint
 * off for that row, and filling it back in once the table is complete.
 * The column has to be a NULLABLE one, and the composite self-FK is why
 * that sentence is here rather than assumed: `event_outbox`'s causation
 * key is (household_id, causation_id), and the first version of this
 * nulled both, which failed on household_id being NOT NULL. Grouping by
 * CONSTRAINT rather than by column is what makes the right choice
 * available.
 */
const selfCols = new Map<string, Set<string>>();
const parents = new Map<string, Set<string>>(carried.map((t) => [t, new Set<string>()]));
const byConstraint = new Map<string, { child: string; parent: string; cols: string[] }>();
for (const e of edges as { name: string; child: string; parent: string; col: string }[]) {
  const seen = byConstraint.get(e.name);
  if (seen) { if (!seen.cols.includes(e.col)) seen.cols.push(e.col); }
  else byConstraint.set(e.name, { child: e.child, parent: e.parent, cols: [e.col] });
}
for (const [name, fk] of byConstraint) {
  if (fk.child !== fk.parent) { parents.get(fk.child)!.add(fk.parent); continue; }
  const deferrable = fk.cols.find((c) => nullable.has(`${fk.child}.${c}`));
  if (!deferrable) {
    console.error(`REFUSED: ${name} is a self-reference on ${fk.child} with no nullable column, so the rows cannot be ordered against each other. This needs a deferred-constraint restore, which is a deliberate change rather than something to improvise here.`);
    await pool.end();
    process.exit(1);
  }
  if (!selfCols.has(fk.child)) selfCols.set(fk.child, new Set());
  selfCols.get(fk.child)!.add(deferrable);
}

const order: string[] = [];
const placed = new Set<string>();
while (order.length < carried.length) {
  const next = carried.filter((t) => !placed.has(t) && [...parents.get(t)!].every((p) => placed.has(p)));
  if (next.length === 0) {
    const stuck = carried.filter((t) => !placed.has(t));
    console.error(`REFUSED: the carried tables contain a foreign-key cycle and cannot be ordered: ${stuck.join(", ")}. This needs a deferred-constraint restore, which is a deliberate change rather than something to improvise here.`);
    await pool.end();
    process.exit(1);
  }
  for (const t of next.sort()) { order.push(t); placed.add(t); }
}

console.log(`Restoring ${archive.household.name} from ${oldId} as ${asId} (scope ${archive.manifest.scope}).`);
console.log(`Known losses, from the archive's own manifest:`);
for (const l of archive.manifest.knownLosses) console.log(`  - ${l}`);

if (dryRun) {
  console.log(`  DRY RUN would insert ${archive.people.length} pseudonymised person row(s)`);
  for (const t of order) {
    const n = globalTables.includes(t) ? (archive.globals[t] ?? []).length : archive.manifest.rowCounts[t];
    const skipped = ARCHIVE_PROJECTIONS[t] ? " (SKIPPED: bytes absent, see the known losses)" : "";
    console.log(`  DRY RUN would insert ${n} row(s) into ${t}${skipped}`);
  }
  console.log("DRY RUN: nothing was written.");
  await pool.end();
  process.exit(0);
}

const c = await pool.connect();
let inserted = 0;
let skipped = 0;
try {
  await c.query("BEGIN");

  // People first: every carried table's person columns point here, and
  // twenty of those columns are NOT NULL. ON CONFLICT DO NOTHING so a
  // person already present in the target keeps their real row rather
  // than being overwritten with a pseudonym.
  for (const p of archive.people as { id: string; role: string | null }[]) {
    await c.query(
      `INSERT INTO auth_user (id, name, email) VALUES ($1, NULL, $2) ON CONFLICT (id) DO NOTHING`,
      [p.id, archivePersonEmail(p.id)],
    );
  }

  const hh = { ...archive.household, id: asId };
  const hCols = Object.keys(hh);
  await c.query(
    `INSERT INTO household (${hCols.map((k) => `"${k}"`).join(",")}) VALUES (${hCols.map((_, i) => `$${i + 1}`).join(",")})`,
    hCols.map((k) => hh[k]),
  );

  const deferred: { table: string; id: unknown; col: string; value: unknown }[] = [];
  for (const table of order) {
    // A projected table exports as a manifest and cannot restore: the
    // dropped column is NOT NULL, and inserting a placeholder would
    // write a row claiming a photo with empty bytes. The archive file
    // keeps the manifest; the database does not get the rows.
    if (ARCHIVE_PROJECTIONS[table]) { skipped += archive.manifest.rowCounts[table] ?? 0; continue; }
    const isGlobal = globalTables.includes(table);
    const rows = isGlobal ? (archive.globals[table] ?? []) : (archive.data[table] ?? []);
    const self = selfCols.get(table);
    for (const row of rows) {
      const r = isGlobal ? { ...row } : { ...row, household_id: asId };
      if (self) {
        for (const col of self) {
          if (r[col] != null) { deferred.push({ table, id: r.id, col, value: r[col] }); r[col] = null; }
        }
      }
      const cols = Object.keys(r);
      const conflict = isGlobal ? " ON CONFLICT (id) DO NOTHING" : "";
      await c.query(
        `INSERT INTO "${table}" (${cols.map((k) => `"${k}"`).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})${conflict}`,
        cols.map((k) => bind(table, k, r[k])),
      );
      inserted++;
    }
  }
  // The self-references, once every row of their own table exists.
  for (const d of deferred) {
    await c.query(`UPDATE "${d.table}" SET "${d.col}" = $1 WHERE id = $2`, [bind(d.table, d.col, d.value), d.id]);
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
console.log(`Restored ${inserted} row(s) across ${order.length} tables, plus ${archive.people.length} pseudonymised people.`);
if (skipped > 0) console.log(`${skipped} manifest row(s) deliberately not restored (see the known losses).`);
await pool.end();
