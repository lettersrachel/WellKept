/**
 * Run a .sql file against a database and print every result set.
 * READ ONLY, twice over.
 *
 * Exists because psql is not installed on the founder's machine and the
 * verification queries have to be runnable from a checkout. `pg` is
 * already a dependency here, so this adds nothing to the stack.
 *
 * Run from apps/web so `pg` resolves:
 *   DATABASE_URL="$(cat ../../.neon-connection)" node scripts/run-sql-readonly.mjs ../../tooling/verify/partb-db.sql
 *
 * TWO INDEPENDENT CONTROLS, because one of them is a regex and a regex
 * over SQL is a heuristic:
 *
 *   1. A refusal BEFORE connecting. Any statement matching a write verb
 *      outside a comment stops the run, naming the statement. Cheap,
 *      early, and defeatable by anything clever.
 *   2. BEGIN TRANSACTION READ ONLY. Postgres itself refuses the write.
 *      This is the actual wall; control 1 is the friendly error.
 *
 * The connection string is read from the environment and never printed.
 *
 * PROVEN BOTH DIRECTIONS, 27 August 2026, local dev database:
 *   GREEN  the real partb-db.sql ran and printed its four result sets;
 *          exit 0.
 *   RED 1  a file carrying a plain INSERT was refused before connecting,
 *          naming the verb; exit 2.
 *   RED 2  a file whose write is assembled at runtime
 *          (EXECUTE 'ins'||'ert into ...') so the regex counts ZERO write
 *          verbs in it: Postgres refused with "cannot execute INSERT in a
 *          read-only transaction"; exit 1.
 *   RED 2 is the case worth having. It is the only one that shows the
 *   regex is a heuristic and the transaction is the wall. A proof using
 *   only RED 1 would have tested control 1 twice and control 2 never.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql-readonly.mjs <path-to.sql>");
  process.exit(1);
}
const abs = path.resolve(process.cwd(), file);
if (!fs.existsSync(abs)) {
  console.error(`No such file: ${abs}`);
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (never echo it).");
  process.exit(1);
}

const raw = fs.readFileSync(abs, "utf8");

// Control 1. Strip line comments and block comments, then look for write
// verbs. Stripping first is what stops a comment ABOUT a delete from
// refusing the file, which is the shape that would make this guard
// annoying enough to be disabled.
const stripped = raw
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/--[^\n]*/g, " ");
const WRITE_VERBS =
  /\b(insert|update|delete|truncate|drop|alter|create|grant|revoke|comment\s+on|refresh\s+materialized|copy)\b/i;
const offending = stripped.match(WRITE_VERBS);
if (offending) {
  console.error(
    `REFUSED: this runner executes read-only files, and ${abs} contains "${offending[0]}".`,
  );
  console.error("Nothing was connected to and nothing ran.");
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  // Control 2. The wall. A write that got past the regex dies here.
  await client.query("BEGIN TRANSACTION READ ONLY");
  const results = await client.query(raw);
  const sets = Array.isArray(results) ? results : [results];
  let n = 0;
  for (const r of sets) {
    if (!r || !r.rows) continue;
    n += 1;
    console.log(`\n===== result set ${n}: ${r.rows.length} row(s) =====`);
    if (r.rows.length === 0) {
      console.log("(no rows)");
      continue;
    }
    // One field per line. These rows are wide and a table wraps into
    // something nobody can read a boolean out of.
    r.rows.forEach((row, i) => {
      console.log(`--- row ${i + 1} ---`);
      for (const [k, v] of Object.entries(row)) {
        console.log(`${k.padEnd(34)} | ${v === null ? "NULL" : String(v)}`);
      }
    });
  }
  if (n === 0) console.log("The file produced no result sets.");
  await client.query("ROLLBACK");
} finally {
  await client.end();
}
