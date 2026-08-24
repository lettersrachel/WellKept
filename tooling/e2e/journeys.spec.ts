import { test, expect } from "@playwright/test";
import pg from "pg";
import { randomUUID } from "node:crypto";

/**
 * CAND-SYN-01: synthetic critical journeys, grown alongside the airplane
 * spec (the class's first member, which owns close-flow and offline).
 * This file owns two more:
 *
 * 1. The consent journey (ADR-001 guardrail 3 / LAUNCH 1.5): the
 *    no-consent warning renders, recording consent lands with its audit
 *    row, and a future-dated consent refuses VISIBLY and changes nothing.
 *    The rendered consent DATE is deliberately not asserted: G-61 (a
 *    date-only fact stored as a timestamp renders one day early in
 *    America/New_York) sits on exactly that string, and this journey must
 *    not encode the defect as expected behavior. Card presence, doc
 *    version, and the database rows are the contract; the date string
 *    joins the assertions when G-61's fix is authorized.
 * 2. The permissions journey: a client is walled out of every staff
 *    surface (and still sees their own), and a corporate admin without an
 *    assignment for a household cannot reach its record at all - the
 *    tenant-isolation contract at the page layer, exercised in a real
 *    browser rather than only in the payload-guard unit suite.
 */
const DB = process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept";
const BASE = process.env.BASE ?? "http://localhost:3001";

const pool = new pg.Pool({ connectionString: DB });
let rachelToken = "";
let lisaToken = "";
let rachelId = "";
let fernbrookId = "";
let synId = ""; // synthetic household rachel IS assigned to (consent journey)
let orphanId = ""; // synthetic household NOBODY is assigned to (isolation journey)

test.beforeAll(async () => {
  const { rows: [hh] } = await pool.query("SELECT id FROM household ORDER BY created_at LIMIT 1");
  fernbrookId = hh.id;
  const { rows: [rachel] } = await pool.query("SELECT id FROM auth_user WHERE email='rachel@wellkept.demo'");
  const { rows: [lisa] } = await pool.query("SELECT id FROM auth_user WHERE email='lisa@fernbrook.demo'");
  rachelId = rachel.id;

  // Staff session pre-stamps mfa_satisfied_at (the REQ-003 gate has its own
  // unit tests); the client session deliberately does NOT - clients pass the
  // staff MFA choke point untouched, and this journey proves their walls
  // hold without it.
  rachelToken = randomUUID() + randomUUID();
  lisaToken = randomUUID() + randomUUID();
  const expires = new Date(Date.now() + 3600_000);
  await pool.query("INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [rachelToken, rachelId, expires]);
  await pool.query("INSERT INTO auth_session (session_token, user_id, expires) VALUES ($1,$2,$3)",
    [lisaToken, lisa.id, expires]);

  // Two synthetic households (is_fixture keeps them out of every roll-up
  // and job): one with rachel assigned corporate_admin, one with no
  // assignments at all.
  synId = randomUUID();
  orphanId = randomUUID();
  await pool.query("INSERT INTO household (id, name, tier, is_fixture) VALUES ($1,$2,'concierge',true)",
    [synId, "SYN-01 consent journey"]);
  await pool.query("INSERT INTO household (id, name, tier, is_fixture) VALUES ($1,$2,'concierge',true)",
    [orphanId, "SYN-01 isolation journey"]);
  await pool.query("INSERT INTO household_role_assignment (id, user_id, household_id, role, nda_approved) VALUES ($1,$2,$3,'corporate_admin',true)",
    [randomUUID(), rachelId, synId]);
});

test.afterAll(async () => {
  // Remove only what this file created. Audit rows first (append-only in
  // the product; a local test tears its own synthetic household down the
  // way airplane.spec tears down its visit commands).
  await pool.query("DELETE FROM audit_event WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM household WHERE id = ANY($1)", [[synId, orphanId]]); // assignments cascade
  await pool.query("DELETE FROM auth_session WHERE session_token = ANY($1)", [[rachelToken, lisaToken]]);
  await pool.end();
});

test("consent journey: warning, then recorded with its audit row; a future date refuses visibly and changes nothing", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  await page.goto(`/oversight/${synId}`);

  // The precondition surface: no consent, and the page says so.
  await expect(page.getByRole("heading", { name: /Household consent/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("NO CONSENT ON RECORD")).toBeVisible();

  // Record it (a past date; consent is a fact).
  const docVersion = "household-consent v1 (2026-07)";
  await page.locator('input[name="signedAt"]').fill("2026-08-20");
  await page.getByLabel("Consent document version").fill(docVersion);
  await page.getByRole("button", { name: "Record consent" }).click();

  // Card presence and doc version; NOT the rendered date string (G-61).
  await expect(page.getByText("Signed consent on record:")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`doc version ${docVersion}`)).toBeVisible();

  // The database is the record: columns set, audit row written.
  const { rows: [row] } = await pool.query(
    "SELECT consent_signed_at, consent_doc_version, consent_recorded_by FROM household WHERE id=$1", [synId]);
  expect(row.consent_signed_at).not.toBeNull();
  expect(row.consent_doc_version).toBe(docVersion);
  expect(row.consent_recorded_by).toBe(rachelId);
  const { rows: [audit] } = await pool.query(
    "SELECT count(*)::int n FROM audit_event WHERE household_id=$1 AND kind='consent_recorded'", [synId]);
  expect(audit.n).toBe(1);

  // The refusing direction: a future-dated consent is a plan, not a fact.
  await page.locator('input[name="signedAt"]').fill("2027-01-01");
  await page.getByLabel("Consent document version").fill("should never land");
  await page.getByRole("button", { name: "Record consent" }).click();
  await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });
  const { rows: [after] } = await pool.query("SELECT consent_doc_version FROM household WHERE id=$1", [synId]);
  expect(after.consent_doc_version).toBe(docVersion);
});

test("permissions journey: a client is walled out of staff surfaces and still sees their own", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: lisaToken, url: BASE }]);

  // The client's own window renders (the journey's accepting direction).
  await page.goto("/playbook");
  await expect(page.getByRole("heading", { name: "What we hold for you" })).toBeVisible({ timeout: 30_000 });

  // The corporate drill-in bounces a client home, never rendering the record.
  await page.goto(`/oversight/${fernbrookId}`);
  await page.waitForURL(/\/playbook/, { timeout: 30_000 });
  await expect(page.getByText("Household consent")).toHaveCount(0);

  // The field close-flow does the same.
  await page.goto("/visit");
  await page.waitForURL(/\/playbook/, { timeout: 30_000 });
});

test("tenant isolation at the page layer: no assignment for a household means no principal, means no page", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  // rachel is corporate_admin FOR HER ASSIGNMENTS; the orphan household has
  // none, so getPrincipal resolves null and the drill-in refuses to exist.
  await page.goto(`/oversight/${orphanId}`);
  await page.waitForURL(/\/signin/, { timeout: 30_000 });
  await expect(page.getByText("SYN-01 isolation journey")).toHaveCount(0);
});
