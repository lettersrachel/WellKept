import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";
import { randomUUID } from "node:crypto";

/**
 * B2, the accessibility contract's first stone (WK-DEV-006 D2: WCAG 2.2 AA
 * is the adopted engineering baseline, promoted 24 August under the
 * two-key authorization; G-102 voided the deferral that briefly stood
 * over it, leaving adopted law with nothing enforcing it).
 *
 * Scope, per the approved handoff plan: axe scans on the THREE critical
 * flows (sign-in, the visit surface that carries the close flow, the
 * corporate drill-in), REPORTING for one week of runs and then GATING.
 * Until GATE_FROM, violations print in full so the week accumulates a
 * findings list; from GATE_FROM, any violation fails CI. The component
 * contract D2 names grows from what the week finds, not from a
 * checklist.
 *
 * Not covered, written down like every guard's blind spot: pages outside
 * the three flows; anything a scan cannot see (keyboard traps that need
 * interaction, focus order, screen-reader phrasing); and client surfaces,
 * which are frozen at the digest and join when they unfreeze.
 */

// One week of reporting runs, then the gate closes. Chosen from the
// approved plan's own wording ("failures reported not gating for one
// week of runs, then gating"), counted from the day this file lands.
const GATE_FROM = Date.parse("2026-09-09T00:00:00Z");
const GATING = Date.now() >= GATE_FROM;

// D2's baseline: WCAG 2.2 AA. axe-core tags are additive by level.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const DB = process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept";
const BASE = process.env.BASE ?? "http://localhost:3001";
const pool = new pg.Pool({ connectionString: DB });
let rachelToken = "";
let fernbrookId = "";

test.beforeAll(async () => {
  const { rows: [hh] } = await pool.query("SELECT id FROM household ORDER BY created_at LIMIT 1");
  fernbrookId = hh.id;
  const { rows: [rachel] } = await pool.query("SELECT id FROM auth_user WHERE email='rachel@wellkept.demo'");
  rachelToken = randomUUID() + randomUUID();
  await pool.query(
    "INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [rachelToken, rachel.id, new Date(Date.now() + 3600_000)]);
});

test.afterAll(async () => {
  await pool.query("DELETE FROM auth_session WHERE session_token = $1", [rachelToken]);
  await pool.end();
});

/** One scan, one verdict, one legible report line per violation. */
async function scan(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const v = results.violations;
  if (v.length > 0) {
    console.log(`[a11y] ${label}: ${v.length} violation rule(s), ${GATING ? "GATING" : "reporting (gates from 2026-09-09)"}`);
    for (const rule of v) {
      const sample = rule.nodes[0]?.target?.join(" ") ?? "";
      console.log(`[a11y]   ${rule.id} (${rule.impact ?? "n/a"}) x${rule.nodes.length}: ${rule.help} e.g. ${sample}`);
    }
  } else {
    console.log(`[a11y] ${label}: clean under WCAG 2.2 AA tags`);
  }
  if (GATING) {
    expect(v.map((r) => `${r.id} x${r.nodes.length}`), `${label} must be clean under D2's baseline`).toEqual([]);
  }
}

test("a11y: the sign-in flow scans under WCAG 2.2 AA", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.locator("form").first()).toBeVisible({ timeout: 30_000 });
  await scan(page, "sign-in (/signin)");
});

test("a11y: the visit surface carrying the close flow scans under WCAG 2.2 AA", async ({ context, page }) => {
  // AJ option 2: corporate_admin runs the field surfaces when covering,
  // so one identity exercises both staff flows without extra fixtures.
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  await page.goto("/visit");
  await expect(page.getByText("Close the visit")).toBeVisible({ timeout: 30_000 });
  await scan(page, "visit + close flow (/visit)");
});

test("a11y: the corporate drill-in scans under WCAG 2.2 AA", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  await page.goto(`/oversight/${fernbrookId}`);
  await expect(page.getByRole("heading", { name: /Household consent|Playbook/ }).first()).toBeVisible({ timeout: 30_000 });
  await scan(page, `drill-in (/oversight/[householdId])`);
});
