/**
 * Deploy runbook phase 0, as one idempotent command: create-or-find the
 * permanent Smoke Test Fixture household, set its fixture flag, optionally
 * grant a corporate_admin contact, and print the uuid the checklist needs.
 * Safe to run every deploy session — it changes nothing that already holds.
 *
 * Run from apps/web so `pg` resolves. The admin email comes from the arg or
 * the WK_ADMIN_EMAIL env var — no personal address hardcoded anywhere:
 *   DATABASE_URL="<url>" node scripts/ensure-smoke-fixture.mjs [admin-email]
 *   DATABASE_URL="<url>" WK_ADMIN_EMAIL=you@example.com node scripts/ensure-smoke-fixture.mjs
 */
import { randomUUID } from "node:crypto";
import pg from "pg";

const FIXTURE_NAME = "Smoke Test Fixture";
const email = (process.argv[2] ?? process.env.WK_ADMIN_EMAIL)?.trim().toLowerCase() || null;

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

// Checklist props (2026-07-27): item 3 needs a cascade-bound field with a
// pending client edit (each smoke run's approval consumes it, so a missing
// pending edit is re-seeded next run); item 11 needs a photo to toggle.
const FIELD_NAME = "medication"; // binds the meds-day cascade -> panel items
let { rows: [field] } = await c.query(
  "SELECT id FROM playbook_field WHERE household_id=$1 AND name=$2",
  [hh.id, FIELD_NAME],
);
if (!field) {
  const id = randomUUID();
  await c.query(
    `INSERT INTO playbook_field (id, household_id, section, name, value, sensitivity, created_at, updated_at)
     VALUES ($1, $2, 16, $3, 'Fixture vitamin, one daily (smoke-test value)', 's2', now(), now())`,
    [id, hh.id, FIELD_NAME],
  );
  field = { id };
  console.log(`Playbook field "${FIELD_NAME}" seeded (cascade-bound, checklist item 3).`);
}
const { rows: pend } = await c.query(
  "SELECT id FROM client_edit WHERE field_id=$1 AND status='pending'",
  [field.id],
);
if (pend.length === 0) {
  await c.query(
    `INSERT INTO client_edit (id, household_id, field_id, proposed_value, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'pending', now(), now())`,
    [randomUUID(), hh.id, field.id,
     `Fixture vitamin, one daily; refill rhythm confirmed ${new Date().toISOString().slice(0, 10)} (smoke-test edit)`],
  );
  console.log("Pending client edit seeded (checklist item 3 approves this).");
}
// A 1x1 transparent PNG: enough for the Hold/Reuse toggles, nothing to purge.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const { rows: photos } = await c.query(
  "SELECT id FROM visit_photo WHERE household_id=$1 AND uploaded_by='smoke-fixture'",
  [hh.id],
);
if (photos.length === 0) {
  await c.query(
    `INSERT INTO visit_photo (id, household_id, content_type, data, bytes, uploaded_by, created_at)
     VALUES ($1, $2, 'image/png', $3, $4, 'smoke-fixture', now())`,
    [randomUUID(), hh.id, PNG, Buffer.from(PNG, "base64").length],
  );
  console.log("Visit photo seeded (checklist item 11 toggles this).");
}

console.log(`\nFIXTURE_UUID = ${hh.id}\n`);
await c.end();
