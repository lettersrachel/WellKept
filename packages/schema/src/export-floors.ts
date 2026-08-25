/**
 * export-floors.ts : export the floor rows for the founder's review
 * afternoon (pnpm db:export-floors), per the 25 August proceed
 * instructions (register A581 adjacency; the 300-row floor review is
 * the gate behind which the entire standards library stays dark).
 *
 * Reads the STORE, never the seed: seen_tier must be the tier the
 * reviewer actually saw (the session V lesson: the keep branch once
 * carried BASE-seed tiers and silently reverted a drifted store row).
 * Output is the flat TSV shape the tested merge script
 * (tooling/import/wk_floor_review.py) requires: provision_id,
 * seen_tier, DECISION, NOTE, with context columns after them (columns
 * resolve by header name, extras are ignored). DECISION arrives blank:
 * blank is not keep, and the merge script refuses a partial import
 * without --allow-partial, so an unfinished review cannot slip in.
 *
 * Usage: DATABASE_URL=... pnpm db:export-floors [--out floors.tsv]
 * The file lands beside the invocation; nothing is written to the
 * database. Never prints the connection string.
 */
import { writeFileSync } from "node:fs";
import pg from "pg";
import { inArray, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { standardProvision } from "./tables.ts";

const argv = process.argv.slice(2);
const outIdx = argv.indexOf("--out");
const outPath = outIdx >= 0 ? argv[outIdx + 1]! : "floor-review-export.tsv";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const rows = await db.select().from(standardProvision)
  .where(inArray(standardProvision.tier, ["floor_1", "floor_2"]))
  .orderBy(asc(standardProvision.document), asc(standardProvision.section), asc(standardProvision.ordinal));

const f1 = rows.filter((r) => r.tier === "floor_1").length;
const f2 = rows.filter((r) => r.tier === "floor_2").length;

// The inputs doctrine: an empty result means the store is unseeded or
// the connection points at the wrong database, and an empty file
// delivered as "the floor review" is a vacuous artifact. Refuse.
if (rows.length === 0) {
  console.error("REFUSED: 0 floor rows in the store. Either the provisions were never loaded " +
    "here or DATABASE_URL points at the wrong database; not writing an empty review workbook.");
  await pool.end();
  process.exit(1);
}

// Tab-safe: provision text is prose and can carry anything; tabs and
// newlines inside a cell would shear the TSV, so they flatten to spaces
// (the text column is context for reading, never re-imported).
const cell = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();

const header = ["provision_id", "seen_tier", "DECISION", "NOTE", "document", "section", "ordinal", "text"];
const lines = [header.join("\t")];
for (const r of rows) {
  lines.push([r.id, r.tier, "", "", r.document, String(r.section), String(r.ordinal), cell(r.text)].join("\t"));
}
writeFileSync(outPath, lines.join("\n") + "\n");

console.log(`exported ${rows.length} floor rows (${f1} floor_1, ${f2} floor_2) to ${outPath}`);
if (rows.length !== 300 || f1 !== 189 || f2 !== 111) {
  console.log(`NOTE: counts differ from the review brief's 300 (189 floor_1, 111 floor_2); ` +
    `the STORE is the truth, but read the difference before reviewing (a drifted count is information).`);
}
await pool.end();
