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
let synHomId = ""; // field identity assigned ONLY to synId (capture journey)
let synHomToken = "";

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

  // A field identity whose ONLY assignment is the synthetic household, so
  // /visit resolves it deterministically (getFieldHouseholdAndPrincipal
  // prefers the field-role assignment) for the capture journey.
  synHomId = randomUUID();
  await pool.query("INSERT INTO auth_user (id, email, name) VALUES ($1,$2,$3)",
    [synHomId, `syn-hom-${synHomId.slice(0, 8)}@journeys.test`, "SYN-01 field identity"]);
  await pool.query("INSERT INTO household_role_assignment (id, user_id, household_id, role, nda_approved) VALUES ($1,$2,$3,'house_manager',true)",
    [randomUUID(), synHomId, synId]);
  synHomToken = randomUUID() + randomUUID();
  await pool.query("INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [synHomToken, synHomId, expires]);
});

test.afterAll(async () => {
  // Remove only what this file created. Audit rows first (append-only in
  // the product; a local test tears its own synthetic household down the
  // way airplane.spec tears down its visit commands).
  await pool.query("DELETE FROM audit_event WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM membership_event WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM capture_artifact WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM attention_record WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM decision_record WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM work_item WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM event_outbox WHERE household_id = ANY($1)", [[synId, orphanId]]);
  await pool.query("DELETE FROM household WHERE id = ANY($1)", [[synId, orphanId]]); // assignments cascade
  await pool.query("DELETE FROM auth_session WHERE session_token = ANY($1)", [[rachelToken, lisaToken, synHomToken]]);
  await pool.query("DELETE FROM auth_user WHERE id = $1", [synHomId]); // assignment already cascaded with the household
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
  // WK-DEV-010 s4 (0046): the envelope rides the real action's event.
  const { rows: [env] } = await pool.query(
    "SELECT provenance, actor, object_id, sensitivity, event_version FROM event_outbox WHERE household_id=$1 AND kind='work_item.opened'", [synId]);
  expect(env.provenance).toBe("action:createWorkItem");
  expect(env.actor).toBe(rachelId);
  expect(env.object_id).toBeTruthy();
  expect(env.sensitivity).toBe("s1");
  expect(env.event_version).toBe(1);

  // Block with its reason, then resolve whole.
  await page.getByLabel("Work item decision").selectOption("block");
  await page.getByLabel("Reason or completion note").fill("waiting on the vendor's quote");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect.poll(() => count("SELECT count(*)::int n FROM work_item WHERE household_id=$1 AND status='blocked'"), { timeout: 20_000 }).toBe(1);
  // Wait for the page's OWN post-action render before touching the form
  // again: the DB row landing does not mean the redirect finished, and a
  // selectOption against the stale pre-block DOM submits a form that the
  // navigation then discards (the race CI caught on 2026-08-25; the row
  // count stayed 0 because the second Apply never really fired).
  await expect(page.getByText("blocked: waiting on the vendor's quote")).toBeVisible({ timeout: 15_000 });

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
  // Same stale-DOM hazard as the work-item journey: the Resolve form
  // existed before the Seen redirect, so wait for the acknowledged
  // render (the Seen button disappears) before clicking into it.
  await expect(page.getByRole("button", { name: "Seen" })).toHaveCount(0, { timeout: 15_000 });

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

test("decision journey: routed with its event, decided whole with a note, and decided-is-decided refuses", async ({ context, page }) => {
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  await page.goto(`/oversight/${synId}`);
  await expect(page.getByRole("button", { name: "Route decision" })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("The choice, in words").fill("Replace or repair the guest bath fan");
  await page.getByLabel("Recommendation").fill("replace; the motor is at end of life");
  await page.getByLabel("Who decides").selectOption("corporate");
  await page.getByLabel("Authority class").selectOption("A3");
  await page.getByRole("button", { name: "Route decision" }).click();
  const count = async (sql: string) => (await pool.query(sql, [synId])).rows[0].n as number;
  await expect.poll(() => count("SELECT count(*)::int n FROM decision_record WHERE household_id=$1"), { timeout: 20_000 }).toBe(1);
  expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='decision_record.routed'")).toBe(1);

  await page.getByLabel("Decision outcome").selectOption("accepted");
  await page.getByLabel("Decision note (optional)").fill("replace it; schedule with the electrician visit");
  await page.getByRole("button", { name: "Decide" }).click();
  await expect.poll(() => count("SELECT count(*)::int n FROM decision_record WHERE household_id=$1 AND outcome='accepted' AND decided_by IS NOT NULL AND decided_at IS NOT NULL"), { timeout: 20_000 }).toBe(1);
  expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='decision_record.decided'")).toBe(1);

  // Decided is decided: the form is gone from the page, and the record shows the outcome.
  await expect(page.getByText("accepted: replace it; schedule with the electrician visit")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Decide" })).toHaveCount(0);
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

test("capture journey: the HOM says it once on /visit; the corporate router refuses a wordless filing, then files it as hm_capture work", async ({ context, page }) => {
  // The HOM half: one box, their words, no taxonomy.
  await context.addCookies([{ name: "authjs.session-token", value: synHomToken, url: BASE }]);
  await page.goto("/visit");
  await expect(page.getByRole("button", { name: "Tell Well Kept" })).toBeVisible({ timeout: 30_000 });

  // Refusing direction: two characters is not a capture.
  await page.getByLabel("Tell Well Kept").fill("ok");
  await page.getByRole("button", { name: "Tell Well Kept" }).click();
  await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

  const said = "The pantry shelf is pulling away from the wall by the door";
  await page.getByLabel("Tell Well Kept").fill(said);
  await page.getByRole("button", { name: "Tell Well Kept" }).click();
  const count = async (sql: string) => (await pool.query(sql, [synId])).rows[0].n as number;
  await expect.poll(() => count("SELECT count(*)::int n FROM capture_artifact WHERE household_id=$1 AND status='captured'"), { timeout: 20_000 }).toBe(1);
  expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='capture_artifact.created'")).toBe(1);
  const { rows: [cap] } = await pool.query("SELECT content, captured_by FROM capture_artifact WHERE household_id=$1", [synId]);
  expect(cap.content).toBe(said);
  expect(cap.captured_by).toBe(synHomId);

  // The router half: corporate sees the words in the queue.
  await context.clearCookies();
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  await page.goto(`/oversight/${synId}`);
  await expect(page.getByText(said)).toBeVisible({ timeout: 30_000 });

  // A wordless filing refuses: the disposition is the record.
  await page.getByRole("button", { name: "File" }).click();
  await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

  // Filed as a work item: the artifact closes whole, the work item is the
  // HOM's capture and says so, and both events land.
  await page.getByLabel("Filing decision").selectOption("work_item");
  await page.getByLabel("Where it went, or why not").fill("vendor look at the pantry shelving");
  await page.getByRole("button", { name: "File" }).click();
  await expect.poll(() => count("SELECT count(*)::int n FROM capture_artifact WHERE household_id=$1 AND status='filed' AND disposition IS NOT NULL AND filed_by IS NOT NULL AND work_item_id IS NOT NULL"), { timeout: 20_000 }).toBe(1);
  const { rows: [w] } = await pool.query(
    "SELECT title, source FROM work_item WHERE household_id=$1 AND source='hm_capture'", [synId]);
  expect(w.title).toBe(said);
  expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='capture_artifact.filed'")).toBe(1);
  expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='work_item.opened' AND payload->>'source'='hm_capture'")).toBe(1);

  // Filed is filed: the form is gone, the disposition renders.
  await expect(page.getByText("filed: vendor look at the pantry shelving")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "File" })).toHaveCount(0);
});

test("tester journey: a tester-flagged HOM reads only their one household; corporate and Ruling 1 surfaces refuse; the exclusion flag stands", async ({ context, page }) => {
  // WK_Tester_Provisioning section 2 item 4: the tester's deny paths are
  // release-blocking. A HOM-role user with is_tester=true, scoped to ONE
  // household, provably walled from every other tenant and every
  // corporate surface (the Ruling 1 views live behind those walls).
  const testerId = randomUUID();
  const testerToken = randomUUID() + randomUUID();
  await pool.query("INSERT INTO auth_user (id, email, name, is_tester) VALUES ($1,$2,$3,true)",
    [testerId, `tester-${testerId.slice(0, 8)}@journeys.test`, "Tester journey identity"]);
  await pool.query("INSERT INTO household_role_assignment (id, user_id, household_id, role, nda_approved) VALUES ($1,$2,$3,'house_manager',true)",
    [randomUUID(), testerId, synId]);
  await pool.query("INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [testerToken, testerId, new Date(Date.now() + 3600_000)]);
  try {
    await context.addCookies([{ name: "authjs.session-token", value: testerToken, url: BASE }]);

    // The field surface serves THEIR household and no other.
    await page.goto("/visit");
    await expect(page.getByText("SYN-01 consent journey").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Fernbrook")).toHaveCount(0);

    // Another tenant's record: no assignment, no principal, no page.
    await page.goto(`/oversight/${fernbrookId}`);
    await page.waitForURL(/\/signin/, { timeout: 30_000 });

    // The corporate drill-in refuses even for their OWN household: the
    // corporate boards (where every Ruling 1 surface lives) are not a
    // HOM surface, tester or not. The deny shape for a role-holding
    // non-corporate user is the home redirect (page.tsx:40), landing
    // them back on their own field surface, never the boards.
    await page.goto(`/oversight/${synId}`);
    await page.waitForURL((url) => !url.pathname.startsWith("/oversight"), { timeout: 30_000 });
    await expect(page.getByText("BRIEFING FROM THE LIVE RECORD.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Household consent/ })).toHaveCount(0);

    // Tenant isolation at the API layer: another household's briefing 403s.
    const res = await page.request.get(`${BASE}/api/mobile/briefing?householdId=${fernbrookId}`);
    expect(res.status()).toBe(403);

    // The exclusion contract's handle exists: the single filter.
    const { rows: [u] } = await pool.query("SELECT is_tester FROM auth_user WHERE id=$1", [testerId]);
    expect(u.is_tester).toBe(true);
  } finally {
    await pool.query("DELETE FROM auth_user WHERE id=$1", [testerId]); // session + assignment cascade
  }
});

test("corporate board: aggregate only, honest unset thresholds, and no per-HOM utilization anywhere on it", async ({ context, page }) => {
  // WK-DEV-007 s5, built on the stricter reading of the section 5 /
  // Ruling 1 disagreement (reported, not reconciled): the board renders
  // coverage, the exception queue, aggregate capacity, churn, and the
  // covenant preview, and NOTHING per person. 0055: the capacity_gate
  // knob is cleared for the unset half and restored after, since
  // db:capacity loads it locally and the shipped-null state must still
  // be provable.
  const { rows: savedGate } = await pool.query("SELECT value FROM app_setting WHERE key='capacity_gate'");
  await pool.query("DELETE FROM app_setting WHERE key='capacity_gate'");
  try {
    await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
    await page.goto("/oversight/board");
    await expect(page.getByRole("heading", { name: "Corporate board" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Coverage" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Exception queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Capacity against the gates/ })).toBeVisible();
    // The gate ships unset and says so; no invented threshold.
    await expect(page.getByText(/GATE UNSET/)).toBeVisible();
    // The Ruling 1 posture, visible on the page itself.
    await expect(page.getByText(/Per-HOM\s+utilization is deliberately absent/)).toBeVisible();
    // And structurally: no per-person capacity figures render. The demo HOM
    // identity's name appearing under Capacity would be the violation shape.
    const capacity = page.locator("div.card", { hasText: "Capacity against the gates" });
    await expect(capacity.getByText(/Jordan|per HOM|households\/HOM/)).toHaveCount(0);

    // 0055, the set half: with the ruling's figures loaded (the shape
    // db:capacity writes), the board reads the knob and evaluates the
    // aggregate state; still nothing per person.
    await pool.query(
      "INSERT INTO app_setting (key, value) VALUES ('capacity_gate', $1)",
      [JSON.stringify({ cap: 5, bandMin: 3, bandMax: 5, authority: "test" })]);
    await page.reload();
    await expect(page.getByText(/Gate set: cap 5, band 3 to 5/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/two-key\s+model change/)).toBeVisible();
    await expect(page.getByText(/GATE UNSET/)).toHaveCount(0);
    await expect(capacity.getByText(/Jordan|per HOM|households\/HOM/)).toHaveCount(0);
  } finally {
    await pool.query("DELETE FROM app_setting WHERE key='capacity_gate'");
    if (savedGate.length > 0) {
      await pool.query("INSERT INTO app_setting (key, value) VALUES ('capacity_gate', $1)", [JSON.stringify(savedGate[0].value)]);
    }
  }
});

test("contextual entry: the scan URL opens resolved context, capture is one gesture from it, and another tenant's entry refuses", async ({ context, page }) => {
  // WK-DEV-009 s3.3: an asset's link opens the operational context.
  const entryId = randomUUID();
  await pool.query(
    "INSERT INTO registry_entry (id, household_id, kind, label, detail, installed_at, maintenance_interval_months, last_serviced_at) VALUES ($1,$2,'appliance','Journey furnace','{}','2020-01-15T00:00:00Z',12,'2026-02-10T00:00:00Z')",
    [entryId, synId]);
  await pool.query(
    "INSERT INTO condition_flag (id, household_id, registry_entry_id, subject, location, concern, raised_by, revisit_condition) VALUES ($1,$2,$3,'rattle on startup','basement','worth a listen at next service',$4,'at the fall service')",
    [randomUUID(), synId, entryId, synHomId]);
  try {
    await context.addCookies([{ name: "authjs.session-token", value: synHomToken, url: BASE }]);
    await page.goto(`/context/${entryId}`);
    await expect(page.getByRole("heading", { name: "Journey furnace" })).toBeVisible({ timeout: 30_000 });
    // The maintenance clock computes from service facts (Feb 2026 + 12mo).
    await expect(page.getByText(/Next maintenance: 2027-02-10/)).toBeVisible();
    // Open history resolved with the scan.
    await expect(page.getByText("rattle on startup")).toBeVisible();

    // Capture from context: prefilled with the asset, lands routed, and
    // returns HERE with the recorded banner.
    const box = page.getByLabel("Tell Well Kept about this object");
    await expect(box).toHaveValue("Journey furnace: ");
    await box.fill("Journey furnace: pilot light took two tries");
    await page.getByRole("button", { name: "Tell Well Kept" }).click();
    await expect(page.getByText("captured; we handle the filing")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/context/${entryId}`));
    const { rows: [cap] } = await pool.query(
      "SELECT count(*)::int n FROM capture_artifact WHERE household_id=$1 AND content='Journey furnace: pilot light took two tries'", [synId]);
    expect(cap.n).toBe(1);

    // Another tenant's entry: no assignment, no principal, no page.
    const { rows: [fern] } = await pool.query(
      "SELECT id FROM registry_entry WHERE household_id=$1 AND tombstoned_at IS NULL LIMIT 1", [fernbrookId]);
    if (fern) {
      await page.goto(`/context/${fern.id}`);
      await page.waitForURL(/\/signin/, { timeout: 30_000 });
    }
  } finally {
    await pool.query("DELETE FROM condition_flag WHERE household_id=$1", [synId]);
    await pool.query("DELETE FROM registry_entry WHERE id=$1", [entryId]);
  }
});

test("task definitions: provisional by structure, refused short, and created idempotently by name", async ({ context, page }) => {
  // WL Gate 1 opener: everything provisional until the Task Inventory
  // ruling; the page says so and the create path proves the rails.
  await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
  const name = `Journey seasonal filter swap ${randomUUID().slice(0, 8)}`;
  try {
    await page.goto("/oversight/tasks");
    await expect(page.getByRole("heading", { name: /Task definitions/ })).toBeVisible({ timeout: 30_000 });

    // Refusing direction: three characters is not reusable semantics.
    await page.getByLabel("Task name").fill("ok");
    await page.getByRole("button", { name: "Add provisional definition" }).click();
    await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Task name").fill(name);
    await page.getByLabel("Task description").fill("Swap the return filter at the seasonal changeover.");
    await page.getByRole("button", { name: "Add provisional definition" }).click();
    await expect(page.locator("span.fname", { hasText: name })).toBeVisible({ timeout: 15_000 });
    const { rows: [d] } = await pool.query(
      "SELECT provisional, canonical_task_id FROM task_definition WHERE name=$1", [name]);
    expect(d.provisional).toBe(true);
    expect(d.canonical_task_id).toBeNull();
  } finally {
    await pool.query("DELETE FROM task_definition WHERE name=$1", [name]);
  }
});

test("task profile: configured from the library onto a household, updated in place, and the event lands", async ({ context, page }) => {
  // WL Gate 1 object 2: manifestation is per household, one per task.
  const defId = randomUUID();
  await pool.query(
    "INSERT INTO task_definition (id, name, created_by) VALUES ($1,$2,$3)",
    [defId, `Journey pantry audit ${defId.slice(0, 8)}`, rachelId]);
  try {
    await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
    await page.goto(`/oversight/${synId}`);
    await expect(page.getByRole("heading", { name: /Task profiles/ })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Task to configure").selectOption(defId);
    await page.getByLabel("Rhythm here").fill("every visit");
    await page.getByLabel("How this household wants it done").fill("top shelf first, labels out");
    await page.getByRole("button", { name: "Configure" }).click();
    const count = async (sql: string) => (await pool.query(sql, [synId])).rows[0].n as number;
    await expect.poll(() => count("SELECT count(*)::int n FROM household_task_profile WHERE household_id=$1"), { timeout: 20_000 }).toBe(1);
    expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='task_profile.configured'")).toBe(1);

    // Re-configuring updates in place: still one profile per task.
    await expect(page.getByText("top shelf first, labels out")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Task to configure").selectOption(defId);
    await page.getByLabel("Rhythm here").fill("weekly");
    await page.getByLabel("How this household wants it done").fill("labels out, rotate stock");
    await page.getByRole("button", { name: "Configure" }).click();
    await expect(page.getByText("labels out, rotate stock")).toBeVisible({ timeout: 15_000 });
    expect(await count("SELECT count(*)::int n FROM household_task_profile WHERE household_id=$1")).toBe(1);
    const { rows: [p] } = await pool.query(
      "SELECT cadence FROM household_task_profile WHERE household_id=$1", [synId]);
    expect(p.cadence).toBe("weekly");
  } finally {
    await pool.query("DELETE FROM household_task_profile WHERE household_id=$1", [synId]);
    await pool.query("DELETE FROM task_definition WHERE id=$1", [defId]);
  }
});

test("work requirement: instantiated from a profile with timing, verified only from completed, reopened whole", async ({ context, page }) => {
  // WL Gate 1 object 3: the manual rails Gate 3's generator will use.
  const defId = randomUUID();
  const profId = randomUUID();
  await pool.query("INSERT INTO task_definition (id, name, created_by) VALUES ($1,$2,$3)",
    [defId, `Journey filter swap ${defId.slice(0, 8)}`, rachelId]);
  await pool.query(
    "INSERT INTO household_task_profile (id, household_id, task_definition_id, configured_by) VALUES ($1,$2,$3,$4)",
    [profId, synId, defId, rachelId]);
  try {
    await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
    await page.goto(`/oversight/${synId}`);
    await expect(page.getByRole("heading", { name: /Work requirements/ })).toBeVisible({ timeout: 30_000 });

    // Refusing direction: no timing is not an instance.
    await page.getByLabel("Profile to instantiate").selectOption(profId);
    await page.getByRole("button", { name: "Generate instance" }).click();
    await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Profile to instantiate").selectOption(profId);
    await page.getByLabel("Or a stated context").fill("first dry week of fall");
    await page.getByRole("button", { name: "Generate instance" }).click();
    const count = async (sql: string) => (await pool.query(sql, [synId])).rows[0].n as number;
    await expect.poll(() => count("SELECT count(*)::int n FROM work_requirement WHERE household_id=$1"), { timeout: 20_000 }).toBe(1);
    expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='work_requirement.generated'")).toBe(1);

    // Verify before completion refuses: verify only checks completed work.
    await expect(page.getByText("generated · first dry week of fall")).toBeVisible({ timeout: 15_000 });
    const reqForm = () => page.locator("form", { has: page.getByLabel("Requirement decision") });
    await page.getByLabel("Requirement decision").selectOption("verify");
    await reqForm().getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

    // Complete whole, then verify whole.
    await page.getByLabel("Requirement decision").selectOption("complete");
    await reqForm().getByRole("button", { name: "Apply" }).click();
    await expect.poll(() => count("SELECT count(*)::int n FROM work_requirement WHERE household_id=$1 AND status='completed' AND completed_by IS NOT NULL"), { timeout: 20_000 }).toBe(1);
    await expect(page.getByText(/completed · first dry week of fall/)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Requirement decision").selectOption("verify");
    await reqForm().getByRole("button", { name: "Apply" }).click();
    await expect.poll(() => count("SELECT count(*)::int n FROM work_requirement WHERE household_id=$1 AND status='verified' AND verified_by IS NOT NULL"), { timeout: 20_000 }).toBe(1);
    expect(await count("SELECT count(*)::int n FROM event_outbox WHERE household_id=$1 AND kind='work_requirement.verified'")).toBe(1);
  } finally {
    await pool.query("DELETE FROM work_requirement WHERE household_id=$1", [synId]);
    await pool.query("DELETE FROM household_task_profile WHERE id=$1", [profId]);
    await pool.query("DELETE FROM task_definition WHERE id=$1", [defId]);
  }
});

test("estimate snapshot: appended never updated, blank is an honest unknown, zero refused server-side", async ({ context, page }) => {
  // WL Gate 1 object 4: history is the point; the latest renders, the
  // count says the estimate moved, and zero can never impersonate
  // unknown.
  const defId = randomUUID();
  const profId = randomUUID();
  const reqId = randomUUID();
  await pool.query("INSERT INTO task_definition (id, name, created_by) VALUES ($1,$2,$3)",
    [defId, `Journey gutter clear ${defId.slice(0, 8)}`, rachelId]);
  await pool.query(
    "INSERT INTO household_task_profile (id, household_id, task_definition_id, configured_by) VALUES ($1,$2,$3,$4)",
    [profId, synId, defId, rachelId]);
  await pool.query(
    "INSERT INTO work_requirement (id, household_id, task_profile_id, context_window, created_by) VALUES ($1,$2,$3,$4,$5)",
    [reqId, synId, profId, "first dry week", rachelId]);
  try {
    await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
    await page.goto(`/oversight/${synId}`);
    await expect(page.getByRole("heading", { name: /Work requirements/ })).toBeVisible({ timeout: 30_000 });

    // First estimate, with minutes.
    await page.getByLabel("Estimated minutes").fill("45");
    await page.getByLabel("Estimate basis").fill("manual corporate judgment");
    await page.getByRole("button", { name: "Record estimate" }).click();
    const count = async () => (await pool.query(
      "SELECT count(*)::int n FROM estimate_snapshot WHERE household_id=$1", [synId])).rows[0].n as number;
    await expect.poll(count, { timeout: 20_000 }).toBe(1);
    const { rows: [ev] } = await pool.query(
      "SELECT provenance, actor, object_id, correlation_id, event_version FROM event_outbox WHERE household_id=$1 AND kind='estimate_snapshot.recorded'",
      [synId]);
    expect(ev.provenance).toBe("action:recordEstimate");
    expect(ev.actor).toBe(rachelId);
    expect(ev.correlation_id).toBe(reqId);
    expect(ev.event_version).toBe(1);
    await expect(page.getByText(/Estimate: 45 min/)).toBeVisible({ timeout: 15_000 });

    // Second estimate, blank minutes: an APPEND recording an honest
    // unknown; the first row survives untouched.
    await page.getByLabel("Estimated minutes").fill("");
    await page.getByLabel("Estimate basis").fill("waiting on the first timed run");
    await page.getByRole("button", { name: "Record estimate" }).click();
    await expect.poll(count, { timeout: 20_000 }).toBe(2);
    const { rows: history } = await pool.query(
      "SELECT estimated_minutes, basis FROM estimate_snapshot WHERE household_id=$1 ORDER BY created_at DESC",
      [synId]);
    expect(history[0].estimated_minutes).toBeNull();
    expect(history[1].estimated_minutes).toBe(45);
    expect(history[1].basis).toBe("manual corporate judgment");
    await expect(page.getByText(/Estimate: unknown/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("2 estimates on record")).toBeVisible();

    // Zero refused SERVER-SIDE: the input carries no HTML min, so the
    // action's refusal (and behind it the CHECK) is what fires.
    await page.getByLabel("Estimated minutes").fill("0");
    await page.getByLabel("Estimate basis").fill("a zero pretending to be unknown");
    await page.getByRole("button", { name: "Record estimate" }).click();
    await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });
    expect(await count()).toBe(2); // nothing landed
  } finally {
    await pool.query("DELETE FROM estimate_snapshot WHERE household_id=$1", [synId]);
    await pool.query("DELETE FROM work_requirement WHERE household_id=$1", [synId]);
    await pool.query("DELETE FROM household_task_profile WHERE id=$1", [profId]);
    await pool.query("DELETE FROM task_definition WHERE id=$1", [defId]);
  }
});

test("task occurrence: appended actuals, exception whole or refused, zero refused, no performer stored", async ({ context, page }) => {
  // WL Gate 1 object 5: what actually happened, never touching the
  // estimate history, and never storing who performed the work.
  const defId = randomUUID();
  const profId = randomUUID();
  const reqId = randomUUID();
  await pool.query("INSERT INTO task_definition (id, name, created_by) VALUES ($1,$2,$3)",
    [defId, `Journey window wash ${defId.slice(0, 8)}`, rachelId]);
  await pool.query(
    "INSERT INTO household_task_profile (id, household_id, task_definition_id, configured_by) VALUES ($1,$2,$3,$4)",
    [profId, synId, defId, rachelId]);
  await pool.query(
    "INSERT INTO work_requirement (id, household_id, task_profile_id, context_window, created_by) VALUES ($1,$2,$3,$4,$5)",
    [reqId, synId, profId, "first mild afternoon", rachelId]);
  try {
    await context.addCookies([{ name: "authjs.session-token", value: rachelToken, url: BASE }]);
    await page.goto(`/oversight/${synId}`);
    await expect(page.getByRole("heading", { name: /Work requirements/ })).toBeVisible({ timeout: 30_000 });

    // Refusing direction first: an exception without its reason.
    await page.getByLabel("Occurred on").fill("2026-08-25");
    await page.getByLabel("Occurrence outcome").selectOption("exception");
    await page.getByRole("button", { name: "Record occurrence" }).click();
    await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });

    // As expected, with the actual time known.
    await page.getByLabel("Occurred on").fill("2026-08-25");
    await page.getByLabel("Occurrence outcome").selectOption("as_expected");
    await page.getByLabel("Actual minutes").fill("40");
    await page.getByRole("button", { name: "Record occurrence" }).click();
    const count = async () => (await pool.query(
      "SELECT count(*)::int n FROM task_occurrence WHERE household_id=$1", [synId])).rows[0].n as number;
    await expect.poll(count, { timeout: 20_000 }).toBe(1);
    const { rows: [ev] } = await pool.query(
      "SELECT provenance, actor, correlation_id, event_version FROM event_outbox WHERE household_id=$1 AND kind='task_occurrence.recorded'",
      [synId]);
    expect(ev.provenance).toBe("action:recordTaskOccurrence");
    expect(ev.actor).toBe(rachelId);
    expect(ev.correlation_id).toBe(reqId);
    expect(ev.event_version).toBe(1);
    await expect(page.getByText(/Last occurrence: 2026-08-25 · as expected · 40 min/)).toBeVisible({ timeout: 15_000 });

    // Exception whole appends; the first row is untouched, and the
    // table holds no performer column at all.
    await page.getByLabel("Occurred on").fill("2026-08-26");
    await page.getByLabel("Occurrence outcome").selectOption("exception");
    await page.getByLabel("Actual minutes").fill("90");
    await page.getByLabel("Variance reason").fill("screens stuck, second ladder needed");
    await page.getByRole("button", { name: "Record occurrence" }).click();
    await expect.poll(count, { timeout: 20_000 }).toBe(2);
    const { rows: history } = await pool.query(
      "SELECT outcome, actual_minutes, variance_note FROM task_occurrence WHERE household_id=$1 ORDER BY occurred_on",
      [synId]);
    expect(history[0].outcome).toBe("as_expected");
    expect(history[0].actual_minutes).toBe(40);
    expect(history[0].variance_note).toBeNull();
    expect(history[1].variance_note).toBe("screens stuck, second ladder needed");
    const { rows: cols } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='task_occurrence' AND column_name IN ('performed_by','completed_by','hom_id')");
    expect(cols.length).toBe(0); // WK-DEV-008 s1: no performer, schema-level
    await expect(page.getByText(/Last occurrence: 2026-08-26 · exception · 90 min/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("2 occurrences on record")).toBeVisible();

    // Zero refused SERVER-SIDE (no HTML min; the action is the wall).
    await page.getByLabel("Occurred on").fill("2026-08-27");
    await page.getByLabel("Occurrence outcome").selectOption("as_expected");
    await page.getByLabel("Actual minutes").fill("0");
    await page.getByRole("button", { name: "Record occurrence" }).click();
    await expect(page.getByText("Action refused.")).toBeVisible({ timeout: 15_000 });
    expect(await count()).toBe(2); // nothing landed
  } finally {
    await pool.query("DELETE FROM task_occurrence WHERE household_id=$1", [synId]);
    await pool.query("DELETE FROM work_requirement WHERE household_id=$1", [synId]);
    await pool.query("DELETE FROM household_task_profile WHERE id=$1", [profId]);
    await pool.query("DELETE FROM task_definition WHERE id=$1", [defId]);
  }
});
