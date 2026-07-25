import { test, expect } from "@playwright/test";
import pg from "pg";

/**
 * G-05: the floor-bypass live assertion (Addendum A2 finding 7 — "someone
 * will eventually exclude their way into a hazard"). Runs against the same
 * live stack as the airplane test: real DB, real dev server, the REAL
 * scheduler path via the dev-gated /api/dev/trigger-pass endpoint.
 *
 * The claim under test, end to end:
 *  1. With a scope=all exclusion active on the household, a rule step whose
 *     methodRef resolves to a FLOOR-tier provision still schedules its
 *     prompt; the ordinary step on the same rule is suppressed.
 *  2. With the exclusion ended, the ordinary step schedules again — proving
 *     the suppression in (1) was the exclusion, not an accident.
 */

const DB = process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept";
const pool = new pg.Pool({ connectionString: DB });

const FLOOR_ID = "STD-999.9.1"; // synthetic fixture provision, floor tier
const FLOOR_TEXT = "G05 floor-backed step: verify the safety floor holds.";
const PLAIN_TEXT = "G05 ordinary step: this one is excludable.";
const BINDS = "g05 floor probe";

async function promptExists(householdId: string, text: string): Promise<boolean> {
  const { rows } = await pool.query(
    "SELECT 1 FROM prompt_pack_item WHERE household_id=$1 AND item_text=$2 LIMIT 1",
    [householdId, text],
  );
  return rows.length > 0;
}

test("G-05: exclusions never suppress a floor (live scheduler path)", async ({ request }) => {
  const { rows: [hh] } = await pool.query("SELECT id FROM household WHERE name ILIKE '%fernbrook%' LIMIT 1");
  expect(hh, "seeded Fernbrook household").toBeTruthy();
  const { rows: [user] } = await pool.query("SELECT id FROM auth_user LIMIT 1");
  expect(user, "a seeded auth user for approved_by").toBeTruthy();

  const ruleId = crypto.randomUUID();
  const exclusionId = crypto.randomUUID();
  try {
    // Fixture floor provision (floor_1 → overridable=false is generated).
    await pool.query(
      `INSERT INTO standard_provision (id, document, section, ordinal, text, tier, scope, kind, effective_date)
       VALUES ($1, 'STD-999', 9, 1, 'G05 fixture floor provision', 'floor_1', '{}', 'rule', CURRENT_DATE)
       ON CONFLICT (id) DO NOTHING`,
      [FLOOR_ID],
    );
    // One rule, two steps: floor-backed and ordinary.
    await pool.query(
      `INSERT INTO trigger_rule (id, household_id, family, binds_to_field_name, enabled, definition, created_at, updated_at)
       VALUES ($1, NULL, 'signal', $2, true, $3, now(), now())`,
      [ruleId, BINDS, JSON.stringify({
        packName: "g05-floor-probe",
        items: [
          { offsetDays: 1, text: FLOOR_TEXT, methodRef: FLOOR_ID },
          { offsetDays: 1, text: PLAIN_TEXT },
        ],
      })],
    );
    // A scope=all exclusion — the strongest possible suppression.
    await pool.query(
      `INSERT INTO anticipation_exclusion (id, household_id, scope, target, reason, requested_by, approved_by, effective_from)
       VALUES ($1, $2, 'all', '', 'G05 fixture', 'corporate', $3, now() - interval '1 hour')`,
      [exclusionId, hh.id, user.id],
    );

    // Pass 1: exclusion active. Floor survives; ordinary is suppressed.
    const r1 = await request.post("/api/dev/trigger-pass", {
      data: { householdId: hh.id, fieldName: "G05 floor probe field", newValue: "engaged", changedAt: new Date().toISOString() },
    });
    expect(r1.ok(), `trigger-pass status ${r1.status()}`).toBeTruthy();
    expect(await promptExists(hh.id, FLOOR_TEXT), "floor-backed prompt scheduled DESPITE scope=all exclusion").toBe(true);
    expect(await promptExists(hh.id, PLAIN_TEXT), "ordinary prompt suppressed by the exclusion").toBe(false);

    // Pass 2: exclusion ended. The ordinary step schedules — the earlier
    // absence was the exclusion working, not a broken rule.
    await pool.query("UPDATE anticipation_exclusion SET effective_to = now() - interval '1 second' WHERE id=$1", [exclusionId]);
    const r2 = await request.post("/api/dev/trigger-pass", {
      data: { householdId: hh.id, fieldName: "G05 floor probe field", newValue: "engaged", changedAt: new Date(Date.now() + 1000).toISOString() },
    });
    expect(r2.ok(), `trigger-pass status ${r2.status()}`).toBeTruthy();
    expect(await promptExists(hh.id, PLAIN_TEXT), "ordinary prompt schedules once the exclusion ends").toBe(true);
  } finally {
    // Fixture cleanup (test data in a dev DB, not domain data).
    await pool.query("DELETE FROM prompt_pack_item WHERE item_text IN ($1, $2)", [FLOOR_TEXT, PLAIN_TEXT]);
    await pool.query("DELETE FROM anticipation_exclusion WHERE id=$1", [exclusionId]);
    await pool.query("DELETE FROM trigger_rule WHERE id=$1", [ruleId]);
    await pool.query("DELETE FROM standard_provision WHERE id=$1 AND text='G05 fixture floor provision'", [FLOOR_ID]);
    await pool.end();
  }
});
