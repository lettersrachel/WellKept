/**
 * load-seed.ts : load a wk_import.py seed JSON into the local dev database.
 * Usage: node src/load-seed.ts [path/to/seed.json]
 * Defaults to the Fernbrook template seed. Upserts by UUID (re-runs are
 * idempotent, matching the importer's UUID-preservation rule); never deletes.
 */
import { readFile } from "node:fs/promises";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { household, playbookField } from "./tables.ts";

interface SeedField {
  id: string; section: number; name: string; value: string;
  provenance: string; provenanceDate: string; sensitivity: "s1" | "s2" | "s3";
  confirmed: boolean; flag: string; note: string;
}
interface Seed {
  household: { id: string; name: string; tier: "essential" | "family_ops" | "concierge" };
  fields: SeedField[];
}

const seedPath = process.argv[2]
  ?? new URL("../../../tooling/seed/fernbrook_template_seed.json", import.meta.url).pathname;
const seed = JSON.parse(await readFile(seedPath, "utf8")) as Seed;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

await db.insert(household).values({
  id: seed.household.id, name: seed.household.name, tier: seed.household.tier,
}).onConflictDoNothing();

const PROVENANCE = new Set(["asked", "observed", "verified_by_touch", "client_written", "unconfirmed"]);
const FLAGS = new Set(["none", "CRITICAL", "CAUTION", "DELIGHT"]);

let n = 0;
for (const f of seed.fields) {
  const row = {
    id: f.id,
    householdId: seed.household.id,
    section: f.section,
    name: f.name,
    value: f.value,
    note: f.note,
    sensitivity: f.sensitivity,
    // fail closed on vocabulary drift rather than guessing
    provenance: (PROVENANCE.has(f.provenance) ? f.provenance : "unconfirmed") as
      "asked" | "observed" | "verified_by_touch" | "client_written" | "unconfirmed",
    provenanceDate: f.provenanceDate ? new Date(f.provenanceDate) : null,
    confirmed: f.confirmed,
    flag: (FLAGS.has(f.flag) ? f.flag : "none") as "none" | "CRITICAL" | "CAUTION" | "DELIGHT",
  };
  await db.insert(playbookField).values(row).onConflictDoUpdate({
    target: playbookField.id,
    set: { value: row.value, note: row.note, sensitivity: row.sensitivity,
           provenance: row.provenance, provenanceDate: row.provenanceDate,
           confirmed: row.confirmed, flag: row.flag, name: row.name,
           section: row.section, updatedAt: new Date() },
  });
  n++;
}
console.log(`seeded household "${seed.household.name}" (${seed.household.id}): ${n} playbook_field rows upserted`);
await pool.end();
