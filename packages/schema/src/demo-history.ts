/**
 * demo-history.ts : Fernbrook's operating history and its consent
 * (pnpm db:demo-history). Runs after db:demo.
 *
 * TWO THINGS, and the second has a consequence worth reading before it is
 * run.
 *
 * 1. THE CHANGE LOG. Ten rows stopping on 28 July, five of them the same
 *    s3 view, means the visible history is mostly people LOOKING rather
 *    than work happening. On a household served weekly since March that
 *    reads as a record nobody is writing to. This extends it to roughly
 *    thirty rows across March to September, weighted toward ordinary
 *    operations: field merges, visits applied, client edits reviewed, and
 *    the role assignment when Devon came on as backup. The s3 reveals
 *    stay, spaced out rather than clustered, because they are real and
 *    removing them would be editing the record rather than extending it.
 *
 * 2. CONSENT, signed 12 March 2026, before the first visit.
 *
 *    THE CONSEQUENCE, stated here because it is a real loss and not a
 *    side effect: Fernbrook is currently the only household where the red
 *    NO-CONSENT branch renders. The Smoke Test Fixture stopped being a
 *    test surface for it when the fixture gained consent on 25 August.
 *    Setting Fernbrook's removes the last place that path can be seen.
 *    The trade is deliberate, because a COO reading a red consent banner
 *    on a six-month household is the worse outcome, and it is recorded in
 *    the register rather than left to be rediscovered.
 *
 * Fernbrook is resolved by PINNED ID (G-95). Idempotent: rows are keyed by
 * a deterministic marker in `detail`, so a re-run replaces rather than
 * duplicating.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { FERNBROOK_DEMO_ID } from "../../../tooling/fixture-ids.mjs";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});

const hh = await pool.query("SELECT id, name FROM household WHERE id = $1", [FERNBROOK_DEMO_ID]);
if (!hh.rowCount) {
  console.error(`No household at the pinned Fernbrook id ${FERNBROOK_DEMO_ID}.`);
  console.error("This script writes history and consent and will not guess which household to write to.");
  process.exit(1);
}
const householdId: string = hh.rows[0].id;
console.log(`Fernbrook resolved by pinned id: ${hh.rows[0].name}`);

const users = await pool.query(
  "SELECT id, email FROM auth_user WHERE email IN ($1,$2,$3)",
  ["jordan@wellkept.demo", "rachel@wellkept.demo", "lisa@fernbrook.demo"]);
const by = (email: string) => users.rows.find((r) => r.email === email)?.id;
const jordan = by("jordan@wellkept.demo");
const rachel = by("rachel@wellkept.demo");
const lisa = by("lisa@fernbrook.demo");
if (!jordan || !rachel || !lisa) {
  console.error("Missing a demo identity; run `pnpm db:demo` first.");
  process.exit(1);
}

// [when, actor, role, kind, detail]. Weighted toward ordinary operations:
// visits applied and fields merged are what a served household's log
// should mostly be made of.
type Row = [string, string, string, string, Record<string, unknown>];
const HISTORY: Row[] = [
  ["2026-03-12T15:10:00Z", rachel, "corporate_admin", "consent_recorded", { note: "signed consent on record" }],
  ["2026-03-12T15:40:00Z", rachel, "corporate_admin", "role_assigned", { role: "house_manager", who: "Jordan" }],
  ["2026-03-14T13:05:00Z", rachel, "corporate_admin", "intake_completed", { sections: 23 }],
  ["2026-03-19T18:20:00Z", jordan, "house_manager", "visit_applied", { visit: 1 }],
  ["2026-03-19T18:35:00Z", jordan, "house_manager", "field_merged", { field: "Products by surface" }],
  ["2026-03-26T18:15:00Z", jordan, "house_manager", "visit_applied", { visit: 2 }],
  ["2026-04-02T18:22:00Z", jordan, "house_manager", "visit_applied", { visit: 3 }],
  ["2026-04-04T11:40:00Z", jordan, "house_manager", "field_merged", { field: "Shoes-off household" }],
  ["2026-04-09T18:05:00Z", jordan, "house_manager", "visit_applied", { visit: 4 }],
  ["2026-04-16T18:30:00Z", jordan, "house_manager", "visit_applied", { visit: 5 }],
  ["2026-04-21T09:15:00Z", lisa, "client", "client_edit_submitted", { field: "Important-dates registry" }],
  ["2026-04-21T14:50:00Z", jordan, "house_manager", "client_edit_reviewed", { outcome: "merged" }],
  ["2026-04-23T18:12:00Z", jordan, "house_manager", "visit_applied", { visit: 6 }],
  ["2026-05-07T18:18:00Z", jordan, "house_manager", "visit_applied", { visit: 8 }],
  ["2026-05-14T16:05:00Z", rachel, "corporate_admin", "s3_corporate_view", { reason: "quarterly access review" }],
  ["2026-05-21T18:25:00Z", jordan, "house_manager", "visit_applied", { visit: 10 }],
  ["2026-05-28T18:09:00Z", jordan, "house_manager", "visit_applied", { visit: 11 }],
  ["2026-05-28T18:40:00Z", jordan, "house_manager", "field_merged", { field: "Returns protocol" }],
  ["2026-06-11T18:14:00Z", jordan, "house_manager", "visit_applied", { visit: 13 }],
  ["2026-06-14T14:00:00Z", jordan, "house_manager", "field_merged", { field: "The small standing orders" }],
  ["2026-06-18T18:20:00Z", jordan, "house_manager", "visit_applied", { visit: 14 }],
  ["2026-06-30T10:30:00Z", rachel, "corporate_admin", "role_assigned", { role: "backup_hm", who: "Devon" }],
  ["2026-07-09T18:16:00Z", jordan, "house_manager", "visit_applied", { visit: 17 }],
  ["2026-07-16T15:45:00Z", rachel, "corporate_admin", "s3_corporate_view", { reason: "vault key rotation check" }],
  ["2026-07-23T18:11:00Z", jordan, "house_manager", "visit_applied", { visit: 19 }],
  ["2026-08-06T18:19:00Z", jordan, "house_manager", "visit_applied", { visit: 21 }],
  ["2026-08-13T09:50:00Z", lisa, "client", "client_edit_submitted", { field: "School communication channels" }],
  ["2026-08-13T15:20:00Z", jordan, "house_manager", "client_edit_reviewed", { outcome: "merged" }],
  ["2026-08-20T18:24:00Z", jordan, "house_manager", "visit_applied", { visit: 23 }],
  ["2026-08-27T18:07:00Z", jordan, "house_manager", "visit_applied", { visit: 24 }],
  ["2026-08-28T15:30:00Z", rachel, "corporate_admin", "s3_corporate_view", { reason: "pre-review spot check" }],
  ["2026-09-01T11:15:00Z", jordan, "house_manager", "field_merged", { field: "Sizes registry per child" }],
];

// Idempotent by a marker in detail: a re-run replaces its own rows and
// leaves anything a person or the app wrote alone. An append-only table
// is not a licence to duplicate demo rows on every run.
await pool.query(
  "DELETE FROM audit_event WHERE household_id = $1 AND detail ? 'demoSeed'", [householdId]);
for (const [when, actor, role, kind, detail] of HISTORY) {
  await pool.query(
    `INSERT INTO audit_event (id, household_id, actor_user, actor_role, kind, detail, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
    [randomUUID(), householdId, actor, role, kind, JSON.stringify({ ...detail, demoSeed: true }), when]);
}
console.log(`change log: ${HISTORY.length} rows seeded, March to September`);

// Consent. Signed before the first visit, which is the point: a household
// served since March with no consent on record would be the finding.
await pool.query(
  `UPDATE household SET consent_signed_at = $1, consent_doc_version = $2,
     consent_recorded_by = $3, updated_at = now() WHERE id = $4`,
  ["2026-03-12T15:00:00Z", "WK-LEG-001 v3", rachel, householdId]);
console.log("consent: signed 2026-03-12, doc version WK-LEG-001 v3");

const after = await pool.query(
  `SELECT (SELECT count(*) FROM audit_event WHERE household_id=$1) AS rows,
          (SELECT count(DISTINCT kind) FROM audit_event WHERE household_id=$1) AS kinds,
          (SELECT count(DISTINCT actor_user) FROM audit_event WHERE household_id=$1) AS actors,
          (SELECT min(created_at) FROM audit_event WHERE household_id=$1) AS earliest,
          (SELECT max(created_at) FROM audit_event WHERE household_id=$1) AS latest,
          (SELECT consent_signed_at FROM household WHERE id=$1) AS consent`, [householdId]);
const a = after.rows[0];
console.log(`\nchange log now: ${a.rows} rows, ${a.kinds} kinds, ${a.actors} actors`);
console.log(`  ${new Date(a.earliest).toISOString().slice(0,10)} to ${new Date(a.latest).toISOString().slice(0,10)}`);
console.log(`consent on record: ${new Date(a.consent).toISOString().slice(0,10)}`);
await pool.end();
