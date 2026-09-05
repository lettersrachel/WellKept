/**
 * export-household.ts : the provider-independent export (pnpm db:export-household).
 *
 * Q-8b. A CORPORATE ACT today: the member-facing control is FREEZE-GATED
 * (WK-DEV-007, Part C section 2.2), so generation happens on the
 * member's request rather than at their keystroke. Nothing here is a
 * member surface.
 *
 * THE SCOPE IS EXPLICIT AND HAS NO DEFAULT (founder ruling, 5 September
 * 2026, ruling 3). A default would be this session choosing which of
 * two audiences an archive is for, and the two carry different sets;
 * refusing without --scope is the same posture as db:capacity refusing
 * without --set-by.
 *
 * Usage:
 *   pnpm db:export-household --household <uuid> --scope corporate|member --out <file>
 */
import pg from "pg";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  archiveTableSet, ARCHIVE_EXCLUSIONS, ARCHIVE_PROJECTIONS,
  ARCHIVE_FORMAT_VERSION, ARCHIVE_KNOWN_LOSSES, ARCHIVE_PHOTO_LOSS,
  ARCHIVE_SCOPES, MEMBER_ROW_FILTERS, MEMBER_SCOPE, REFERENCED_GLOBAL_TABLES,
  type ArchivePerson, type ArchiveScope,
} from "./household-archive.ts";

const argv = process.argv.slice(2);
const arg = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const householdId = arg("--household");
const out = arg("--out");
const scopeArg = arg("--scope");
if (!householdId || !out || !scopeArg) {
  console.error("REFUSED: --household <uuid>, --scope corporate|member and --out <file> are all required.");
  process.exit(1);
}
if (!ARCHIVE_SCOPES.includes(scopeArg as ArchiveScope)) {
  console.error(`REFUSED: --scope must be one of ${ARCHIVE_SCOPES.join(", ")}. There is no default, because the two scopes carry different sets and picking one for the caller would be deciding who the archive is for.`);
  process.exit(1);
}
const scope = scopeArg as ArchiveScope;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});

const { rows: hh } = await pool.query("SELECT * FROM household WHERE id = $1", [householdId]);
if (hh.length === 0) {
  console.error(`REFUSED: no household ${householdId}.`);
  await pool.end();
  process.exit(1);
}

const set = archiveTableSet(scope);
const data: Record<string, unknown[]> = {};
const rowCounts: Record<string, number> = {};
const rowFilters: Record<string, string> = {};

for (const { table } of set) {
  const projection = ARCHIVE_PROJECTIONS[table];
  // Member-scope row filters: a table can be member-visible while some
  // of its ROWS are not. Corporate takes every row.
  const filter = scope === "member" ? MEMBER_ROW_FILTERS[table] : undefined;
  if (filter) rowFilters[table] = filter;
  const where = filter ? `household_id = $1 AND (${filter})` : "household_id = $1";
  const { rows } = await pool.query(`SELECT * FROM "${table}" WHERE ${where}`, [householdId]);
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

/**
 * The GLOBAL referenced rows (ruling 2). Only what the household's own
 * rows point at, computed by reading the referencing column rather than
 * by listing ids: a household's archive is not the place to ship the
 * company's whole reusable work catalog.
 */
const globals: Record<string, unknown[]> = {};
for (const [table, spec] of Object.entries(REFERENCED_GLOBAL_TABLES)) {
  if (!set.some((t) => t.table === spec.via)) { globals[table] = []; continue; }
  const { rows } = await pool.query(
    `SELECT g.* FROM "${table}" g WHERE g.id IN (SELECT DISTINCT "${spec.column}" FROM "${spec.via}" WHERE household_id = $1)`,
    [householdId],
  );
  globals[table] = rows;
}

/**
 * THE PEOPLE SET IS COMPUTED FROM THE SCHEMA'S OWN FOREIGN KEYS, never
 * from a hand-written column list. A column added tomorrow that points
 * at auth_user is collected without anyone remembering it; a hand list
 * would go stale and the restore would fail on the FK it forgot, which
 * is exactly how the first round trip failed.
 */
const carried = [...set.map((t) => t.table), ...Object.keys(REFERENCED_GLOBAL_TABLES)];
const { rows: personCols } = await pool.query(
  `SELECT tc.table_name AS t, kcu.column_name AS c
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'auth_user'
      AND tc.table_name = ANY($1::text[])`,
  [carried],
);

const personIds = new Set<string>();
for (const { t, c } of personCols as { t: string; c: string }[]) {
  const source = globals[t] ?? data[t] ?? [];
  for (const row of source as Record<string, unknown>[]) {
    const v = row[c];
    if (typeof v === "string" && v.length > 0) personIds.add(v);
  }
}

const people: ArchivePerson[] = [];
if (personIds.size > 0) {
  const { rows: roles } = await pool.query(
    `SELECT user_id, role FROM household_role_assignment WHERE household_id = $1 AND user_id = ANY($2::text[])`,
    [householdId, [...personIds]],
  );
  const roleOf = new Map<string, string>(roles.map((r: { user_id: string; role: string }) => [r.user_id, r.role]));
  for (const id of [...personIds].sort()) people.push({ id, role: roleOf.get(id) ?? null });
}

const { rows: journal } = await pool.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations");

const knownLosses = [...ARCHIVE_KNOWN_LOSSES];
if (set.some((t) => t.projected)) knownLosses.push(ARCHIVE_PHOTO_LOSS);
if (scope === "member") {
  knownLosses.push(
    "This is the MEMBER scope: it carries only what the portability line names and what the tree has already decided reaches the household. It is deliberately NOT a complete copy of the record; the corporate scope is.",
  );
}

const archive = {
  manifest: {
    formatVersion: ARCHIVE_FORMAT_VERSION,
    scope,
    generatedAt: new Date().toISOString(),
    householdId,
    migrationCount: journal[0]?.n ?? 0,
    tables: set.map((t) => t.table),
    exclusions: ARCHIVE_EXCLUSIONS,
    projections: Object.fromEntries(Object.entries(ARCHIVE_PROJECTIONS).map(([k, v]) => [k, v.why])),
    rowFilters,
    globals: Object.fromEntries(Object.entries(globals).map(([k, v]) => [k, v.length])),
    peopleCount: people.length,
    rowCounts,
    knownLosses,
    ...(scope === "member"
      ? { memberScope: Object.fromEntries(Object.entries(MEMBER_SCOPE).map(([k, v]) => [k, v.category])) }
      : {}),
  },
  household: hh[0],
  people,
  globals,
  data,
};

writeFileSync(out, JSON.stringify(archive, null, 2));
const total = Object.values(rowCounts).reduce((a, b) => a + b, 0);
console.log(`${hh[0].name}: scope ${scope}, ${set.length} tables, ${total} rows, ${people.length} pseudonymised people, migration count ${archive.manifest.migrationCount}.`);
console.log(`Excluded from every scope: ${Object.keys(ARCHIVE_EXCLUSIONS).join(", ")}.`);
for (const [t, n] of Object.entries(globals)) console.log(`Referenced global rows: ${t} ${n.length}.`);
console.log(`Wrote ${out}.`);
await pool.end();
