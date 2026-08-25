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
 *    row and renders the signed DATE as recorded (the G-61 UTC-render
 *    fix, pinned here so a regression to a zone-shifted render fails),
 *    and a future-dated consent refuses VISIBLY and changes nothing.
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
  await pool.query("DELETE FROM membership_event WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM attention_record WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM work_item WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM event_outbox WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM household WHERE id = ANY($1)", [[synId, orphanId]]); // assignments cascade
  await pool.query("DELETE FROM auth_session WHERE session_token = ANY($1)", [[rachelToken, lisaToken]]);
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

  // Card, doc version, AND the date string: with the G-61 UTC render the
  // stored date displays as written, so the journey now pins it (the
  // pre-fix America/New_York render showed August 19 here).
  await expect(page.getByText("Signed consent on record:")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("August 20, 2026")).toBeVisible();
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

test("departure journey: a cancel refuses without its cause code, then lands with the covenant event, reason text never in the payload", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  await page.goto(`/oversight/${synId}`);
  await expect(page.getByRole("button", { name: "Record event" })).toBeVisible({ timeout: 30_000 });

  const fill = async (withCause: boolean) => {
    await page.getByLabel("Event kind").selectOption("cancel");
    await page.locator('input[name="effectiveOn"]').fill("2026-08-24");
    await page.locator('select[name="initiatedBy"]').selectOption("client");
    if (withCause) await page.locator('select[name="causeCode"]').selectOption("life_event");
    await page.getByLabel("Reason (required on cancel)").fill("family relocating for a season");
    await page.getByRole("button", { name: "Record event" }).click();
  };

  // The refusing direction: REQ-083's done-when, visibly.
  await fill(false);
  await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });
  const count = async (sql: string) => (await pool.query(sql, [synId])).rows[0].n as number;
  expect(await count("SELECT count(*)::int n FROM membership_event WHERE household_id=$1")).toBe(0);

  // The accepting direction: the row and its covenant event in one
  // transaction. The database is the honest signal, not the banner.
  await fill(true);
  await expect.poll(async () =>
    (await pool.query("SELECT count(*)::int n FROM membership_event WHERE household_id=$1 AND kind='cancel'", [synId])).rows[0].n,
  { timeout: 20_000 }).toBe(1);
  const { rows: [ev] } = await pool.query(
    "SELECT cause_code, reason FROM membership_event WHERE household_id=$1 AND kind='cancel'", [synId]);
  expect(ev.cause_code).toBe("life_event");
  const { rows: [cov] } = await pool.query(
    "SELECT payload FROM event_outbox WHERE household_id=$1 AND kind='household.departure'", [synId]);
  expect(cov).toBeTruthy();
  expect((cov.payload as { causeCode: string }).causeCode).toBe("life_event");
  const raw = JSON.stringify(cov.payload);
  expect(raw.includes("relocating")).toBe(false); // the s2 reason never rides the covenant stream
});

test("work-item journey: refused short, opened with its event, blocked with reason, resolved whole with its event", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  await page.goto(`/oversight/${synId}`);
  await expect(page.getByRole("button", { name: "Open work item" })).toBeVisible({ timeout: 30_000 });

  // Refusing direction: a two-character title is not work in words.
  await page.getByLabel("Work item title").fill("ok");
  await page.getByRole("button", { name: "Open work item" }).click();
  await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

  // Accepting direction: opened, with its outbox event.
  await page.getByLabel("Work item title").fill("Gutter vendor: schedule the fall clean");
  await page.getByLabel("Work item kind").selectOption("vendor");
  await page.getByRole("button", { name: "Open work item" }).click();
  const count = async (sql: string) => (await pool.query(sql, [synId])).rows[0].n as number;
  await expect.poll(() => count("SELECT count(*)::int n FROM work_item WHERE household_id=$1"), { timeout: 20_000 }).toBe(1);
  expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='work_item.opened'")).toBe(1);

  // Block with its reason, then resolve whole.
  await page.getByLabel("Work item decision").selectOption("block");
  await page.getByLabel("Reason or completion note").fill("waiting on the vendor's quote");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect.poll(() => count("SELECT count(*)::int n FROM work_item WHERE household_id=$1 AND status='blocked'"), { timeout: 20_000 }).toBe(1);

  await page.getByLabel("Work item decision").selectOption("done");
  await page.getByLabel("Reason or completion note").fill("vendor booked for the second week of October");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect.poll(() => count("SELECT count(*)::int n FROM work_item WHERE household_id=$1 AND status='done'"), { timeout: 20_000 }).toBe(1);
  const { rows: [w] } = await pool.query(
    "SELECT resolution, resolved_by, resolved_at FROM work_item WHERE household_id=$1", [synId]);
  expect(w.resolution).toContain("October");
  expect(w.resolved_by).toBe(rachelId);
  expect(w.resolved_at).toBeTruthy();
  expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='work_item.resolved'")).toBe(1);
});

test("attention journey: seen is a whole pair, resolving demands words, and the resolved event lands", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  const attnId = randomUUID();
  await pool.query(
    "INSERT INTO attention_record (id, household_id, reason, source_kind, audience, urgency) VALUES ($1,$2,'Journey notice: the gate latch report','system','corporate','now')",
    [attnId, synId]);
  await page.goto(`/oversight/${synId}`);
  await expect(page.getByText("Journey notice: the gate latch report")).toBeVisible({ timeout: 30_000 });

  // Seen: the whole pair lands.
  await page.getByRole("button", { name: "Seen" }).click();
  await expect.poll(async () =>
    (await pool.query("SELECT count(*)::int n FROM attention_record WHERE id=$1 AND acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL", [attnId])).rows[0].n,
  { timeout: 20_000 }).toBe(1);

  // Resolving without words refuses visibly.
  await page.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

  // With words: the whole triple, and the outbox hears it.
  await page.getByLabel("How it was answered").fill("walked the founder through it on the call");
  await page.getByRole("button", { name: "Resolve" }).click();
  await expect.poll(async () =>
    (await pool.query("SELECT count(*)::int n FROM attention_record WHERE id=$1 AND status='resolved' AND resolution IS NOT NULL AND resolved_by=$2", [attnId, rachelId])).rows[0].n,
  { timeout: 20_000 }).toBe(1);
  const { rows: [ev] } = await pool.query(
    "SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='attention_record.resolved'", [synId]);
  expect(ev.n).toBe(1);
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

/**
 * The intake journey (HO sprint Day 2-3 / Day 5 correction line): a HOM
 * assigned to exactly one household captures a field through the real
 * intake surface, then CORRECTS it, and the audit trail carries both
 * writes as field_write rows with value HASHES, never values. The s3
 * rail runs in the same journey: reclassifying a field to s3 clears its
 * plaintext (vault law, REQ-013).
 */
let intakeHmId = "";
let intakeToken = "";
let intakeHhId = "";
let coffeeFieldId = "";
let entryFieldId = "";

test.beforeAll(async () => {
  intakeHmId = randomUUID();
  intakeToken = randomUUID() + randomUUID();
  intakeHhId = randomUUID();
  coffeeFieldId = randomUUID();
  entryFieldId = randomUUID();
  await pool.query("INSERT INTO auth_user (id, email, name) VALUES ($1,$2,$3)",
    [intakeHmId, `syn-intake-${intakeHmId.slice(0, 8)}@test.invalid`, "SYN-01 intake HOM"]);
  await pool.query("INSERT INTO household (id, name, tier, is_fixture) VALUES ($1,$2,'concierge',true)",
    [intakeHhId, "SYN-01 intake journey"]);
  await pool.query("INSERT INTO household_role_assignment (id, user_id, household_id, role, nda_approved) VALUES ($1,$2,$3,'house_manager',true)",
    [randomUUID(), intakeHmId, intakeHhId]);
  await pool.query("INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [intakeToken, intakeHmId, new Date(Date.now() + 3600_000)]);
  await pool.query(
    "INSERT INTO playbook_field (id, household_id, section, name, value, sensitivity) VALUES ($1,$2,1,'Coffee ritual','','s1'), ($3,$2,1,'Entry sequence','Side porch first','s1')",
    [coffeeFieldId, intakeHhId, entryFieldId]);
});

test.afterAll(async () => {
  await pool.query("DELETE FROM audit_event WHERE household_id=$1", [intakeHhId]);
  await pool.query("DELETE FROM event_outbox WHERE household_id=$1", [intakeHhId]);
  await pool.query("DELETE FROM playbook_field WHERE household_id=$1", [intakeHhId]);
  await pool.query("DELETE FROM household WHERE id=$1", [intakeHhId]);
  await pool.query("DELETE FROM auth_session WHERE session_token=$1", [intakeToken]);
  await pool.query("DELETE FROM auth_user WHERE id=$1", [intakeHmId]);
  await pool.end();
});

test("intake journey: capture, then correct, both audited as hashes; s3 reclassification clears the plaintext", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: intakeToken, url: BASE }]);

  await page.goto("/intake?section=1");
  await expect(page.getByText("INTAKE MODE · SYN-01 INTAKE JOURNEY")).toBeVisible({ timeout: 30_000 });

  // Capture: the blank field takes its first value.
  const writeCount = async () => {
    const { rows } = await pool.query(
      "SELECT count(*)::int n FROM audit_event WHERE household_id=$1 AND kind='field_write' AND field_id=$2",
      [intakeHhId, coffeeFieldId]);
    return rows[0].n as number;
  };
  const coffee = page.locator("div.card", { hasText: "Coffee ritual" });
  await coffee.getByLabel("Value for Coffee ritual").fill("Half-caf drip ready by 7");
  await coffee.getByRole("button", { name: "Save" }).click();
  // The textarea keeps the typed value client-side either way, so the
  // database is the only honest signal the server action landed. Generous
  // on the first write: dev mode may still be compiling the action route.
  await expect.poll(writeCount, { timeout: 30_000 }).toBe(1);
  // Wait for the post-save re-render to LAND before typing the correction:
  // the revalidation replaces the form, and a fill that races it gets reset
  // to the saved value, making the second save a no-op re-write. The
  // "not yet captured" tag disappearing is the re-render's own signal.
  await expect(coffee.getByText("not yet captured")).toHaveCount(0, { timeout: 15_000 });

  // Correct: the simulated Day 5 correction, same surface, new value.
  await coffee.getByLabel("Value for Coffee ritual").fill("Half-caf drip ready by 6:30, grinder on 4");
  await coffee.getByRole("button", { name: "Save" }).click();
  await expect.poll(writeCount, { timeout: 15_000 }).toBe(2);

  // The audit trail carries BOTH writes, hashes only, actor stamped.
  const { rows: audits } = await pool.query(
    "SELECT actor_user, new_value_hash FROM audit_event WHERE household_id=$1 AND kind='field_write' AND field_id=$2 ORDER BY created_at",
    [intakeHhId, coffeeFieldId]);
  expect(audits.length).toBe(2);
  expect(audits[0].new_value_hash).not.toBe(audits[1].new_value_hash);
  for (const a of audits) expect(a.actor_user).toBe(intakeHmId);
  const { rows: [f] } = await pool.query(
    "SELECT value, provenance_actor, confirmed FROM playbook_field WHERE id=$1", [coffeeFieldId]);
  expect(f.value).toBe("Half-caf drip ready by 6:30, grinder on 4");
  expect(f.provenance_actor).toBe(intakeHmId);
  expect(f.confirmed).toBe(true);

  // The s3 rail: reclassifying a valued field to s3 clears its plaintext
  // (the value goes to the vault through corporate, never this row).
  const entry = page.locator("div.card", { hasText: "Entry sequence" });
  await entry.getByLabel("Sensitivity").selectOption("s3");
  await entry.getByRole("button", { name: "Save" }).click();
  await expect(entry.getByText("Secured field:")).toBeVisible({ timeout: 15_000 });
  const { rows: [sec] } = await pool.query("SELECT value, sensitivity FROM playbook_field WHERE id=$1", [entryFieldId]);
  expect(sec.sensitivity).toBe("s3");
  expect(sec.value).toBe("");
});

test("tenant isolation at the page layer: no assignment for a household means no principal, means no page", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  // rachel is corporate_admin FOR HER ASSIGNMENTS; the orphan household has
  // none, so getPrincipal resolves null and the drill-in refuses to exist.
  await page.goto(`/oversight/${orphanId}`);
  await page.waitForURL(/\/signin/, { timeout: 30_000 });
  await expect(page.getByText("SYN-01 isolation journey")).toHaveCount(0);
});
