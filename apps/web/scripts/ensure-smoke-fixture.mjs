/**
 * Deploy runbook phase 0, as one idempotent command: create-or-find the
 * permanent Smoke Test Fixture household, set its fixture flag, optionally
 * grant a corporate_admin contact, and print the uuid the checklist needs.
 * Safe to run every deploy session — it changes nothing that already holds.
 *
 * Run from apps/web so `pg` resolves:
 *   DATABASE_URL="<url>" node scripts/ensure-smoke-fixture.mjs [admin-email]
 */
import { randomUUID } from "node:crypto";
import pg from "pg";

const FIXTURE_NAME = "Smoke Test Fixture";
const email = process.argv[2]?.trim().toLowerCase() ?? null;

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL."); process.exit(1); }
const c = new pg.Client({ connectionString: url });
await c.connect();

let { rows: [hh] } = await c.query("SELECT id, is_fixture, archived_at FROM household WHERE name=$1", [FIXTURE_NAME]);
if (!hh) {
  const id = randomUUID();
  await c.query(
    `INSERT INTO household (id, name, tier, status_tag, is_fixture, created_at, updated_at)
     VALUES ($1, $2, 'family_ops', 'STEADY', true, now(), now())`,
    [id, FIXTURE_NAME],
  );
  hh = { id, is_fixture: true, archived_at: null };
  console.log(`Created "${FIXTURE_NAME}".`);
} else {
  if (!hh.is_fixture) {
    await c.query("UPDATE household SET is_fixture=true, updated_at=now() WHERE id=$1", [hh.id]);
    console.log("Fixture flag set (was unset).");
  }
  if (hh.archived_at) {
    await c.query("UPDATE household SET archived_at=NULL, updated_at=now() WHERE id=$1", [hh.id]);
    console.log("Un-archived (the fixture is permanent).");
  }
}

if (email) {
  await c.query(
    "INSERT INTO auth_user (id, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
    [randomUUID(), email],
  );
  const { rows: [user] } = await c.query("SELECT id FROM auth_user WHERE email=$1", [email]);
  const { rows: existing } = await c.query(
    "SELECT id FROM household_role_assignment WHERE user_id=$1 AND household_id=$2",
    [user.id, hh.id],
  );
  if (existing.length === 0) {
    await c.query(
      `INSERT INTO household_role_assignment (id, user_id, household_id, role, nda_approved, created_at)
       VALUES ($1, $2, $3, 'corporate_admin', false, now())`,
      [randomUUID(), user.id, hh.id],
    );
    console.log(`corporate_admin granted to ${email}.`);
  }
}

console.log(`\nFIXTURE_UUID = ${hh.id}\n`);
await c.end();
