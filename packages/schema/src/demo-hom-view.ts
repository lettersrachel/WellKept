/**
 * demo-hom-view.ts : dress the Fernbrook HOM view to the demo spec
 * (pnpm db:demo-hom). Runs after db:demo, which creates the household,
 * its fields, its registries and its people.
 *
 * WHAT THIS IS FOR. The HOM view answers one question: what does Jordan
 * need to know before walking in. Three panels were undermining that. The
 * prompt panel showed eight items all claiming to be due today while
 * spanning five weeks; the forward panel was empty; and the recent-change
 * and dot panels were dated to July on a September view.
 *
 * The prompt half of that was a real defect and is fixed in code, not
 * here (computed labels, separate caps, answering retires). This script
 * only supplies the DATA those surfaces read.
 *
 * FERNBROOK IS RESOLVED BY PINNED ID, never by name and never by
 * "the first household". `db:demo` still takes `SELECT id FROM household
 * LIMIT 1`, which is the shape that put a capture on the wrong tenant
 * once already; nothing here inherits it.
 *
 * Idempotent throughout: re-running changes nothing that is already
 * right, so it is safe to run before a demo without checking first.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
// Relative source import rather than a package one: schema must not take
// a dependency on trigger-engine (the graph runs the other way), and this
// is a seed script, not shipped app code. Same precedent as the pinned-id
// import below.
import { sweepRegistryDates, sweepItemId } from "../../trigger-engine/src/registry-sweep.ts";
import { FERNBROOK_DEMO_ID } from "../../../tooling/fixture-ids.mjs";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});

const hh = await pool.query("SELECT id, name FROM household WHERE id = $1", [FERNBROOK_DEMO_ID]);
if (!hh.rowCount) {
  console.error(`No household at the pinned Fernbrook id ${FERNBROOK_DEMO_ID}.`);
  console.error("Run `pnpm db:demo` first, or re-pin tooling/fixture-ids.mjs from the real row.");
  process.exit(1);
}
const householdId: string = hh.rows[0].id;
console.log(`Fernbrook resolved by pinned id: ${hh.rows[0].name}`);

const [jordan] = (await pool.query(
  "SELECT id FROM auth_user WHERE email = $1", ["jordan@wellkept.demo"])).rows;
if (!jordan) { console.error("No jordan@wellkept.demo; run `pnpm db:demo` first."); process.exit(1); }

// ---------------------------------------------------------------------
// 1. The water heater's maintenance facts.
// ---------------------------------------------------------------------
// The anode line is the demonstration, so it must be DERIVED and not
// written. Four facts go in: installed 2019-06-01, a 36-month interval,
// last serviced 2023-07-04, and the sweep's own T-14 window. Nobody types
// the sentence a HOM reads; the sweep composes it and the label computes
// its lateness from the prompt's age.
//
// A tank serviced in 2023 and due again in July 2026 is an ordinary
// well-run house, and the record catching the miss is the story. A 2019
// tank with no anode check in seven years would be a household somebody
// had been asleep on, which is not the demo.
const WH = await pool.query(
  `UPDATE registry_entry
      SET installed_at = '2019-06-01T13:00:00Z',
          maintenance_interval_months = 36,
          last_serviced_at = '2023-07-04T13:00:00Z'
    WHERE household_id = $1 AND kind = 'appliance' AND label = 'Water heater'
    RETURNING id, label, installed_at, maintenance_interval_months, last_serviced_at`,
  [householdId]);
if (!WH.rowCount) { console.error("No Water heater appliance entry on Fernbrook; run `pnpm db:demo`."); process.exit(1); }
const heater = WH.rows[0];
console.log(`water heater: installed ${new Date(heater.installed_at).toISOString().slice(0, 10)}, ` +
  `every ${heater.maintenance_interval_months} months, last serviced ${new Date(heater.last_serviced_at).toISOString().slice(0, 10)}`);

// ---------------------------------------------------------------------
// 2. The anode prompt, produced by the REAL sweep at its window opening.
// ---------------------------------------------------------------------
// `nextIntervalOccurrence` can never return a past date (G-94), so
// running the sweep today yields the 2029 cycle and no overdue item. The
// July 2026 prompt is one a sweep RAISED ON TIME on 20 June 2026, when
// the T-14 window opened, and that nobody answered. So the sweep is
// called with that date as `now` and its output inserted verbatim,
// including the deterministic id. The row is indistinguishable from one
// the scheduled sweep wrote, because it is one, composed by the same code
// with the same inputs.
const WINDOW_OPENED = new Date("2026-06-20T14:00:00Z");
const anodeDrafts = sweepRegistryDates([{
  id: heater.id, householdId, kind: "appliance", label: heater.label,
  keyDate: new Date("2019-06-01T13:00:00Z"), cadence: "anode check every 3 yr",
  installedAt: new Date(heater.installed_at),
  maintenanceIntervalMonths: heater.maintenance_interval_months,
  lastServicedAt: new Date(heater.last_serviced_at),
}], { now: WINDOW_OPENED, statusTag: "STEADY" });
if (anodeDrafts.length !== 1) {
  console.error(`Expected exactly one anode draft from the sweep, got ${anodeDrafts.length}.`);
  console.error("The derivation changed; do not paper over this by writing the row by hand.");
  process.exit(1);
}

// ---------------------------------------------------------------------
// 3. Prompts: what is open now, and what is coming.
// ---------------------------------------------------------------------
// Dates are absolute rather than relative to today, because a demo run on
// two different days must show the same household. The labels move with
// the clock, which is the point: they are computed, not stored.
const NOW_ITEMS = [
  { key: "kindergarten-readiness", text: "First full school week. Confirm the morning rhythm is holding and note anything that is not.", fire: "2026-09-03T13:00:00Z", target: "2026-09-03" },
  { key: "dates-radar", text: "Anniversary is 14 September. Is a gesture planned?", fire: "2026-08-31T13:00:00Z", target: "2026-09-14" },
];
const UPCOMING = [
  { key: "dates-radar", text: "Anniversary, 14 September. Gesture gate opens 7 September.", fire: "2026-09-07T13:00:00Z", target: "2026-09-14" },
  { key: "dates-radar", text: "Mia's class presentation, 18 September. Morning quiet requested.", fire: "2026-09-16T13:00:00Z", target: "2026-09-18" },
  { key: "dates-radar", text: "Gram Ruth's birthday, 3 October. Card and call, per the household's own pattern.", fire: "2026-09-26T13:00:00Z", target: "2026-10-03" },
  { key: "appliance-radar", text: "Gutter cleaning, October window. Book before the leaf rush.", fire: "2026-09-30T13:00:00Z", target: "2026-10-15" },
  { key: "commitment-radar", text: "Thanksgiving hosting, 26 November, 25 people. Runway opens.", fire: "2026-10-08T13:00:00Z", target: "2026-11-26" },
  { key: "appliance-radar", text: "HVAC filter due 12 February. Ordered in pairs; check stock at the October visit.", fire: "2026-10-15T13:00:00Z", target: "2027-02-12" },
];
const RULE_IDS: Record<string, string> = {
  "kindergarten-readiness": "01980000-0000-7000-8000-000000000d07",
  "dates-radar": "01980000-0000-7000-8000-000000000d01",
  "appliance-radar": "01980000-0000-7000-8000-000000000d06",
  "commitment-radar": "01980000-0000-7000-8000-000000000d02",
};

async function upsertPrompt(id: string, key: string, text: string, fireAt: Date, target: string | null) {
  const existing = await pool.query(
    "SELECT id FROM prompt_pack_item WHERE household_id=$1 AND item_text=$2", [householdId, text]);
  if (existing.rowCount) {
    await pool.query(
      "UPDATE prompt_pack_item SET fire_at=$1, fired_at=NULL, target_date=$2 WHERE id=$3",
      [fireAt, target, existing.rows[0].id]);
    return false;
  }
  await pool.query(
    `INSERT INTO prompt_pack_item (id, household_id, trigger_rule_id, pack_key, pack_name,
       item_text, fire_at, fired_at, target_date) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8)`,
    [id, householdId, RULE_IDS[key] ?? RULE_IDS["dates-radar"], key, key, text, fireAt, target]);
  return true;
}

// The anode item first, from the sweep's own draft.
const anode = anodeDrafts[0]!;
const anodeId = await sweepItemId(heater.id, anode.occurrence, anode.itemText);
await upsertPrompt(anodeId, anode.packKey, anode.itemText, anode.fireAt, anode.occurrence.slice(0, 10));
console.log(`anode prompt: "${anode.itemText}"`);
console.log(`  raised ${anode.fireAt.toISOString().slice(0, 10)} at T-14, occurrence ${anode.occurrence.slice(0, 10)}, unanswered`);

let added = 0;
for (const p of [...NOW_ITEMS, ...UPCOMING]) {
  if (await upsertPrompt(randomUUID(), p.key, p.text, new Date(p.fire), p.target)) added += 1;
}
console.log(`prompts: ${added} added, ${NOW_ITEMS.length + UPCOMING.length + 1 - added} already present and refreshed`);

// ---------------------------------------------------------------------
// 4. Everything older moves to ANSWERED, with outcomes.
// ---------------------------------------------------------------------
// The anticipation history belongs in the record, not in today's queue.
// Answering is what retires a prompt (the 27 August ruling), so these are
// retired the only way anything is: by carrying an outcome. `fired_at` is
// set to the answer time, which is what closes them.
const SEEDED = [anode.itemText, ...NOW_ITEMS.map((p) => p.text), ...UPCOMING.map((p) => p.text)];
const stale = await pool.query(
  `SELECT id, fire_at, trigger_rule_id FROM prompt_pack_item
    WHERE household_id = $1 AND fired_at IS NULL AND NOT (item_text = ANY($2))`,
  [householdId, SEEDED]);
let answered = 0;
for (const row of stale.rows) {
  const answeredAt = new Date(new Date(row.fire_at).getTime() + 3 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO prompt_outcome (id, household_id, prompt_id, rule_id, user_id, role,
       outcome, fired_at, answered_at, was_news)
     VALUES ($1,$2,$3,$7,$4,'house_manager','acted',$5,$6,false)
     ON CONFLICT (prompt_id, user_id) DO NOTHING`,
    [randomUUID(), householdId, row.id, jordan.id, row.fire_at, answeredAt, row.trigger_rule_id]);
  await pool.query("UPDATE prompt_pack_item SET fired_at = $1 WHERE id = $2", [answeredAt, row.id]);
  answered += 1;
}
console.log(`older prompts retired with outcomes: ${answered}`);

// ---------------------------------------------------------------------
// 5. Changed since last visit: late August, not July.
// ---------------------------------------------------------------------
const CHANGED: [string, string, string, string][] = [
  ["%sizing check%", "Owen: 5T, shoe 12. Mia: girls 10, shoe 4.5. Seasonal changeover done ahead of school.", "2026-08-28T15:00:00Z", "asked"],
  ["Important-dates registry%", "Lisa added: Mia has a class presentation 18 September. Wants the morning quiet.", "2026-08-29T16:00:00Z", "client_written"],
  ["Grocery: stores, order%", "Coffee reorder moved to two cans at a time through the fall. David is working later.", "2026-08-30T14:00:00Z", "observed"],
  ["%school%", "Kindergarten uses a separate app from Maple Grove. Both now go to Lisa; supply lists still print to the corkboard.", "2026-09-01T13:00:00Z", "asked"],
];
let changed = 0;
for (const [pattern, value, when, prov] of CHANGED) {
  const r = await pool.query(
    `UPDATE playbook_field SET value=$1, provenance=$2::provenance, provenance_date=$3,
       confirmed=true, updated_at=$3
     WHERE id = (SELECT id FROM playbook_field WHERE household_id=$4 AND name ILIKE $5 LIMIT 1)
     RETURNING id`,
    [value, prov, when, householdId, pattern]);
  if (r.rowCount) changed += 1; else console.log(`  (no field matched ${pattern})`);
}
console.log(`changed-since fields refreshed: ${changed}/${CHANGED.length}`);

// ---------------------------------------------------------------------
// 6. Dots, including the one recording that an earlier gesture landed.
// ---------------------------------------------------------------------
const DOTS = [
  { verbatim: "Mia said the new teacher lets them read outside on Fridays.", heardAt: "2026-08-27T14:40:00Z" },
  { verbatim: "Lisa said the coffee thing has been \"weirdly life-changing\" again, unprompted.", heardAt: "2026-08-27T15:05:00Z" },
];
let dots = 0;
for (const d of DOTS) {
  const existing = await pool.query("SELECT 1 FROM dot WHERE household_id=$1 AND verbatim=$2", [householdId, d.verbatim]);
  if (existing.rowCount) continue;
  await pool.query(
    "INSERT INTO dot (id, household_id, verbatim, heard_at, heard_by) VALUES ($1,$2,$3,$4,$5)",
    [randomUUID(), householdId, d.verbatim, d.heardAt, jordan.id]);
  dots += 1;
}
console.log(`dots: ${dots} added (the two July ones stay open, as written)`);

// ---------------------------------------------------------------------
// 7. The gate-latch flag: an existing standard re-weighted by a life change.
// ---------------------------------------------------------------------
const GATE = {
  subject: "Rear gate latch",
  location: "Back garden, bus-stop side",
  concern: "Owen walks to the bus stop with Mia from 1 September. The rear gate is now on the morning route, so the latch check matters more, not less.",
};
const gateExisting = await pool.query(
  "SELECT 1 FROM condition_flag WHERE household_id=$1 AND subject=$2", [householdId, GATE.subject]);
if (!gateExisting.rowCount) {
  await pool.query(
    `INSERT INTO condition_flag (id, household_id, subject, location, concern, raised_by,
       revisit_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'open')`,
    [randomUUID(), householdId, GATE.subject, GATE.location, GATE.concern, jordan.id, "2026-09-03"]);
  console.log("gate-latch flag raised");
} else {
  console.log("gate-latch flag already present");
}

// "Last year at this time" is deliberately left EMPTY. The copy explains
// it: recall lines appear once there is a year of history and Fernbrook
// has six months. A panel that honestly says it has nothing yet is more
// credible than one filled with invented recall, and inventing it here
// would be the only place in this script writing something untrue.

await pool.end();
console.log("\ndemo HOM view seeded.");
