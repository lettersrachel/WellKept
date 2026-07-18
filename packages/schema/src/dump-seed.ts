/**
 * dump-seed.ts : snapshot the live household back into seed-JSON shape
 * (the same shape wk_import.py commits), so seed-consuming tools — the
 * branded Playbook export (REQ-017) — run against current data.
 * Usage: node src/dump-seed.ts [out.json]
 */
import { writeFile } from "node:fs/promises";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { asc, eq } from "drizzle-orm";
import { household, playbookField } from "./tables.ts";

const out = process.argv[2] ?? "household_dump.json";
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const [hh] = await db.select().from(household).limit(1);
if (!hh) throw new Error("no household in the database");
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
