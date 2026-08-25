import { test, expect } from "@playwright/test";
import pg from "pg";
import { randomUUID } from "node:crypto";

/**
 * The airplane test (WK-DEV-005 S6 / ADR-001 guardrail 4), automated. A
 * house manager fills a visit OFFLINE, submits (queued on-device, nothing
 * reaches the DB), then reconnects and the visit syncs and applies. This
 * is release-blocking; here it runs on a real browser via Playwright's
 * setOffline, against the live app and DB.
 */
const DB = process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept";
const BASE = process.env.BASE ?? "http://localhost:3001";

const pool = new pg.Pool({ connectionString: DB });
let token = "";
let householdId = "";

let marker: Date;

test.beforeAll(async () => {
  const { rows: [hh] } = await pool.query("SELECT id FROM household ORDER BY created_at LIMIT 1");
  householdId = hh.id;
  const { rows: [u] } = await pool.query("SELECT id FROM auth_user WHERE email='jordan@wellkept.demo'");
  token = randomUUID() + randomUUID();
  // mfa_satisfied_at pre-stamped: Jordan is staff (house_manager) so the
  // REQ-003 guard would otherwise divert to /mfa; this test exercises the
  // offline close flow, not the second factor (which has its own unit tests).
  await pool.query("INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [token, u.id, new Date(Date.now() + 3600_000)]);
  // Clean slate: the close-flow stamps the visit with today's date, and a
  // second same-day visit is a (correctly-handled) conflict. Clear today's
  // applied visits so the airplane submit lands cleanly. On CI's freshly
  // seeded DB this is a no-op.
  await pool.query(
    "DELETE FROM visit_command WHERE household_id=$1 AND type='visit.submit' AND received_at::date = CURRENT_DATE",
    [householdId]);
  marker = new Date();
});

test.afterAll(async () => {
  // Remove only what this test created, then the session. The applied
  // visit now emits its covenant events (REQ-083); sweep those too.
  await pool.query("DELETE FROM event_outbox WHERE household_id=$1 AND created_at >= $2", [householdId, marker]);
  await pool.query("DELETE FROM capture_artifact WHERE household_id=$1 AND created_at >= $2", [householdId, marker]);
  await pool.query("DELETE FROM visit_command WHERE household_id=$1 AND received_at >= $2", [householdId, marker]);
  await pool.query("DELETE FROM auth_session WHERE session_token=$1", [token]);
  await pool.end();
});

async function visitCount(): Promise<number> {
  const { rows } = await pool.query(
    "SELECT count(*)::int n FROM visit_command WHERE household_id=$1 AND type='visit.submit' AND status='applied'",
    [householdId]);
  return rows[0].n;
}

test("a visit filled offline queues on-device, then syncs and applies on reconnect", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: token, url: BASE }]);
  const before = await visitCount();

  await page.goto("/visit");
  // Dev-mode compiles /visit on first hit and the wizard is a client
  // component that hydrates after; wait generously for it to be ready.
  await expect(page.getByRole("heading", { name: "Confirm today's tasks" })).toBeVisible({ timeout: 30_000 });

  // ---- go offline ----
  await context.setOffline(true);
  await expect(page.getByText(/Offline; your work is saved/)).toBeVisible();

  // Tasks: the s2.3 batch gesture, exercised OFFLINE (routine
  // completions are batchable in one gesture; it only ever covers the
  // HOM's own planned work).
  await page.getByRole("button", { name: "All remaining done as expected" }).click();
  for (const cb of await page.locator('input[type=checkbox]').all()) await expect(cb).toBeChecked();

  // Hours — the two datetime inputs in the Hours card.
  const hours = page.locator('div.card', { hasText: "Hours" }).filter({ has: page.locator('input[type="datetime-local"]') });
  await hours.locator('input[type="datetime-local"]').nth(0).fill("2026-07-20T09:00");
  await hours.locator('input[type="datetime-local"]').nth(1).fill("2026-07-20T12:30");
  await hours.getByRole("button", { name: "Save hours" }).click();

  // Photo: a real 1x1 PNG (the wizard now downscales it on a canvas before
  // upload, so it must be a valid image — a stray byte won't decode). Offline
  // here, so the upload is deferred; capturing still satisfies the flow.
  const onePx = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.locator('input[type=file]').setInputFiles({ name: "after.png", mimeType: "image/png", buffer: onePx });
  await expect(page.getByText(/1 photo\(s\) added/)).toBeVisible({ timeout: 10_000 });

  // Changes noticed.
  const changes = page.locator('div.card', { hasText: "Changes noticed" });
  await changes.getByPlaceholder("or 'none'").fill("none");
  await changes.getByRole("button", { name: "Save", exact: true }).click();

  // Life-change: nothing to flag.
  await page.getByText("Nothing to flag").click();

  // Zone drift (defaults to "none").
  await page.locator('div.card', { hasText: "Zone drift" }).getByRole("button", { name: "Save", exact: true }).click();

  // Three-sentence report.
  const report = page.locator('div.card', { hasText: "three sentences" });
  const inputs = report.locator("input");
  await inputs.nth(0).fill("Offline airplane test: kitchen, linens, and Biscuit all attended to.");
  await inputs.nth(1).fill("Nothing to flag; zones held.");
  await inputs.nth(2).fill("Coffee stocked and set for the week.");
  await report.getByRole("button", { name: "Save report" }).click();

  // The closing question, always last: a REAL answer here, so the
  // reconnect proves the s2.3-to-s8 wiring (the answer becomes a Tell
  // Well Kept capture in the visit's own transaction, never re-typed).
  const missingCard = page.locator('div.card', { hasText: "Anything missing?" });
  await missingCard.getByLabel("Anything missing?").fill("The utility closet bulb is out");
  await missingCard.getByRole("button", { name: "Answer" }).click();

  // The drafted close renders the as-planned line before submit.
  await expect(page.getByText(/4 of 4 expected outcomes completed as planned/)).toBeVisible();

  // Submit — required steps complete. AG: the offline card claims what
  // actually happened (saved on this device), never "submitted".
  await page.getByRole("button", { name: "Submit visit report" }).click();
  await expect(page.getByText("Visit saved on this device")).toBeVisible();

  // While offline, NOTHING reached the database.
  expect(await visitCount()).toBe(before);

  // ---- reconnect ----
  await context.setOffline(false);
  await page.getByRole("button", { name: "Sync now" }).click();

  // The queued visit now applies in Postgres.
  await expect.poll(async () => visitCount(), { timeout: 15_000, intervals: [500] }).toBe(before + 1);

  // AG, the other direction: once nothing is waiting, the card upgrades
  // its claim to submitted.
  await expect(page.getByText("Visit submitted")).toBeVisible();

  // s2.3 into s8: the closing answer became a capture artifact in the
  // same transaction as the applied visit, tied to it by command id.
  const { rows: [cap] } = await pool.query(
    "SELECT count(*)::int n FROM capture_artifact WHERE household_id=$1 AND content='The utility closet bulb is out' AND visit_command_id IS NOT NULL",
    [householdId]);
  expect(cap.n).toBe(1);
});

/**
 * Input spine build 1: the airplane drill extended past the wizard. A
 * condition flag captured OFFLINE claims saved-on-this-device (never
 * recorded), writes nothing, then applies attributed on reconnect - the
 * WK-DEV-007 section 2 acceptance shape (capture, then sync) for the
 * visit-page surfaces.
 */
test("a condition flag captured offline queues on-device, then applies on reconnect", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: token, url: BASE }]);
  const subject = `airplane grout ${randomUUID().slice(0, 8)}`;
  const flagCount = async (): Promise<number> => {
    const { rows } = await pool.query(
      "SELECT count(*)::int n FROM condition_flag WHERE household_id=$1 AND subject=$2", [householdId, subject]);
    return rows[0].n;
  };

  await page.goto("/visit");
  await expect(page.getByRole("heading", { name: "Flag a condition" })).toBeVisible({ timeout: 30_000 });
  // Let the shared queue hydrate (the wizard's status bar renders once it has).
  await expect(page.getByRole("heading", { name: "Confirm today's tasks" })).toBeVisible({ timeout: 30_000 });

  // ---- go offline, capture the flag ----
  await context.setOffline(true);
  await page.getByLabel("What", { exact: true }).fill(subject);
  await page.getByLabel("Where", { exact: true }).fill("guest bathroom");
  await page.getByLabel("Concern").fill("cracking along the rear shower wall");
  await page.getByLabel("Revisit condition").fill("after the next deep clean");
  await page.getByRole("button", { name: "Raise the flag" }).click();

  // The honest chip: saved on this device, and nothing reached the DB.
  await expect(page.getByText("Saved on this device; syncing.")).toBeVisible({ timeout: 10_000 });
  expect(await flagCount()).toBe(0);

  // ---- reconnect: the browser's online event kicks the shared drain ----
  await context.setOffline(false);
  await expect.poll(async () => flagCount(), { timeout: 20_000, intervals: [500] }).toBe(1);

  // Attributed to the session's own principal, server-stamped.
  const { rows: [flag] } = await pool.query(
    "SELECT raised_by, status FROM condition_flag WHERE household_id=$1 AND subject=$2", [householdId, subject]);
  const { rows: [u] } = await pool.query("SELECT id FROM auth_user WHERE email='jordan@wellkept.demo'");
  expect(flag.raised_by).toBe(u.id);
  expect(flag.status).toBe("open");

  // The chip upgrades its claim only now.
  await expect(page.getByText("Recorded.")).toBeVisible({ timeout: 15_000 });

  // Cleanup this test's flag and its command row.
  await pool.query("DELETE FROM condition_flag WHERE household_id=$1 AND subject=$2", [householdId, subject]);
});

/**
 * Input spine build 1, nothing is lost: a reload mid-close-flow resumes
 * exactly where it stopped. The draft autosaves to IndexedDB on every
 * committed step; a fresh page load restores the flow state, so a crashed
 * app costs nothing but the reload itself.
 */
test("a close flow in progress survives a reload and resumes where it stopped", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: token, url: BASE }]);
  await page.goto("/visit");
  await expect(page.getByRole("heading", { name: "Confirm today's tasks" })).toBeVisible({ timeout: 30_000 });

  // Commit two steps: two tasks and the changes-noticed answer.
  const boxes = page.locator('input[type=checkbox]');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  const changes = page.locator('div.card', { hasText: "Changes noticed" });
  await changes.getByPlaceholder("or 'none'").fill("resume drill: grout note");
  await changes.getByRole("button", { name: "Save", exact: true }).click();
  // Give the autosave a beat to land in IndexedDB.
  await page.waitForTimeout(1200);

  // The crash: a full reload, no graceful teardown.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Confirm today's tasks" })).toBeVisible({ timeout: 30_000 });

  await expect(boxes.nth(0)).toBeChecked();
  await expect(boxes.nth(1)).toBeChecked();
  await expect(boxes.nth(2)).not.toBeChecked();
});
