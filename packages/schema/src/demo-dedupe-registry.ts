/**
 * demo-dedupe-registry.ts : remove the duplicate registry entries a label
 * rewrite created on Fernbrook (pnpm db:demo-dedupe).
 *
 * WHAT HAPPENED. `db:demo` seeds registry entries idempotently BY LABEL.
 * A copy pass rewrote ten labels to strip em dashes, so the seed no longer
 * recognised the existing rows and inserted ten more beside them.
 * Fernbrook went from fourteen registry entries to twenty-four, both
 * spellings live. The label is an identifier as well as display copy, and
 * that is the F3 finding in a new table.
 *
 * WHICH ROWS GO. The NEW ones, the rewritten spellings. The originals are
 * canonical because existing prompt_pack_item texts were generated from
 * them ("Occasion radar: Mia ... on August 2"), so keeping the originals
 * keeps the prompts consistent with the entries they came from. The source
 * has been reverted to match.
 *
 * DRY RUN BY DEFAULT. Nothing is deleted without --commit, and --commit
 * requires --by <email> resolving to a corporate_admin, the db:grant
 * shape. Every deletion writes an audit_event first, because
 * registry_entry is NOT one of the nine documented DELETE exceptions and a
 * row leaving this table with no trail is exactly what that rule exists to
 * prevent.
 *
 *   pnpm db:demo-dedupe                          # dry run, prints the plan
 *   pnpm db:demo-dedupe --commit --by you@x.com  # audited delete
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { FERNBROOK_DEMO_ID } from "../../../tooling/fixture-ids.mjs";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const byIdx = args.indexOf("--by");
const BY = byIdx > -1 ? args[byIdx + 1] : undefined;

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});

// The ten rewritten spellings, named exactly. NOT a pattern: a pattern
// would match whatever else happens to look like it, and this deletes.
const REWRITTEN = [
  "Mia's birthday", "Gram Ruth's birthday", "Owen's clothing", "Owen's shoes",
  "Mia's clothing", "Mia's shoes", "Rosa, housekeeper", "Ben, dog walker",
  "Trupanion for Biscuit", "Owen starts kindergarten",
];

const hh = await pool.query("SELECT id, name FROM household WHERE id = $1", [FERNBROOK_DEMO_ID]);
if (!hh.rowCount) { console.error(`No household at the pinned Fernbrook id ${FERNBROOK_DEMO_ID}.`); process.exit(1); }
console.log(`Fernbrook resolved by pinned id: ${hh.rows[0].name}`);

const dupes = await pool.query(
  `SELECT id, kind, label, created_at FROM registry_entry
    WHERE household_id = $1 AND label = ANY($2) ORDER BY label`,
  [FERNBROOK_DEMO_ID, REWRITTEN]);

const total = await pool.query(
  "SELECT count(*)::int AS n FROM registry_entry WHERE household_id = $1", [FERNBROOK_DEMO_ID]);

console.log(`\nregistry entries on Fernbrook: ${total.rows[0].n}`);
console.log(`rewritten-spelling rows found: ${dupes.rowCount}\n`);
for (const r of dupes.rows) console.log(`  ${r.kind.padEnd(14)} ${r.label}`);

if (!dupes.rowCount) { console.log("\nNothing to do."); await pool.end(); process.exit(0); }

// A row whose ORIGINAL twin is missing must not be deleted: that would
// remove the entry entirely rather than de-duplicating it. Checked per
// row, because "there are ten of each" is an assumption and this deletes.
const originals = await pool.query(
  `SELECT kind, label FROM registry_entry WHERE household_id = $1 AND label <> ALL($2)`,
  [FERNBROOK_DEMO_ID, REWRITTEN]);
const haveOriginal = new Set(originals.rows.map((r) => `${r.kind}`));
const orphans = dupes.rows.filter((r) => !haveOriginal.has(r.kind));
if (orphans.length) {
  console.error(`\nREFUSED: ${orphans.length} rewritten row(s) have no original of the same kind to fall back to.`);
  console.error("Deleting them would remove the entry, not the duplicate. Resolve by hand.");
  await pool.end(); process.exit(2);
}

if (!COMMIT) {
  console.log(`\nDRY RUN. ${dupes.rowCount} row(s) would be deleted, leaving ${total.rows[0].n - dupes.rowCount}.`);
  console.log("Re-run with --commit --by <corporate admin email> to apply.");
  await pool.end(); process.exit(0);
}

if (!BY) { console.error("\n--commit requires --by <email>; a deletion with no actor is what the audit rule forbids."); await pool.end(); process.exit(1); }
const actor = await pool.query(
  `SELECT u.id FROM auth_user u JOIN household_role_assignment a ON a.user_id = u.id
    WHERE u.email = $1 AND a.household_id = $2 AND a.role = 'corporate_admin'`,
  [BY, FERNBROOK_DEMO_ID]);
if (!actor.rowCount) { console.error(`\n${BY} is not a corporate_admin on this household. Refusing.`); await pool.end(); process.exit(1); }

for (const r of dupes.rows) {
  // Audit row FIRST, then the delete. Same ordering as the vault: no row,
  // no deletion.
  await pool.query(
    `INSERT INTO audit_event (id, household_id, actor_user, actor_role, kind, detail)
     VALUES ($1,$2,$3,'corporate_admin','registry_entry_deduped',$4)`,
    [randomUUID(), FERNBROOK_DEMO_ID, actor.rows[0].id,
     JSON.stringify({ entryId: r.id, kind: r.kind, label: r.label,
       reason: "duplicate created by a label rewrite; the original spelling is canonical" })]);
  await pool.query("DELETE FROM registry_entry WHERE id = $1", [r.id]);
}
const after = await pool.query(
  "SELECT count(*)::int AS n FROM registry_entry WHERE household_id = $1", [FERNBROOK_DEMO_ID]);
console.log(`\ndeleted ${dupes.rowCount}, each with an audit row first. Registry now: ${after.rows[0].n}`);
await pool.end();
