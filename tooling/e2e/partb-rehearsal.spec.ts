import { test, expect } from "@playwright/test";
import pg from "pg";
import { randomUUID } from "node:crypto";

/**
 * Part B rehearsal, LOCAL ONLY. Not a substitute for the production run.
 * Executes docs/PART_B_SERVE_VERIFICATION.md v1.2 step for step against a
 * local build so the SCRIPT is validated before the founder spends a
 * production sitting on it: every query runs, every assertion is
 * checkable, and a failure here is the script's fault rather than
 * production's.
 */
const DB = process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept";
const BASE = process.env.BASE ?? "http://localhost:3001";
const pool = new pg.Pool({ connectionString: DB });

const STAMP = "REHEARSAL-" + randomUUID().slice(0, 8);
const RULE_TEXT = `PARTB-0057-${STAMP}-do-not-move-the-blue-bin`;
const RETIRE_REASON = `PARTB-retire-check-${STAMP}`;
const SITUATION_LABEL = `PARTB-0056-${STAMP}-front-gate-latch`;
const RESOLVE_NOTE = `PARTB-resolve-check-${STAMP}`;

let fixtureId = "";
let token = "";
let skipReason = "";

test.beforeAll(async () => {
  // The Smoke Test Fixture is seeded by ensure-smoke-fixture.mjs, which CI
  // does not run (ci.yml seeds db:seed only). So this rehearsal SKIPS in
  // CI with its reason printed, rather than failing there or, worse,
  // passing vacuously. Seed the fixture and it runs.
  const { rows } = await pool.query(
    "SELECT id, name, is_fixture FROM household WHERE name = 'Smoke Test Fixture'");
  if (rows.length !== 1) {
    skipReason = "no Smoke Test Fixture in this database; run apps/web/scripts/ensure-smoke-fixture.mjs first";
    return;
  }
  // P4: resolve the fixture id by query, never trust a written value.
  expect(rows[0].is_fixture).toBe(true);
  expect(rows[0].id).not.toBe("d05ab5a2-7d9c-4cff-919a-250adafa0355");
  fixtureId = rows[0].id;

  // P5: the acting identity holds a corporate role ON THE FIXTURE.
  const { rows: [who] } = await pool.query(
    `SELECT u.id, u.email, a.role FROM household_role_assignment a
       JOIN auth_user u ON u.id = a.user_id
      WHERE a.household_id = $1 AND a.role IN ('corporate_admin','corporate_ops')
      LIMIT 1`, [fixtureId]);
  if (!who) {
    skipReason = "no corporate identity on the fixture: an access outcome, not a serve failure";
    return;
  }

  token = randomUUID() + randomUUID();
  await pool.query(
    "INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [token, who.id, new Date(Date.now() + 3600_000)]);
});

test.afterAll(async () => {
  if (!fixtureId) { await pool.end(); return; }
  await pool.query("DELETE FROM event_outbox WHERE household_id = $1", [fixtureId]);
  await pool.query("DELETE FROM audit_event WHERE household_id = $1 AND kind LIKE 'preference%'", [fixtureId]);
  await pool.query("DELETE FROM preference_rule WHERE household_id = $1", [fixtureId]);
  await pool.query("DELETE FROM situation WHERE household_id = $1", [fixtureId]);
  await pool.query("DELETE FROM auth_session WHERE session_token = $1", [token]);
  await pool.end();
});

test("Part B rehearsal: A1-A4 and B1-B4 and C, against a local build", async ({ context, page }) => {
  test.skip(Boolean(skipReason), skipReason);
  await context.addCookies([{ name: "authjs.session-token", value: token, url: BASE }]);
  const drill = `/oversight/${fixtureId}`;

  // ---- A1: empty state
  await page.goto(drill);
  const prefCard = page.locator("div.card", { hasText: "Preference rules (WK-DEV-007" });
  await expect(prefCard.getByText("No preference rules on record.")).toBeVisible({ timeout: 30_000 });
  let { rows: [c] } = await pool.query(
    "SELECT count(*)::int n FROM preference_rule WHERE household_id=$1", [fixtureId]);
  expect(c.n, "dirty fixture: A3's assertions would not be interpretable").toBe(0);

  // ---- negative check: three characters must refuse and write nothing
  await prefCard.getByLabel("The preference, in words").fill("abc");
  await prefCard.getByRole("button", { name: "Record preference" }).click();
  await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 30_000 });
  ({ rows: [c] } = await pool.query(
    "SELECT count(*)::int n FROM preference_rule WHERE household_id=$1", [fixtureId]));
  expect(c.n, "a refused write must create no row").toBe(0);

  // ---- A2: record one rule
  await page.goto(drill);
  await prefCard.getByLabel("The preference, in words").fill(RULE_TEXT);
  await prefCard.getByRole("button", { name: "Record preference" }).click();
  await expect(page.getByText("preference recorded")).toBeVisible({ timeout: 30_000 });

  const { rows: after2 } = await pool.query(
    `SELECT id, household_id, rule, provenance, confidence, status,
            retired_reason, retired_at, retired_by
       FROM preference_rule WHERE household_id=$1`, [fixtureId]);
  expect(after2.length).toBe(1);
  const rule = after2[0];
  expect(rule.household_id).toBe(fixtureId);
  expect(rule.rule).toBe(RULE_TEXT);
  expect(rule.provenance).toBe("explicit");
  expect(rule.confidence).toBeNull();
  expect(rule.status).toBe("active");
  // whole-or-absent, every member null before the transition
  expect(rule.retired_reason).toBeNull();
  expect(rule.retired_at).toBeNull();
  expect(rule.retired_by).toBeNull();

  // ---- A3: retire, and the text must survive byte-identical
  await page.goto(drill);
  await prefCard.getByLabel("Why it no longer holds").fill(RETIRE_REASON);
  await prefCard.getByRole("button", { name: "Retire" }).click();
  await expect(page.getByText("preference retired")).toBeVisible({ timeout: 30_000 });

  const { rows: after3 } = await pool.query(
    `SELECT id, household_id, rule, provenance, confidence, status,
            retired_reason, retired_at, retired_by
       FROM preference_rule WHERE id=$1`, [rule.id]);
  expect(after3.length, "a retirement that deletes is a FAIL").toBe(1);
  const retired = after3[0];
  expect(retired.status).toBe("retired");
  expect(retired.retired_reason).toBe(RETIRE_REASON);
  expect(retired.retired_at).not.toBeNull();
  expect(retired.retired_by).not.toBeNull();
  expect(retired.household_id).toBe(fixtureId);
  expect(retired.provenance, "retirement must not perturb provenance").toBe("explicit");
  expect(retired.confidence).toBeNull();
  expect(retired.rule, "THE POINT: a rule never edits in place").toBe(RULE_TEXT);

  // ---- A4: survives a fresh fetch
  await page.goto(drill);
  await expect(prefCard.getByText(RULE_TEXT)).toBeVisible({ timeout: 30_000 });
  await expect(prefCard.getByText(`retired: ${RETIRE_REASON}`)).toBeVisible();

  // ---- B1: empty state
  const sitCard = page.locator("div.card", { hasText: "Situations (WK-DEV-009" });
  await expect(sitCard.getByText("No situations on this household.")).toBeVisible();
  ({ rows: [c] } = await pool.query(
    "SELECT count(*)::int n FROM situation WHERE household_id=$1", [fixtureId]));
  expect(c.n).toBe(0);

  // ---- B2: open a situation
  await sitCard.getByLabel("The situation, in words").fill(SITUATION_LABEL);
  await sitCard.getByRole("button", { name: "Open situation" }).click();
  await expect(page.getByText("situation opened")).toBeVisible({ timeout: 30_000 });

  const { rows: afterB2 } = await pool.query(
    `SELECT id, household_id, label, status, resolution, resolved_at, resolved_by
       FROM situation WHERE household_id=$1`, [fixtureId]);
  expect(afterB2.length).toBe(1);
  const sit = afterB2[0];
  expect(sit.household_id).toBe(fixtureId);
  expect(sit.label).toBe(SITUATION_LABEL);
  expect(sit.status).toBe("open");
  expect(sit.resolution).toBeNull();
  expect(sit.resolved_at).toBeNull();
  expect(sit.resolved_by).toBeNull();

  // ---- B3: resolve, label must survive byte-identical
  await page.goto(drill);
  await sitCard.getByLabel("How the situation closed").fill(RESOLVE_NOTE);
  await sitCard.getByRole("button", { name: "Resolve situation" }).click();
  await expect(page.getByText("situation resolved")).toBeVisible({ timeout: 30_000 });

  const { rows: afterB3 } = await pool.query(
    `SELECT id, household_id, label, status, resolution, resolved_at, resolved_by
       FROM situation WHERE id=$1`, [sit.id]);
  expect(afterB3.length).toBe(1);
  const resolved = afterB3[0];
  expect(resolved.status).toBe("resolved");
  expect(resolved.resolution).toBe(RESOLVE_NOTE);
  expect(resolved.resolved_at).not.toBeNull();
  expect(resolved.resolved_by).not.toBeNull();
  expect(resolved.household_id).toBe(fixtureId);
  expect(resolved.label, "THE POINT: resolving is a state change, not a mutation").toBe(SITUATION_LABEL);

  // ---- B4: survives a fresh fetch
  await page.goto(drill);
  await expect(sitCard.getByText(SITUATION_LABEL)).toBeVisible({ timeout: 30_000 });

  // ---- C: containment
  const { rows: prefBy } = await pool.query(
    "SELECT household_id, count(*)::int n FROM preference_rule GROUP BY household_id");
  const { rows: sitBy } = await pool.query(
    "SELECT household_id, count(*)::int n FROM situation GROUP BY household_id");
  for (const r of [...prefBy, ...sitBy]) {
    expect(r.household_id, "leaked outside the fixture").toBe(fixtureId);
  }
});
