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

// REFERENCE PRE-FLIGHT, AND IT RUNS BEFORE THE DRY-RUN EXIT.
//
// The first version ran it only under --commit, so a dry run printed a
// plan and said nothing about whether that plan was safe. A preview that
// omits the safety check under-reports the risk of the thing it is
// previewing, and the operator reads it as clearance. The check is cheap
// and read-only; there is no reason it should not run in both modes.
//
// Four tables carry a foreign key into
// registry_entry: condition_flag, object_observation, visit_photo and
// capture_artifact. A referenced row cannot be deleted, and finding that
// out from Postgres MID-LOOP is the worst version: the audit row for that
// deletion has already been written, so the trail would assert a deletion
// that never happened, and earlier rows would already be gone.
//
// So the whole run is refused if ANY candidate is referenced. Refusing all
// ten because one is referenced is deliberate: a partial dedupe leaves the
// household in a state neither this tool nor a reader can describe.
const ids = dupes.rows.map((r) => r.id);
const refs = await pool.query(
  `SELECT 'condition_flag' AS t, registry_entry_id AS id FROM condition_flag WHERE registry_entry_id = ANY($1)
   UNION ALL SELECT 'object_observation', registry_entry_id FROM object_observation WHERE registry_entry_id = ANY($1)
   UNION ALL SELECT 'visit_photo', registry_entry_id FROM visit_photo WHERE registry_entry_id = ANY($1)
   UNION ALL SELECT 'capture_artifact', registry_entry_id FROM capture_artifact WHERE registry_entry_id = ANY($1)`,
  [ids]);
if (refs.rowCount) {
  console.error(`\nREFUSED: ${refs.rowCount} row(s) elsewhere reference these registry entries.`);
  for (const r of refs.rows) {
    const e = dupes.rows.find((d) => d.id === r.id);
    console.error(`  ${r.t} references ${e ? e.label : r.id}`);
  }
  console.error("\nDeleting a referenced entry is not a de-duplication, it is data loss with a");
  console.error("citation left dangling. Nothing was written. Resolve the references first.");
  await pool.end(); process.exit(2);
}
console.log("\nreference pre-flight: no condition flag, observation, photo or capture points at these rows.");

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
  // Audit row FIRST, then the delete, and BOTH IN ONE TRANSACTION.
  //
  // The ordering is the vault posture: no audit row, no deletion. The
  // transaction is the other half, and the first version of this tool
  // lacked it. Without it a failed DELETE leaves a COMMITTED audit row
  // asserting a deletion that did not happen, which is worse than either
  // the deletion or the failure alone: the trail becomes false.
  //
  // Note this is NOT the vault's shared-transaction hazard. There, a
  // rollback would erase the record of a reveal that had already handed
  // out a value, so ordering plus fail-closed is correct and a shared
  // transaction is the unsafe direction. Here nothing escapes the
  // database, so rolling back the pair leaves the world exactly as it
  // was. Same two operations, opposite correct answer, because the
  // question is whether anything outside the transaction saw the result.
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      `INSERT INTO audit_event (id, household_id, actor_user, actor_role, kind, detail)
       VALUES ($1,$2,$3,'corporate_admin','registry_entry_deduped',$4)`,
      [randomUUID(), FERNBROOK_DEMO_ID, actor.rows[0].id,
       JSON.stringify({ entryId: r.id, kind: r.kind, label: r.label,
         reason: "duplicate created by a label rewrite; the original spelling is canonical" })]);
    await c.query("DELETE FROM registry_entry WHERE id = $1", [r.id]);
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK");
    console.error(`\nFAILED on ${r.label}; rolled back, no audit row written for it.`);
    console.error(err instanceof Error ? err.message : err);
    c.release(); await pool.end(); process.exit(1);
  }
  c.release();
}
const after = await pool.query(
  "SELECT count(*)::int AS n FROM registry_entry WHERE household_id = $1", [FERNBROOK_DEMO_ID]);
console.log(`\ndeleted ${dupes.rowCount}, each with an audit row first. Registry now: ${after.rows[0].n}`);
await pool.end();
