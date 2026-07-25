/**
 * dump-seed.ts : snapshot a live household back into seed-JSON shape
 * (the same shape wk_import.py commits), so seed-consuming tools — the
 * branded Playbook export (REQ-017), and the parallel-pilot weekly drift
 * diff (`wk_import.py WORKBOOK --against dump.json`, protocol §weekly /
 * gap register G-20) — run against current data.
 * The dump carries NO vault material (G-27): s3 values are structurally
 * absent from playbook_field rows (the vault law), so the worst this file
 * holds is s1/s2 operating detail. It is still a plaintext household record
 * outside the system's controls: write it to a temp path and delete it
 * after use, per the protocol's weekly procedure.
 * Usage: node src/dump-seed.ts [household-uuid] [out.json]
 *   (no uuid: the first household — fine for a fresh dev DB, ambiguous in
 *    prod where demo households exist; the weekly drift check must name it)
 */
import { writeFile } from "node:fs/promises";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { asc, eq } from "drizzle-orm";
import { household, playbookField } from "./tables.ts";

const args = process.argv.slice(2);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const householdId = args.find((a) => UUID_RE.test(a)) ?? null;
const out = args.find((a) => !UUID_RE.test(a)) ?? "household_dump.json";
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const [hh] = householdId
  ? await db.select().from(household).where(eq(household.id, householdId))
  : await db.select().from(household).limit(1);
if (!hh) throw new Error(householdId ? `no household ${householdId}` : "no household in the database");
const fields = await db.select().from(playbookField)
  .where(eq(playbookField.householdId, hh.id))
  .orderBy(asc(playbookField.section), asc(playbookField.name));

const seed = {
  household: { id: hh.id, name: hh.name, tier: hh.tier },
  _meta: { exportedFrom: "live database", at: new Date().toISOString(), fieldCount: fields.length },
  fields: fields.map((f) => ({
    id: f.id,
    section: f.section,
    name: f.name,
    value: f.value,
    provenance: f.provenance,
    provenanceDate: f.provenanceDate ? f.provenanceDate.toISOString().slice(0, 10) : "",
    sensitivity: f.sensitivity,
    confirmed: f.confirmed,
    flag: f.flag,
    note: f.note,
  })),
};
await writeFile(out, JSON.stringify(seed, null, 1));
console.log(`dumped ${fields.length} fields for "${hh.name}" -> ${out}`);
await pool.end();
