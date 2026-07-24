/**
 * load-provisions.ts : load a provision seed JSON into the standards store
 * (WK-APP-003 Addendum A1; CLAUDE_CODE_BRIEF T3).
 *
 * Usage: node src/load-provisions.ts [path/to/provisions_seed.json] [--supersede] [--reviewed]
 * Defaults to tooling/seed/provisions_seed.json.
 *
 * - Validates every row through the zod seed schema (ids unique + tier enum +
 *   text non-empty); any failure aborts before a single write.
 * - Writes standard_provision rows and one provision_version snapshot each —
 *   the store's append-only load record.
 * - Refuses to run against a non-empty store without --supersede. With it,
 *   changed rows get version+1 and a new snapshot; rows absent from the new
 *   seed are reported, never deleted (tombstoning is corporate's call).
 * - Stamps app_setting standards.seed_reviewed=false unless --reviewed: only
 *   the founder's corrected sheet (via tooling/import/wk_provisions.py) loads
 *   with --reviewed, and the briefing read path stays dark until it does.
 *
 * The corrected review xlsx is converted to this JSON shape by
 * tooling/import/wk_provisions.py (openpyxl lives on the Python side of the
 * toolchain per the WK-DEV-003 stack pin; this loader takes JSON only).
 */
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { standardProvision, provisionVersion, appSetting } from "./tables.ts";
import { provisionSeedRowSchema, seedRowToProvision, type StandardProvision } from "./standards.ts";

const args = process.argv.slice(2);
const supersede = args.includes("--supersede");
const reviewed = args.includes("--reviewed");
const seedPath = args.find((a) => !a.startsWith("--"))
  ?? new URL("../../../tooling/seed/provisions_seed.json", import.meta.url).pathname;

if (seedPath.endsWith(".xlsx")) {
  console.error("This loader takes seed JSON. Convert the review workbook first:\n"
    + "  python3 tooling/import/wk_provisions.py REVIEW.xlsx --out corrected_seed.json");
  process.exit(2);
}

const raw = JSON.parse(await readFile(seedPath, "utf8")) as unknown[];

// Validate everything before writing anything (fail loudly, WK-DEV-005 S3).
const failures: string[] = [];
const rows: StandardProvision[] = [];
for (const r of raw) {
  const parsed = provisionSeedRowSchema.safeParse(r);
  if (!parsed.success) {
    const id = (r as { provision_id?: string }).provision_id ?? "<no id>";
    failures.push(`${id}: ${parsed.error.issues[0]?.message}`);
    continue;
  }
  rows.push(seedRowToProvision(parsed.data));
}
const dupes = rows.map((r) => r.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupes.length) failures.push(`duplicate provision ids: ${[...new Set(dupes)].join(", ")}`);
if (failures.length) {
  console.error(`FAIL: ${failures.length} seed problems; nothing written.`);
  for (const f of failures.slice(0, 20)) console.error(`  ! ${f}`);
  process.exit(2);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const existing = await db.select().from(standardProvision);
if (existing.length && !supersede) {
  console.error(`REFUSED: standards store already holds ${existing.length} provisions. `
    + "Re-run with --supersede to version changed rows.");
  await pool.end();
  process.exit(2);
}
const existingById = new Map(existing.map((p) => [p.id, p]));

let inserted = 0;
let versioned = 0;
let unchanged = 0;
for (const row of rows) {
  const prior = existingById.get(row.id);
  const changed = prior && ["text", "tier", "scope", "kind", "pilotDefault", "effectiveDate"]
    .some((c) => JSON.stringify(prior[c as keyof typeof prior]) !== JSON.stringify(row[c as keyof StandardProvision]));
  if (prior && !changed) {
    unchanged += 1;
    continue;
  }
  const version = prior ? prior.version + 1 : row.version;
  const stored = { ...row, version };
  await db.insert(standardProvision).values(stored).onConflictDoUpdate({
    target: standardProvision.id,
    set: { text: stored.text, tier: stored.tier, scope: stored.scope, kind: stored.kind,
           pilotDefault: stored.pilotDefault, effectiveDate: stored.effectiveDate,
           version, updatedAt: new Date() },
  });
  // The append-only load record: one snapshot per version (actorUser null = seed load).
  await db.insert(provisionVersion).values({
    id: randomUUID(), provisionId: stored.id, version, snapshot: stored,
    effectiveDate: stored.effectiveDate, actorUser: null,
  }).onConflictDoNothing();
  if (prior) versioned += 1;
  else inserted += 1;
}

const missing = existing.filter((p) => !rows.some((r) => r.id === p.id));
if (missing.length) {
  console.log(`NOTE: ${missing.length} stored provisions absent from this seed (NOT deleted; `
    + `retire via tombstone if intended): ${missing.slice(0, 10).map((p) => p.id).join(", ")}`);
}

await db.insert(appSetting)
  .values({ key: "standards.seed_reviewed", value: reviewed })
  .onConflictDoUpdate({ target: appSetting.key, set: { value: reviewed, updatedAt: new Date() } });

console.log(`standards store: ${inserted} inserted, ${versioned} versioned, ${unchanged} unchanged `
  + `(${rows.length} seed rows); standards.seed_reviewed=${reviewed}`);
await pool.end();
