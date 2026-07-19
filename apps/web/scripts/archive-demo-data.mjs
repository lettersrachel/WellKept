/**
 * Go-live cleanup: soft-archive demo households and revoke demo-account
 * sessions, so real pilot data starts clean. Nothing is hard-deleted
 * (DEV-005 S3) — households get archived_at, demo sessions are dropped, and
 * demo accounts are only REPORTED (you revoke them from People & access, so a
 * real person accidentally matching a pattern is never removed by a script).
 *
 * Dry-run by default. Run from apps/web so `pg` resolves:
 *   DATABASE_URL="<neon-url>" node scripts/archive-demo-data.mjs          # preview
 *   DATABASE_URL="<neon-url>" node scripts/archive-demo-data.mjs --commit # apply
 */
import pg from "pg";

const COMMIT = process.argv.includes("--commit");
const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL (the Neon connection string)."); process.exit(1); }

// Demo households by name; demo accounts by the *.demo email domains the seed
// uses. The real founder login (a real mailbox) can never match either.
const HOUSEHOLD_MATCH = "(name ILIKE '%demo%' OR name = 'Field Test Home')";
const DEMO_EMAIL = "email LIKE '%.demo'";

const c = new pg.Client({ connectionString: url });
await c.connect();

const households = (await c.query(`SELECT id, name, archived_at FROM household WHERE ${HOUSEHOLD_MATCH} ORDER BY name`)).rows;
const demoUsers = (await c.query(`SELECT id, email FROM auth_user WHERE ${DEMO_EMAIL} ORDER BY email`)).rows;

console.log(`\n${COMMIT ? "APPLYING" : "DRY RUN (no changes)"} — demo cleanup\n`);

console.log("Demo households to archive:");
for (const h of households) console.log(`  - ${h.name}${h.archived_at ? " (already archived)" : ""}`);
if (households.length === 0) console.log("  (none found)");

console.log("\nDemo accounts (their sessions will be revoked; remove the accounts from People & access):");
for (const u of demoUsers) console.log(`  - ${u.email}`);
if (demoUsers.length === 0) console.log("  (none found)");

if (!COMMIT) {
  console.log("\nRe-run with --commit to archive the households and revoke demo sessions.\n");
  await c.end();
  process.exit(0);
}

const ids = households.filter((h) => !h.archived_at).map((h) => h.id);
if (ids.length) {
  await c.query(`UPDATE household SET archived_at = now(), updated_at = now() WHERE id = ANY($1::uuid[])`, [ids]);
  console.log(`\nArchived ${ids.length} household(s).`);
}
const userIds = demoUsers.map((u) => u.id);
if (userIds.length) {
  const r = await c.query(`DELETE FROM auth_session WHERE user_id = ANY($1::text[])`, [userIds]);
  console.log(`Revoked ${r.rowCount} demo session(s).`);
}
console.log("Done. Demo accounts are left in place — revoke them from the People & access panel.\n");
await c.end();
