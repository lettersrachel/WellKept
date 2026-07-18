/**
 * demo-content.ts : dress the Fernbrook demo household in realistic,
 * entirely fictional pilot data (pnpm db:demo). Idempotent updates by
 * field-name pattern. s3 stays empty (vault-pending, ADR-001 guardrail 2);
 * s2 values exist so the HM/corporate views differ visibly from the
 * client's — the payload gates keep proving they never leak.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { ilike, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { household, playbookField, dot, authUser, visitCommand } from "./tables.ts";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

type Prov = "asked" | "observed" | "verified_by_touch" | "client_written";
type Flag = "none" | "CRITICAL" | "CAUTION" | "DELIGHT";
const F = (pattern: string, value: string, flag: Flag = "none", provenance: Prov = "asked"): [string, string, Flag, Prov] =>
  [pattern, value, flag, provenance];

// The Fernbrook family: David & Lisa, kids Owen (4) and Mia (9), dog Biscuit.
const CONTENT: [string, string, Flag, Prov][] = [
  F("Household summary paragraph%", "The Fernbrook household runs on calm mornings and a full kitchen. David and Lisa both work demanding schedules; Owen (4) and Mia (9) anchor the family rhythm, and Biscuit the golden retriever supervises everything. The house rewards quiet consistency: things returned to their places, the coffee never running out, and small kindnesses noticed without being announced."),
  F("Medical alerts and devices%", "EpiPens: kitchen drawer left of the range, and in Mia's school bag. Owen's inhaler lives in the hall-closet first-aid bin. Expiration check first visit of each month.", "CRITICAL", "verified_by_touch"),
  F("Adult 1: full name%", "David Fernbrook. Goes by David — never Dave, never Mr. F."),
  F("Adult 1: contact hours%", "Texts any time, reads them at lunch and after 6. A call means it's urgent."),
  F("Adult 2: same four rows", "Lisa Fernbrook (she/her). Reachable by text 9-3 on weekdays; do not call during school pickup (2:45-3:30)."),
  F("Decision-maker map%", "Household operations: Lisa decides. Vehicles and exterior: David. Anything touching the children: both, together, never one relayed through the other."),
  F("Important-dates registry%", "Mia's birthday August 2; wedding anniversary September 14; Grandma Ruth's birthday October 3.", "none", "client_written"),
  F("Names: correct pronunciation%", "Fernbrook as written. Mia is MEE-ah. Grandma Ruth is 'Gram' to the children."),
  F("Each child: name, age, school%", "Owen, 4 — Hillside Cooperative Preschool, T/Th mornings. Mia, 9 — Maple Grove Elementary, grade 4, bus at 8:05."),
  F("Each child: what they notice%", "Owen: Rex the dinosaur lives on the LEFT pillow. Always. He checks. Mia: notices when her art on the fridge changes order; she curates it herself.", "DELIGHT", "observed"),
  F("Each child: room rules%", "Owen's room: enter freely before 3pm (nap until 3, no upstairs vacuum before then — through summer 2027 only). Mia's room: knock, always; she answers."),
  F("Child-related rules: screens%", "No screens before school. Snack drawer is self-serve after 3. Homework before any playdate; the HM never negotiates exceptions."),
  F("Each pet: species%", "Biscuit — golden retriever, 6, greets everyone like family. No fear of strangers; excessive love of delivery drivers."),
  F("Feeding: what, when%", "Biscuit: one cup at 7am, one at 5pm, from the bin in the mudroom. Treats: two max, after walks. Heartgard the 1st of the month.", "none", "verified_by_touch"),
  F("Door, gate, and room rules; escape%", "Rear gate must latch fully — Biscuit can push an unlatched gate open. Check on every exit.", "CRITICAL", "verified_by_touch"),
  F("Waste: trash%", "Trash Thursday, recycling alternate Thursdays, compost Monday. Bins out the night before, back in by evening; HOA fines after 24 hours."),
  F("Shoes-off household%", "Shoes off at the mudroom bench. HM keeps dedicated indoor shoes on the second shelf."),
  F("Mail and packages protocol%", "Packages to the mudroom bench. Nothing gets opened. Anything from a pharmacy goes straight to the entry-hall table, visible."),
  F("Returns protocol%", "Returns pile lives on the garage shelf marked RETURNS; HM initiates drop-offs on Wednesday errands. Solved 5-28: 'weirdly life-changing.'", "DELIGHT", "observed"),
  F("Regular deliveries and services%", "Groceries Tuesday (fridge items straight in). Dry cleaning Friday hooks by the mudroom. Water softener salt monthly — bags to the basement landing, HM pours."),
  F("Every regular presence%", "Rosa — housekeeper, Mondays 9-1 (her own key, her own rhythm; HM coordinates, never directs). Ben — dog walker, weekdays at noon."),
  F("Products by surface%", "No bleach on the colored grout. No Magic Eraser on painted walls. The ceramics on the study shelves: dry brush only, never moved.", "CAUTION"),
  F("The small standing orders%", "Folgers Classic Roast is David's coffee: NEVER let it run out. Reorder at half-can. Lisa's peonies when in season, one bunch, kitchen island."),
  F("School communication channels%", "Everything arrives through the Maple Grove app to Lisa's email; supply lists get printed to the kitchen corkboard."),
  F("Sizes registry per child%", "Owen: 4T, shoe 11T. Mia: girls 10, shoe 4. Updated at seasonal changeover; outgrown clothes to the donate bin in the garage."),
  F("The household year%", "Hosts Thanksgiving (25+ people). Beach house last two weeks of July. School year ends mid-June — teacher gifts are a standing item."),
  F("Vehicles: count%", "Two: the gray SUV (Lisa, school runs) and David's sedan. Detailing quarterly; the SUV always has the parking garage card in the visor."),
  F("Parking: where HM parks%", "HM parks in the driveway's left lane, never blocking the garage. Vendors at the curb, never the driveway on Mondays (Rosa)."),
  // s2 content: visible to HM/corporate, structurally absent from the client payload.
  F("Allergies: every person%", "Mia: tree nuts, SEVERE — EpiPen protocol. Owen: none known. David: penicillin. Biscuit: chicken (itching).", "CRITICAL"),
  F("Vet: practice%", "Maple Grove Animal Hospital; emergencies to Northside 24hr. Biscuit on monthly heartworm; insurance through Trupanion."),
  F("Information boundaries%", "Tooth fairy is ACTIVE for Owen. Mia knows and is a proud co-conspirator; she leaves the coins. Nothing said in front of Owen."),
  F("CADENCE REGISTRY, children%", "Well-child visits birthday-adjacent (Aug/Oct). Dental both kids in February and August. Mia vision recheck in January."),
];

const { rows: [hhRow] } = await pool.query("SELECT id FROM household LIMIT 1");
const householdId: string = hhRow.id;

let set = 0;
for (const [pattern, value, flag, provenance] of CONTENT) {
  const matches = await db.select().from(playbookField).where(ilike(playbookField.name, pattern));
  const target = matches[0];
  if (!target) { console.log(`  (no match: ${pattern})`); continue; }
  await db.update(playbookField)
    .set({ value, flag, provenance, confirmed: true, provenanceDate: new Date("2026-06-14T14:00:00Z"), updatedAt: new Date() })
    .where(eq(playbookField.id, target.id));
  set += 1;
}
console.log(`demo content: ${set}/${CONTENT.length} fields filled`);

// Dots: verbatim, dated, never client-visible.
const [jordan] = await db.select().from(authUser).where(eq(authUser.email, "jordan@wellkept.demo"));
if (jordan) {
  const DOTS = [
    { verbatim: "Lisa mentioned her sister visits in August.", heardAt: new Date("2026-07-02T15:20:00Z") },
    { verbatim: "David asked where the beach chairs went. Check the garage loft.", heardAt: new Date("2026-07-09T14:05:00Z") },
  ];
  for (const d of DOTS) {
    const existing = await pool.query("SELECT 1 FROM dot WHERE verbatim = $1", [d.verbatim]);
    if (existing.rowCount) continue;
    await db.insert(dot).values({ id: randomUUID(), householdId, verbatim: d.verbatim, heardAt: d.heardAt, heardBy: jordan.id });
  }
  console.log("dots seeded");
}

// A prior visit report (yesterday, so a fresh demo submit today never conflicts).
const visitId = "01980000-0000-7000-8000-00000000de10";
const existing = await db.select().from(visitCommand).where(eq(visitCommand.id, visitId));
if (!existing.length) {
  await db.insert(visitCommand).values({
    id: visitId,
    type: "visit.submit",
    householdId,
    status: "applied",
    reason: null,
    payload: {
      householdId,
      startedAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
      photoIds: ["kitchen-after.jpg", "linens.jpg", "biscuit-walk.jpg", "mudroom.jpg"],
      report: [
        "Kitchen reset, linens rotated, and Biscuit walked, fed, and thoroughly complimented.",
        "The kettle tripped the kitchen GFCI again; reset at the panel and everything checks out, but it is on the watch list now.",
        "Coffee is stocked, the peonies are fresh on the island, and Thursday is set.",
      ],
    },
  });
  console.log("prior visit report seeded");
}

// Neutral status tag for a fresh demo.
await db.update(household).set({ statusTag: "STEADY", updatedAt: new Date() }).where(eq(household.id, householdId));
console.log("status tag -> STEADY");
await pool.end();
