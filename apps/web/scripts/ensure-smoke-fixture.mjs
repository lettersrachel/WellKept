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
 *
 * WK_KMS_KEY (the same KEK the app runs on) additionally seeds the s3 value
 * checklist item 5 reveals. Without it every other prop still seeds and the
 * s3 step says so — it is never sealed under a fallback key.
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

// Checklist item 5 needs a revealable s3 value (2026-07-28): the fixture had
// no s3 field and no vault item, so the reveal check could only ever run on a
// demo household — the fourth time a checklist item was routed at the fixture
// and the prop was missing.
//
// Sealed with the SAME KEK the app reads (WK_KMS_KEY), in the same storage
// shape as lib/vault's vaultWrite: ciphertext = the sealed box JSON, key_ref =
// the household's KMS-wrapped data key. If WK_KMS_KEY is absent we SKIP rather
// than fall back to a dev key — a vault item sealed under the wrong KEK is
// worse than no vault item, because the reveal fails at the moment someone is
// trying to verify that reveals work.
//
// The value is deliberately fake. ADR-001 guardrail 2: no real s3 values
// before the vault sprint, and a fixture is never an exception.
const S3_FIELD_NAME = "alarm code";
const kek = process.env.WK_KMS_KEY;
if (!kek) {
  console.log("s3 value NOT seeded: set WK_KMS_KEY to seal it (checklist item 5 needs this).");
} else {
  const { LocalKms, sealValue } = await import("@wellkept/vault");
  // Validate the KEK BEFORE any write: the 32-byte check throws at
  // construction, so a malformed key fails here with the database
  // untouched. The first version inserted the field first and validated
  // after, which on a bad key left exactly the orphan this block claims
  // to prevent (an s3 field whose Reveal button cannot succeed).
  const kms = new LocalKms(kek);
  // Belt and braces: the field and its vault item land in one
  // transaction, so no failure between the two inserts can leave a
  // half-state either.
  await c.query("BEGIN");
  try {
    let { rows: [s3field] } = await c.query(
      "SELECT id FROM playbook_field WHERE household_id=$1 AND name=$2",
      [hh.id, S3_FIELD_NAME],
    );
    if (!s3field) {
      const id = randomUUID();
      // playbook_field.value stays EMPTY for s3 — the plaintext lives only in
      // the vault (vault law); the field row is the handle the UI reveals from.
      await c.query(
        `INSERT INTO playbook_field (id, household_id, section, name, value, sensitivity, created_at, updated_at)
         VALUES ($1, $2, 16, $3, '', 's3', now(), now())`,
        [id, hh.id, S3_FIELD_NAME],
      );
      s3field = { id };
      console.log(`Playbook field "${S3_FIELD_NAME}" seeded (s3, checklist item 5 reveals this).`);
    }
    const { rows: vaulted } = await c.query(
      "SELECT id FROM vault_item WHERE household_id=$1 AND field_id=$2",
      [hh.id, s3field.id],
    );
    if (vaulted.length === 0) {
      // Reuse the household's existing wrapped data key if one exists, exactly
      // as vaultWrite does — one data key per household, not one per value.
      const { rows: [keyed] } = await c.query(
        "SELECT key_ref FROM vault_item WHERE household_id=$1 AND key_ref IS NOT NULL LIMIT 1",
        [hh.id],
      );
      const sealed = sealValue(kms, keyed ? JSON.parse(keyed.key_ref) : null,
        "0000 (smoke-test value, not a real code)");
      await c.query(
        `INSERT INTO vault_item (id, household_id, field_id, ciphertext, key_ref, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [randomUUID(), hh.id, s3field.id, JSON.stringify(sealed.box), JSON.stringify(sealed.wrappedKey)],
      );
      console.log("Vault value sealed (checklist item 5 reveals this; audit row is the proof).");
    }
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK");
    throw err;
  }
}

console.log(`\nFIXTURE_UUID = ${hh.id}\n`);
await c.end();
