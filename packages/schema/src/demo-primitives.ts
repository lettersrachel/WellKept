/**
 * demo-primitives.ts : Fernbrook's preference rules, situations, work
 * items and trailing time (pnpm db:demo-primitives). Runs after db:demo.
 *
 * THE RULE THAT GOVERNS EVERY ROW HERE, from the spec: each one must be
 * traceable to something already in Fernbrook's record. A work item about
 * a vendor this household does not use, or a preference rule contradicting
 * the decision-maker map, is worse than an empty panel, because it makes
 * the record internally inconsistent and that is exactly what a careful
 * reader finds. Every row below is cross-checked against the household
 * summary, the decision-maker map, the children's rules, the standing
 * orders, the vendor list and the registry.
 *
 * DELIBERATELY NOT SEEDED, and both absences are arguments rather than
 * gaps:
 *   decision_record  belongs to the corporate view; its absence does not
 *                    thin the HOM surface.
 *   shadow_log       the engine has watched and nothing has been promoted,
 *                    and THAT IS THE ARGUMENT. Populating it would invent
 *                    scoring evidence, which is the one kind of
 *                    fabrication that would actually matter.
 *
 * NO AUDIT ROWS, the same position as the playbook fill: seeded content on
 * a demonstration household is stated to anyone who sees it, and writing
 * history that did not happen is the thing this record must not do.
 *
 * Fernbrook is resolved by PINNED ID and this refuses rather than guessing
 * (G-95). Idempotent by the row's own text, so re-running before a demo is
 * safe without checking first. Counts at the end are queried from the
 * database, not stated in a header (the derived-count discipline).
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
  console.error("This script writes demo content and will not guess which household to write to.");
  process.exit(1);
}
const H: string = hh.rows[0].id;
console.log(`Fernbrook resolved by pinned id: ${hh.rows[0].name}`);

const u = await pool.query("SELECT id, email FROM auth_user WHERE email = ANY($1)",
  [["jordan@wellkept.demo", "rachel@wellkept.demo"]]);
const jordan = u.rows.find((r) => r.email === "jordan@wellkept.demo")?.id;
const rachel = u.rows.find((r) => r.email === "rachel@wellkept.demo")?.id;
if (!jordan || !rachel) { console.error("Missing a demo identity; run `pnpm db:demo` first."); process.exit(1); }

// ---------------------------------------------------------------------
// 1. Preference rules. Five active, one retired.
// ---------------------------------------------------------------------
// The RETIRED one is the demonstration: a rule that was true, stopped
// being true because a child grew up, and was retired WITH A HUMAN REASON
// rather than edited away. Its original text stays readable exactly as
// written. That is the record behaving like a record, and it is the
// never-edits-in-place property made visible in one row.
const RULES: { at: string; rule: string; retired?: { at: string; reason: string } }[] = [
  { at: "2026-03-26T14:00:00Z", rule: "Coffee is reordered at half a can. It does not run out." },
  { at: "2026-04-02T14:00:00Z", rule: "No upstairs vacuum before 3pm. Owen naps until then.",
    retired: { at: "2026-08-28T14:00:00Z", reason: "Owen started kindergarten; the nap is over." } },
  { at: "2026-04-09T14:00:00Z", rule: "Mia's door: knock and wait. She answers." },
  { at: "2026-05-21T14:00:00Z", rule: "The rear gate is checked on every exit. Biscuit can push it." },
  { at: "2026-06-18T14:00:00Z", rule: "Returns go out on the Wednesday errand run, from the garage shelf." },
  { at: "2026-07-14T14:00:00Z", rule: "Homework before any playdate. The HOM does not negotiate exceptions." },
];
let rulesWritten = 0;
for (const r of RULES) {
  const existing = await pool.query(
    "SELECT id FROM preference_rule WHERE household_id = $1 AND rule = $2", [H, r.rule]);
  if (existing.rowCount) continue;
  await pool.query(
    `INSERT INTO preference_rule (id, household_id, rule, provenance, confidence, recorded_by,
       status, retired_reason, retired_at, retired_by, created_at, updated_at)
     VALUES ($1,$2,$3,'explicit',NULL,$4,$5,$6,$7,$8,$9,$9)`,
    [randomUUID(), H, r.rule, jordan,
     r.retired ? "retired" : "active",
     r.retired?.reason ?? null, r.retired?.at ?? null, r.retired ? jordan : null, r.at]);
  rulesWritten += 1;
}

// ---------------------------------------------------------------------
// 2. Situations. One resolved, one open.
// ---------------------------------------------------------------------
// The resolved one is the spine: it makes the kindergarten runway legible
// as ONE thing rather than nine scattered touches. The open one shows a
// situation opened BEFORE anything is urgent, which is the whole argument.
const SITUATIONS: { label: string; at: string; resolved?: { at: string; note: string } }[] = [
  { label: "Owen's kindergarten transition", at: "2026-05-26T13:00:00Z",
    resolved: { at: "2026-09-01T15:00:00Z", note: "First day went without incident. Nothing outstanding." } },
  { label: "Thanksgiving hosting, 26 November, twenty-five people. Early work starting: table and seating count, guest bedroom turnover, the two dishes Gram Ruth expects.",
    at: "2026-08-25T13:00:00Z" },
];
let sitsWritten = 0;
for (const s of SITUATIONS) {
  const existing = await pool.query(
    "SELECT id FROM situation WHERE household_id = $1 AND label = $2", [H, s.label]);
  if (existing.rowCount) continue;
  await pool.query(
    `INSERT INTO situation (id, household_id, label, created_by, status, resolution,
       resolved_at, resolved_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
    [randomUUID(), H, s.label, jordan, s.resolved ? "resolved" : "open",
     s.resolved?.note ?? null, s.resolved?.at ?? null, s.resolved ? jordan : null, s.at]);
  sitsWritten += 1;
}

// ---------------------------------------------------------------------
// 3. Work items. Three closed, two open.
// ---------------------------------------------------------------------
// The ceiling row is the most valuable single row in the set: a vendor
// caused damage, did not report it, the HOM noticed it on a routine visit,
// and it closed in a week at no cost to the household. That is the closed
// loop working, and it is deliberately a WORK ITEM rather than an
// incident. An incident is a complaint, breakage, injury or near-miss;
// filing this as one would read as a household complaint, which is the
// wrong story about a good outcome.
//
// The anode row pairs with the prompt: the prompt says it is overdue, the
// work item says a person has picked it up and how they will handle it.
// Together they show the handoff from anticipation to work, which is the
// seam most systems get wrong.
const WORK: { title: string; detail: string; kind: string; at: string;
  due?: string; window?: string; done?: { at: string; resolution: string } }[] = [
  { title: "Ceiling touch-up, upstairs hall", kind: "vendor", at: "2026-06-04T13:00:00Z",
    detail: "Ladder mark left after a vendor visit. Noticed on the visit, not reported by the vendor. No cost to the household.",
    done: { at: "2026-06-11T15:00:00Z", resolution: "Touched up and matched. Vendor told, no charge raised." } },
  { title: "Kindergarten supply order", kind: "runway", at: "2026-08-07T13:00:00Z",
    detail: "Placed ahead of the late-summer rush, against the list from the Maple Grove app.",
    done: { at: "2026-08-09T16:00:00Z", resolution: "Ordered and delivered. List printed to the corkboard." } },
  { title: "Uniform sizing check before ordering", kind: "runway", at: "2026-08-21T13:00:00Z",
    detail: "Checked against the sizes registry before ordering. Owen moved to 5T.",
    done: { at: "2026-08-21T17:00:00Z", resolution: "Sizes confirmed and the registry updated the same day." } },
  // NO GUTTER ROW HERE. db:demo already seeds "Gutter vendor: fall clean
  // scheduling", which is the same work. The spec asked for a gutter item
  // without knowing one existed; adding a second would put two rows on one
  // job, which is precisely the internal inconsistency the spec's own
  // governing rule warns against. The existing row covers it.
  { title: "Water heater anode check", kind: "followup", at: "2026-09-03T13:00:00Z",
    detail: "Now overdue. Raise once, in person, per the household's own protocol.",
    window: "Raise at the next visit" },
];
let workWritten = 0;
for (const w of WORK) {
  const existing = await pool.query(
    "SELECT id FROM work_item WHERE household_id = $1 AND title = $2", [H, w.title]);
  if (existing.rowCount) continue;
  await pool.query(
    `INSERT INTO work_item (id, household_id, title, detail, kind, source, due_date,
       window_condition, status, resolution, resolved_at, resolved_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,'hm_capture',$6,$7,$8,$9,$10,$11,$12,$12)`,
    [randomUUID(), H, w.title, w.detail, w.kind, w.due ?? null, w.window ?? null,
     w.done ? "done" : "open", w.done?.resolution ?? null, w.done?.at ?? null,
     w.done ? jordan : null, w.at]);
  workWritten += 1;
}

// ---------------------------------------------------------------------
// 4. Trailing thirty days of time.
// ---------------------------------------------------------------------
// Four Thursday visits in the window before the demo clock, plus travel
// each way and one admin entry. Without these the corporate board's
// capacity panel sits at zero, which makes the gates look untested rather
// than unused.
const VISIT_DAYS = ["2026-08-06", "2026-08-13", "2026-08-20", "2026-08-27"];
const DELIVERY_MIN = [210, 240, 240, 240]; // 3.5 to 4 hours, per the spec
let timeWritten = 0;
for (let i = 0; i < VISIT_DAYS.length; i += 1) {
  const day = VISIT_DAYS[i]!;
  const mins = DELIVERY_MIN[i]!;
  const rows: [string, string, string, number, string][] = [
    ["travel", `${day}T12:35:00Z`, `${day}T13:00:00Z`, 25, "Drive out"],
    ["delivery", `${day}T13:00:00Z`, `${day}T${String(13 + Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00Z`, mins, "Weekly visit"],
    ["travel", `${day}T17:30:00Z`, `${day}T17:55:00Z`, 25, "Drive back"],
  ];
  for (const [category, startedAt, endedAt, minutes, note] of rows) {
    const existing = await pool.query(
      "SELECT id FROM time_entry WHERE household_id = $1 AND started_at = $2 AND category = $3::time_category",
      [H, startedAt, category]);
    if (existing.rowCount) continue;
    await pool.query(
      `INSERT INTO time_entry (id, household_id, user_id, category, started_at, ended_at, minutes, source, note)
       VALUES ($1,$2,$3,$4::time_category,$5,$6,$7,'seed',$8)`,
      [randomUUID(), H, jordan, category, startedAt, endedAt, minutes, note]);
    timeWritten += 1;
  }
}
{
  const startedAt = "2026-08-28T09:00:00Z";
  const existing = await pool.query(
    "SELECT id FROM time_entry WHERE household_id = $1 AND started_at = $2 AND category = 'admin'::time_category", [H, startedAt]);
  if (!existing.rowCount) {
    await pool.query(
      `INSERT INTO time_entry (id, household_id, user_id, category, started_at, ended_at, minutes, source, note)
       VALUES ($1,$2,$3,'admin'::time_category,$4,$5,30,'seed',$6)`,
      [randomUUID(), H, rachel, startedAt, "2026-08-28T09:30:00Z", "Vendor scheduling and the supply order follow-up"]);
    timeWritten += 1;
  }
}

// ---------------------------------------------------------------------
// Counts, queried rather than stated.
// ---------------------------------------------------------------------
const c = await pool.query(
  `SELECT
     (SELECT count(*) FROM preference_rule WHERE household_id=$1 AND status='active')::int   AS rules_active,
     (SELECT count(*) FROM preference_rule WHERE household_id=$1 AND status='retired')::int  AS rules_retired,
     (SELECT count(*) FROM situation WHERE household_id=$1 AND status='open')::int           AS sits_open,
     (SELECT count(*) FROM situation WHERE household_id=$1 AND status='resolved')::int       AS sits_resolved,
     (SELECT count(*) FROM work_item WHERE household_id=$1 AND status='open')::int           AS work_open,
     (SELECT count(*) FROM work_item WHERE household_id=$1 AND status='done')::int           AS work_done,
     (SELECT count(*) FROM dot WHERE household_id=$1 AND promoted_field_id IS NULL)::int     AS dots_open,
     -- The TRAILING THIRTY DAYS to the demo clock, not all time. The first
     -- version summed every delivery entry ever and reported 169.5 hours
     -- where the window holds 15.5, which would have gone into a founder's
     -- note as a fact about capacity.
     (SELECT coalesce(sum(minutes),0) FROM time_entry WHERE household_id=$1 AND category='delivery'
        AND started_at >= '2026-08-04' AND started_at < '2026-09-04')::int AS delivery_min,
     (SELECT count(*) FROM shadow_log WHERE household_id=$1)::int                            AS shadow,
     (SELECT count(*) FROM decision_record WHERE household_id=$1)::int                       AS decisions`, [H]);
const n = c.rows[0];
console.log(`\nwritten this run: ${rulesWritten} rule(s), ${sitsWritten} situation(s), ${workWritten} work item(s), ${timeWritten} time entr(ies)`);
console.log(`preference rules: ${n.rules_active} active, ${n.rules_retired} retired`);
console.log(`situations:       ${n.sits_open} open, ${n.sits_resolved} resolved`);
console.log(`work items:       ${n.work_open} open, ${n.work_done} done`);
console.log(`open dots:        ${n.dots_open}`);
console.log(`delivery time:    ${(n.delivery_min / 60).toFixed(1)} hours in the trailing 30 days to the demo clock`);
console.log(`deliberately empty: shadow_log ${n.shadow}, decision_record ${n.decisions}`);
await pool.end();
