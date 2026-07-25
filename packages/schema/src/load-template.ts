/**
 * load-template.ts : backfill the 258-field intake template into an EXISTING
 * household. Fields the household already has (matched on section + name)
 * are never touched; only the missing template rows are inserted, blank and
 * unconfirmed, with the template's inferred sensitivity as the fail-closed
 * starting point. This is how a household created outside the seed pipeline
 * (e.g. Field Test Home) gets the full instrument for Intake mode.
 *
 * Usage: node src/load-template.ts --household "Name"
 */
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { household, playbookField, auditEvent } from "./tables.ts";

const args = process.argv.slice(2);
const hhFlag = args.indexOf("--household");
const householdName = hhFlag >= 0 ? args[hhFlag + 1] : null;
if (!householdName) {
  console.error('Usage: node src/load-template.ts --household "Name"');
  process.exit(2);
}

interface TemplateField { section: number; name: string; sensitivity: "s1" | "s2" | "s3" }
const seedPath = new URL("../../../tooling/seed/fernbrook_template_seed.json", import.meta.url).pathname;
const template = (JSON.parse(await readFile(seedPath, "utf8")) as { fields: TemplateField[] }).fields;

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

const existing = await db
  .select({ section: playbookField.section, name: playbookField.name })
  .from(playbookField)
  .where(eq(playbookField.householdId, hh.id));
const have = new Set(existing.map((f) => `${f.section}|${f.name}`));

let inserted = 0;
for (const t of template) {
  if (have.has(`${t.section}|${t.name}`)) continue;
  await db.insert(playbookField).values({
    id: randomUUID(),
    householdId: hh.id,
    section: t.section,
    name: t.name,
    value: "",
    note: "",
    sensitivity: t.sensitivity, // template's inferred baseline; capture ratchets up only
    provenance: "unconfirmed",
    confirmed: false,
    flag: "none",
  });
  inserted += 1;
}

await db.insert(auditEvent).values({
  id: randomUUID(), householdId: hh.id,
  actorUser: "00000000-0000-0000-0000-000000000000", actorRole: "corporate_admin",
  kind: "import", detail: { via: "template_backfill", inserted, skippedExisting: have.size },
});

console.log(`"${hh.name}": ${inserted} template fields inserted, ${have.size} existing fields untouched`
  + ` (${template.length} in the instrument)`);
await pool.end();
