/**
 * demo-playbook-fill.ts : bring Fernbrook's playbook up to a density that
 * reads as a served household (pnpm db:playbook-fill). Runs after
 * db:demo, which creates the household and its template fields.
 *
 * WHY. 33 of 258 fields carrying a value means 225 rows reading "Not yet
 * captured", and no copy recovers that: a reader concludes the record is
 * empty rather than that the demo is partial.
 *
 * WHAT STAYS BLANK, AND WHY IT IS A LIST RATHER THAN A REMAINDER. The
 * unfilled rows are meant to be explainable at a glance:
 *
 *   1. EVERY s3 ROW. ADR-001 guardrail 2: no real secured value enters the
 *      app before the vault hardening. Seven rows, blank on purpose, and
 *      the one place where blank is a POLICY rather than a gap.
 *   2. NOT APPLICABLE TO THIS HOUSEHOLD. Foster and kinship placement, a
 *      custody schedule, horses, birds, a pool, a second home, condo
 *      front-desk logistics, a day-sleeper room, expat and political
 *      postings. Fernbrook is a married couple with two children, a dog
 *      and one house.
 *   3. WHERE "NOT APPLICABLE" AND "NOT ASKED" LOOK IDENTICAL. A blank
 *      here is honest in a way a written "n/a" would not be, because the
 *      record cannot tell the two apart either.
 *
 * Fernbrook is resolved by PINNED ID (G-95). Fields are matched by NAME
 * PREFIX and every pattern must match EXACTLY ONE row: zero means the
 * template moved, more than one means the pattern is ambiguous, and both
 * REFUSE rather than writing to a guess. Several template names are near
 * duplicates ("Parking: where HM parks" and "PARKING: where the HM
 * parks"), which is precisely why the count is asserted.
 *
 * Idempotent: values are set, not appended, so a re-run restores the same
 * state.
 */
import pg from "pg";
import { FERNBROOK_DEMO_ID } from "../../../tooling/fixture-ids.mjs";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});

type Flag = "none" | "CRITICAL" | "CAUTION" | "DELIGHT";
type Prov = "asked" | "observed" | "verified_by_touch" | "client_written";
const F = (pattern: string, value: string, flag: Flag = "none", provenance: Prov = "asked"): [string, string, Flag, Prov] =>
  [pattern, value, flag, provenance];

// Voice note: extends the 32 rows db:demo already wrote. David and Lisa,
// Owen (5, starting kindergarten), Mia (9), Biscuit the golden retriever,
// Rosa on Mondays, Ben at noon. Plain sentences, no em dashes.
const FILL: [string, string, Flag, Prov][] = [
  // ---- 1. Safety and legal flags -------------------------------------
  F("Gift-flagging protocol", "Nothing in this category so far. If a gift arrives that is unusual in value or comes from outside the family's known circle, Jordan photographs it, leaves it unopened on the entry table, and tells Lisa the same day."),
  F("Medications and controlled substances", "Nothing controlled in the house. Everyday medicine lives in the hall-closet first-aid bin, above child height. Mia's EpiPens are the exception and are deliberately reachable.", "CAUTION"),
  F("Security or legal flags", "None. No NDA, no custody arrangement, no restraining order, no do-not-admit list. Asked directly at intake and re-asked at the six-month review."),

  // ---- 2. Adults and contact ----------------------------------------
  F("Adult 1: mobile, email", "David: mobile is real and read at lunch and after 6. Email is work and goes unread for days. For anything same-day, text."),
  F("Contact priority order", "Lisa first for anything about the house or the children. David for vehicles, exterior and anything with a contract. Neither is to be told something the other has not heard."),
  F("Emergency contacts beyond residents", "Gram Ruth (Lisa's mother), twelve minutes away, has a key and will come for the children. Marisol next door for the dog. Both know they are on this list."),
  F("Employer / role fields", "David: regional sales, quarter-end weeks in March, June, September and December run late. Lisa: hospital administration, weekday hours, occasional evening board meetings."),
  F("Formal or official forms of address", "None. First names throughout, on cards and correspondence alike."),
  F("Household mailing list", "Lisa keeps it in her own contacts and exports a card list each November. Well Kept has never held a copy and has not asked to."),
  F("Language(s) spoken at home", "English at home. Lisa took Spanish through college and uses it with Rosa; Rosa prefers Spanish for anything detailed."),
  F("Occupation-driven scheduling", "Nothing unpredictable. Both work regular hours. The only pattern worth planning around is David's quarter-end weeks."),
  F("Open ask, verbatim", "Lisa, at intake: \"We are not fussy people. We just want the mornings to work and the kids to feel like nothing is out of place.\"", "none", "client_written"),
  F("Other adults in residence", "None. Two adults, two children, one dog."),

  // ---- 3. Children ---------------------------------------------------
  F("Discipline / redirection method", "Redirect and offer a choice; the parents do not want raised voices and Jordan does not discipline. The firm boundary: never send a child to their room, that is a parent's call only.", "CAUTION"),
  F("House rules the HM must never undermine", "Screens off before school and until homework is done. Beds are the children's own job and stay their job even when they do them badly. Owen clears his plate; Mia loads it."),

  // ---- 4. Pets --------------------------------------------------------
  F("CADENCE REGISTRY, pets", "Biscuit: annual vet in May, rabies due May 2027, county license renews in January. Heartgard on the 1st, thirty in the tin at last count. Groomer every ten weeks."),
  F("HM ASSIGNMENT MATCH", "No restriction. Jordan is comfortable with dogs and Biscuit is uncomplicated. Recorded so a covering HOM can be matched honestly."),
  F("Walker/sitter arrangements and access", "Ben walks weekdays at noon, comes through the side gate with his own code, and texts Lisa a photo. Overnight cover goes to Gram Ruth, never a boarding kennel."),

  // ---- 5. The household map ------------------------------------------
  F("Each: coordination route", "Rosa: through Lisa, never directed by Jordan. Ben: direct, he prefers it. The lawn service: through David. The window company: Jordan books it and tells David after."),
  F("Each: scope, and the boundary with HM scope", "Rosa cleans; Jordan does not clean behind her and does not re-do her work. Ben walks; Jordan feeds. The overlap is the mudroom floor on Mondays, and Rosa owns it."),
  F("REGULAR VISITOR ROSTER", "Mia's friends Priya and Elle, both after school on Tuesdays. Priya has no allergies; Elle's mother confirmed none. Owen has no regular visitors yet.", "CAUTION"),

  // ---- 6. Property and neighbourhood ---------------------------------
  F("Exterior zones", "Garden shed at the rear fence, unlocked. The play structure is Owen's and gets a look each visit for loose bolts. No pool, no hot tub."),
  F("Generator / backup power", "None. The house rides out outages on flashlights and a cooler; see the outage note in section 9."),
  F("HOA / CIVIC ASSOCIATION working detail", "Bins out the night before, in within 24 hours or the fine letter arrives. Holiday decorations down by 15 January. Contractor hours 8 to 6 on weekdays, none on Sundays."),
  F("HOA / neighborhood context", "Fernbrook Ridge Association. Quiet hours after 9. Street parking is fine except on sweeping days. The association is reasonable and enforces the bins strictly and nothing else."),
  F("NEIGHBOR RELATIONS MAP", "Marisol on the left is the friendly one and holds a key. The Alders on the right are private and prefer not to be greeted at the fence. No disputes."),
  F("NEIGHBORHOOD TEXTURE", "Bus stop is at the corner of Fernbrook and Ridge, 8:05 out and 3:20 back. Packages sit safely; nothing has gone missing. Leaf collection the first two weeks of November."),
  F("PARKING: where the HM parks", "Left lane of the driveway, never blocking the garage. Vendors at the curb, and never on the driveway on Mondays while Rosa is here. Guest passes live in the kitchen drawer."),
  F("Property: type, size, floors", "Two-storey colonial, four bedrooms, finished basement, attached two-car garage. Built 1998. Photo set on file from the March walkthrough."),
  F("Shed or other detached structure", "Garden shed: mower, hand tools, a half bag of lawn fertiliser and the spare hose. The fertiliser is the only item here that belongs in the section 9 chemical note."),

  // ---- 7. Access and keys --------------------------------------------
  F("Alarm: system, modes", "SimpliSafe. Disarm code in the app's secure field. Home mode at night, away mode when the house is empty. The basement door sensor drifts and reads open in cold weather; it is not a fault.", "none", "verified_by_touch"),
  F("Door-answering policy", "Jordan answers for expected vendors only. Anyone unexpected is left at the door and Lisa is texted. Deliveries are never signed for."),
  F("Every entry: method, hardware", "Front door: keypad, code in the app. Mudroom door from the garage: this is the real hands-full entry and the one Jordan uses. Rear slider: interior latch only, never an entry point.", "none", "verified_by_touch"),
  F("Garage and gate: openers", "Garage keypad on the left jamb, code in the app. Interior door to the mudroom is alarmed in away mode and has a thirty-second delay. Rear gate latch is the CRITICAL row in section 3.", "none", "verified_by_touch"),
  F("Keys: every key that exists", "Four keys exist. David, Lisa, Rosa, and Gram Ruth. Jordan uses the keypad and holds no key. Logged at intake under WK-SOP-015 and re-counted in July."),

  // ---- 8. Cameras and privacy ----------------------------------------
  F("Cameras: every location", "Doorbell camera at the front, always recording. One camera over the driveway. Nothing indoors, and the family has said plainly they do not want indoor cameras.", "CAUTION"),
  F("No-photo zones and topics", "Media release declined. No photograph of either child leaves the household record, and none is used anywhere. Visit photos are rooms and objects only.", "CRITICAL"),
  F("Rooms or subjects the client marks private", "David's study desk surface: dust around it, never move or square the papers. The bedroom closet is not part of any visit.", "CAUTION"),

  // ---- 9. Utilities and emergencies ----------------------------------
  F("Backup communication if cell service", "No landline. Marisol next door is the fallback and has both mobiles. Gram Ruth is the second call."),
  F("Disaster-preparedness plan", "Kit in the basement stairwell: water, torch, radio, batteries. Meeting point is Gram Ruth's. Biscuit's carrier and a three-day bag of food sit beside the kit. Reviewed each September."),
  F("Electrical panel: location, labeled", "Basement, north wall beside the stairs. Labelled and accurate, which is unusual and worth saying. The garage freezer shares a circuit with the workbench outlets and trips if both run.", "none", "verified_by_touch"),
  F("Evacuation notes and utility emergency", "Out the front, or the mudroom door if the front is blocked. Gas: Washington Gas emergency line. Water: county 24-hour line. Both numbers are on the inside of the basement door."),
  F("Extinguishers, smoke/CO detectors", "Extinguisher under the kitchen sink and one in the garage, both inspected March 2026. Smoke and CO units on all three floors, batteries changed each October with the clocks.", "none", "verified_by_touch"),
  F("First aid and medical devices", "Hall-closet bin: plasters, antiseptic, Owen's inhaler and a spare spacer. EpiPens are NOT here; they are the kitchen drawer and Mia's bag, per the section 1 CRITICAL row.", "CRITICAL", "verified_by_touch"),
  F("Food safety during an extended outage", "Fridge holds about four hours closed, the freezer about a day. The garage freezer holds the bulk meat and is the one to save. Bagged ice from the Ridge Road station."),
  F("Gas shutoff and smell-gas protocol", "Meter is on the east wall outside, quarter-turn valve, wrench hanging beside it. If gas is smelled: everyone out first, call from outside, never a light switch.", "CRITICAL", "verified_by_touch"),
  F("Hazardous chemical storage", "Garden shed: half a bag of lawn fertiliser. Garage: paint, thinner and a propane tank for the grill, on the shelf above child height. No pool chemicals and no pesticide."),
  F("Main water shutoff: location", "Basement, where the line enters the front wall, red gate valve. Stiff and takes two hands. Secondary shutoff at the street under the round cover by the mailbox.", "none", "verified_by_touch"),
  F("Sump pump: present?", "Present, in the basement southeast corner. NO battery backup, confirmed absent, and worth raising before spring: the basement is finished and an outage during a storm is the exact case it would fail in.", "CAUTION", "verified_by_touch"),

  // ---- 10. Systems and digital ---------------------------------------
  F("Account access boundaries", "Jordan may order through the household Amazon account and the Maple Grove grocery account, standing limit sixty dollars per order without asking. Nothing else, and never a card number typed anywhere."),
  F("Electrical quirks", "The outlet left of the kitchen window trips when the kettle and toaster run together. The switch at the top of the basement stairs does nothing anyone has identified."),
  F("HVAC: zones, thermostats", "Two zones, upstairs and down. Nest on both, 68 winter and 74 summer, and the family does not want them adjusted. Filters are 20x25x1 upstairs and 16x20x1 down, changed every six months."),
  F("Household digital stack", "Shared Google calendar for the family. Lisa keeps the lists in Apple Notes and shares the grocery one with Jordan. The Maple Grove school app goes to Lisa only."),
  F("Internet: provider, router location", "Verizon Fios, router in the basement utility cupboard. The restart ritual is unplug, count to thirty, plug back, and wait two minutes before testing. Network names in the app."),
  F("STORED VALUE REGISTRY", "Two EZ-Pass transponders, one per vehicle, autoloading from David's card. A standing Maple Grove lunch balance for Mia that Lisa tops up each term. No gift cards held."),
  F("Smart home: platform, devices", "Nest thermostats and the doorbell, on David's account. Two smart plugs on the lamps. Jordan uses the lamps and nothing else; the thermostats are not to be touched.", "CAUTION"),
  F("Subscriptions and memberships inventory", "Costco, renews February. Amazon Prime, renews June. Two streaming services. A meal kit that has been paused since May and that Lisa keeps meaning to cancel."),
  F("Water heater: type, location", "Gas tank unit in the basement utility room, installed June 2019. Anode checked July 2023 and due again on a three-year cycle. The pilot has never gone out."),

  // ---- 11. Equipment and inventory -----------------------------------
  F("Basic tool inventory", "Six-foot ladder and a taller one in the garage rafters. Drill and a decent hand-tool set on the workbench. Everything works; nothing here is precious."),
  F("Equipment used in service", "Client-owned Miele upright, bags are type GN. Spray mop with washable pads, four in rotation. Jordan brings nothing of their own except cloths."),
  F("Filters registry", "HVAC 20x25x1 upstairs and 16x20x1 down, six-monthly. Fridge water filter every six months, last done April. Vacuum bag GN, box of six on the laundry shelf. Range hood filters wash in the dishwasher."),
  F("High-value items registry", "The ceramics on the study shelves, which are Lisa's grandmother's and are dry-brush only. Two framed prints in the dining room. Nothing is separately insured or catalogued.", "CAUTION"),
  F("Kitchen appliances: each nameplate", "Bosch dishwasher, Samsung fridge, a gas range that runs hot by about fifteen degrees, and a stand mixer that lives out on the counter because it earns its place. Nameplates photographed March 2026."),
  F("LIFECYCLE DATES", "Water heater 2019. Roof 2016, architectural shingle. HVAC 2014 and the older of the two systems. Washer and dryer 2021. Smoke units 2022. Nameplate photographs on file."),
  F("Laundry: washer/dryer models", "LG front loader and matching dryer, 2021. Normal cycle with an extra rinse is what works; the sanitise cycle takes two hours and nobody uses it. Lint trap every load, no exceptions."),
  F("Manuals: where they live", "Kitchen drawer beside the fridge for the appliances that came with paper. Everything else Jordan photographs the nameplate and looks up as needed."),
  F("Service history and warranties", "HVAC on an annual contract with Ridgeline Heating, spring visit. Roof under a ten-year workmanship warranty to 2026, which is worth noting because it expires this year. Appliances all out of warranty."),
  F("Specialty appliances and gadgets", "Water softener in the basement, salt monthly and Jordan pours it. Ice maker in the fridge door that needs the filter changed or it tastes of the cupboard. No wine fridge, no espresso machine."),

  // ---- 12. Food and provisioning -------------------------------------
  F("Auxiliary freezer or bulk food", "Chest freezer in the garage: bulk chicken and beef from Costco, a bag of Owen's waffles, and Lisa's soup stock in labelled quart tubs. First in first out; Jordan rotates it monthly."),
  F("Delivery and meal services in use", "Maple Grove grocery delivery on Tuesdays, fridge items straight in. The meal kit is paused. Takeaway on Fridays and it is not something to plan around."),
  F("Dietary: allergies", "Mia: tree nuts, severe, and nothing containing them enters the house. Owen: none. David: penicillin, which is medical rather than dietary. Lisa avoids shellfish by choice.", "CRITICAL"),
  F("Meal rhythms: who cooks", "Lisa cooks weeknights, David at weekends. Jordan preps: vegetables washed and cut, the slow cooker loaded when it is asked for. Jordan does not cook a family meal and has not been asked to."),
  F("Pantry and fridge logic", "Pantry by zone: baking left, tins centre, children's snacks on the low shelf where Owen can reach. Leftovers in glass, dated, and anything past four days goes without asking."),
  F("Preferred retailers by category", "Children's clothes: Target and Old Navy. Home goods: Costco. Pharmacy: the Ridge Road CVS. Hardware: the independent on Fernbrook, not the big box, and David is particular about that."),
  F("Staples list", "Non-negotiable brands: Folgers Classic Roast, Tide Free and Clear, Cascade pods, Charmin. Flexible on everything else. Reorder coffee at half a can, which is the standing order in section 12."),

  // ---- 13. Materials and care ----------------------------------------
  F("Cultural cookware on the never-soap list", "The cast iron skillet and the carbon steel wok: hot water, brush, dried on the flame. Lisa will notice immediately if either is washed with soap.", "CAUTION"),
  F("Scent policy: loved, tolerated, banned", "Loved: the peonies in season, and clean laundry with nothing added. Tolerated: mild citrus. Banned: plug-in air fresheners and anything labelled fresh linen. Lisa gets headaches from them.", "CAUTION"),
  F("The do-not-use list AND WHY", "No bleach on the coloured grout, it has already lightened once. No Magic Eraser on painted walls, it burnishes. No polish on the study ceramics, dry brush only and never moved.", "CAUTION"),

  // ---- 14. Laundry ---------------------------------------------------
  F("Laundry scope: whose clothes are IN", "In: household linens, towels, and the children's everyday clothes. NEVER: anything of David's or Lisa's. That boundary was set at intake and has not moved.", "CAUTION"),
  F("Linen rotation: sets per bed", "Two sets per bed, changed weekly on the Thursday visit. Spares on the upstairs hall shelf, folded by bed size with the fitted sheet inside the pillowcase."),
  F("Products, temperatures, air-dry list", "Tide Free and Clear, warm for towels, cold for everything else. Air dry: Mia's leggings and anything with a print. Towels folded in thirds, the children's clothes folded flat rather than rolled."),
  F("Special care: the items that have a story", "The quilt on Mia's bed was Gram Ruth's mother's. It is washed once a year, cold, by Lisa, and never by anyone else. Owen's dinosaur Rex is spot cleaned only and never goes in a machine.", "CAUTION"),

  // ---- 15. Organisation ----------------------------------------------
  F("Container and label system in place", "Clear bins with printed labels in the basement and garage, put in during the March onboarding. The children's zones use picture labels so Owen can read them."),
  F("Donation/discard authority", "Nothing is discarded without written approval. The donate bin in the garage is a staging area, not a decision; Lisa clears it herself every few weeks.", "CAUTION"),
  F("GEAR ZONES", "Golf bag and the cooler in the garage on the left wall. Mia's art supplies in the dining room sideboard. Owen's outdoor toys in the deck box. The tailgate rig is David's and lives untouched."),
  F("Homeless-item protocol", "Anything without a home goes in the basket on the basement stairs, and Lisa sorts it at the weekend. Nothing in that basket is ever thrown away."),
  F("The home's logic: what lives where", "Ground floor is shared and stays clear. Upstairs is private. The basement is the children's and holds what does not need to be seen. The garage is David's and is organised to his logic, not to anyone else's."),

  // ---- 16. Rooms ------------------------------------------------------
  F("CONDITION BASELINE", "Photographed at onboarding in March: the scuff on the stair wall, the ring on the study windowsill, the cracked tile at the mudroom threshold, and the fading on the south-facing curtains. All pre-existing."),
  F("EVERY room, one row each", "Ten rooms on file, each with owner, standard and quirks. Off-limits: the bedroom closet, and David's desk surface. Everything else is in scope on a normal visit."),
  F("Garage / basement / attic / closets", "Garage and basement are in scope and get a look each visit. The attic is unfinished, accessed by a pull-down ladder, and is not entered. Coat and linen closets in scope; the bedroom closet is not."),
  F("ROOMS-SERVE-PURSUITS MAP", "The study is David's, and it is where he reads rather than works. The dining room table is Mia's art surface more often than a dining table. The basement is where the children actually live."),
  F("SENSORY ARRIVAL STANDARD", "What Lisa wants on walking in: the kitchen island clear, the entry lamp on, no smell of anything, and the sound of nothing running. She has said the last one twice.", "DELIGHT"),

  // ---- 17. The visit ---------------------------------------------------
  F("(Built from all sections) Visit sequence draft", "Arrive through the mudroom, disarm, greet Biscuit and let him out. Kitchen and island first, then the ground floor, then laundry, then the children's rooms. Sentinel sweep last, lamp on, gate checked, out by 2."),
  F("SENTINEL SWEEP", "Every visit, in the final walk: under both sinks and the toilet bases for damp, the basement corner by the sump, the mudroom threshold tile, and the rear gate latch. Four minutes and it has caught two things so far."),
  F("THE ENGINEERED HOMECOMING", "Island clear and wiped, entry lamp on, the day's post squared on the hall table, Biscuit fed and settled, and the coffee tin visibly full. That set is what Lisa reads as the house being handled.", "DELIGHT"),

  // ---- 18. Signals and observations ------------------------------------
  F("Consumption reality", "Coffee runs out faster than the list predicts, roughly every ten days rather than two weeks. Kitchen roll and Owen's waffles likewise. The staples list understates all three."),
  F("Corrections observed", "The fruit bowl gets moved back to the island end after every visit, so it lives there now. Mia re-orders her own art on the fridge and it is not to be tidied.", "none", "observed"),
  F("DOT LOG: things heard in passing", "Open dots are recorded on the drill-in rather than here. Four are open, and the coffee reorder came out of one of them.", "none", "observed"),
  F("Every \"oh, that is just how we do it\" logged verbatim", "Lisa, 4 April: \"We do not do shoes past the bench, ever, and I will not say it twice.\" David, 19 May: \"The garage is the one place I would rather nobody organised.\"", "none", "observed"),
  F("Friction points", "Backpacks land at the bottom of the stairs and stay there. The bins are a weekly negotiation neither adult wants. The recycling drifts and nobody has named it as a problem.", "none", "observed"),
  F("HOBBY-CARE REGISTRY", "Six houseplants on the kitchen sill, watered Thursdays, and the fiddle leaf by the stairs which is watered every other week and sulks if it is overdone. Tomatoes in the raised bed from May."),
  F("LOAD SIGNALS", "Arrival state has been steadier since April. Takeaway containers appear on quarter-end weeks, which lines up with David's calendar rather than with anything wrong.", "none", "observed"),
  F("Rhythm map", "Mondays Rosa, Tuesdays groceries and Mia's friends, Thursdays the visit and the bins, Fridays takeaway and dry cleaning. The year turns on the school calendar, Thanksgiving, and two weeks at the beach in July."),

  // ---- 19. The year --------------------------------------------------
  F("AWAY-MODE PROTOCOL", "Thermostats to 62 winter or 78 summer, water main left on, two lamps on timers, post held at the office, and Marisol told. Biscuit goes to Gram Ruth. Jordan keeps the normal Thursday visit."),
  F("COMMITMENTS LEDGER", "Thanksgiving hosting, 26 November, 25 people, said yes in September as they do every year. Mia's class presentation 18 September. The Ridge Association potluck in October, declined last year and likely again."),
  F("Catalog booking windows", "Autumn opens 1 September and the family has never used it. January resets are the more likely moment, because Lisa does her thinking about the house in the first week of the year."),
  F("DECISION HORIZON REGISTRY", "Whether Owen stays at Maple Grove or moves to the language immersion programme for first grade. Being discussed, not decided, and not to be raised by Jordan.", "CAUTION"),
  F("EVENT CALENDAR LAYER", "Maple Grove term dates are on the shared calendar. Mia's swim season runs January to March. Nothing here has a presale or an on-sale date."),
  F("Emergency kit's seasonal layer", "Winter: the car kit goes in the SUV in November, blanket, torch, and a shovel. Summer: the cooler and water move to the garage shelf. Swapped at the clock changes with the smoke alarm batteries."),
  F("FREQUENT-TRAVELER PACK", "Not a rhythm for this household. David travels perhaps four times a year and packs himself; there is no go-bag and none is wanted."),
  F("Maintenance calendar", "HVAC service each spring with Ridgeline. Gutters twice, October and April. Filters every six months. Irrigation blown out in November. Chimney has not been swept since before the family moved in, which is worth raising."),
  F("Movable-date observances", "None kept. The family's year is the school calendar and Thanksgiving."),
  F("Occupational stress calendar", "David's quarter ends: March, June, September, December, and the last week of each is the hard one. Lisa's budget season is October and November, which overlaps Thanksgiving and is the pinch point of the year."),
  F("PET MILESTONE DATES", "Biscuit's adoption day is 3 June and the children mark it. Lisa mentioned it once in passing and it went in the record rather than the diary, which is where it should be."),
  F("School-closure and snow-day protocol", "Yes, the household wants the message the moment it lands rather than at the next visit. Lisa has said a snow day changes her whole day and she would rather know at 6am than 8."),
  F("Seasonal add-on windows", "Holiday decorating in the first week of December, which the family did themselves last year and found harder than expected. Seasonal wardrobe swap in April and September."),
  F("Seasonal gear rotation", "Rain gear and boots in the mudroom cubbies year round. Umbrellas by the front door. The humidifier comes up from the basement in November and goes back in March; the dehumidifier is the reverse."),

  // ---- 20. Vendors ----------------------------------------------------
  F("Every vendor, one row each", "Rosa, housekeeping, Mondays 9 to 1. Ben, dog walking, weekdays at noon. Ridgeline Heating, HVAC, annual spring. Fernbrook Lawn, fortnightly April to October. Maple Grove Animal Hospital for Biscuit."),
  F("Payment handling per vendor", "Rosa and Ben are paid directly by Lisa. Ridgeline and the lawn service invoice David. Jordan authorises nothing and pays nobody; anything new goes to David first."),
  F("Quality notes", "Ridgeline are trusted and David will wait for them. The lawn service is tolerated and would be replaced if a better option appeared. The plumber from the 2024 leak was not good and is not to be called again.", "CAUTION"),
  F("Vendor access arrangement", "Rosa has her own key, verified. Ben has the side gate code, verified. Ridgeline are let in by David, who takes the morning. Nobody else gets in without a household adult present.", "none", "verified_by_touch"),

  // ---- 21. Occasions and people ----------------------------------------
  F("EVENT RUN-OF-SHOW", "Thanksgiving is the one that exists: 25 people, tables from the basement, the good linens washed the week before, Gram Ruth arrives the Tuesday. Built out in October each year."),
  F("GAME-DAY / SHOW-NIGHT RITUALS", "Not a sports household. Friday takeaway and a film is the closest thing to a ritual of this kind, and it is Owen's turn to pick every other week."),
  F("Gift & flower customs", "No colours or objects to avoid. Peonies are the one flower Lisa loves. Nothing lily, because of the dog rather than taste."),
  F("Gift-giving norms", "Teacher gifts at the end of the school year, modest and the same for each. Gram Ruth gets something considered. Wrapping is plain brown paper and string, which is Lisa's preference and consistent every year."),
  F("Guest room standard and turnaround", "The basement room. Bed made with the second linen set, towels on the end, the small lamp on, and the door left open. Turned around the day before rather than the morning of."),
  F("Hosting style: frequency, scale", "Twice a year properly, at Thanksgiving and once in the summer. Guest-ready for this family means the island clear, the guest bathroom stocked, and the basement tidy. Not formal."),
  F("OUTER-CIRCLE REGISTRY", "Gram Ruth, twelve minutes away, in the house most weeks. David's brother in Seattle, seen once a year. Marisol next door. Priya and Elle's parents, who are the school circle."),
  F("Observance calendar", "Thanksgiving, Christmas at home, birthdays, and the anniversary. Not a religious household and nothing here is observed for form's sake."),
  F("PERSON REGISTRY", "Eleven people on file across family, neighbours and the school circle, each with how they connect to the household and whether they hold access. Gram Ruth is the only one outside the family with a key."),
  F("POST-EVENT CHECKLIST", "After Thanksgiving: tables back to the basement, the good linens laundered and put away rather than left, chairs returned to Marisol, and the leftovers divided before anyone leaves."),
  F("Personal touches inventory", "The coffee never running out. Peonies in season on the island. Mia's art left exactly as she ordered it. Rex on the left pillow. Small, and the four things this household actually notices.", "DELIGHT"),
  F("Reciprocity log", "Marisol brought soup when Owen was ill in February. The Alders left a card at Christmas. Both noted so a thank-you is not missed and not repeated."),
  F("Recurring-guests registry", "Gram Ruth, in the basement room, and she likes the small lamp on and the extra blanket. David's brother once a year, same room, no preferences expressed."),
  F("SIGNATURE RITUAL", "The coffee tin visibly full and the entry lamp on. Never skipped, not even on the shortest visit, and it is the thing Lisa has named twice without being asked.", "DELIGHT"),
  F("TRADITIONS REGISTRY", "The birthday person picks dinner. Christmas morning is pyjamas until noon. The first day of school gets a photograph on the front step, same spot every year."),
  F("The household aesthetic, in words", "Warm and uncluttered. Wood, cream, and nothing that looks staged. Lisa would rather a room felt lived in than looked finished, and she has said the word cosy more than once."),

  // ---- 22. Working agreement ------------------------------------------
  F("DELEGATION LADDER", "Vendors: Jordan schedules, David approves anything new. Children's logistics: Lisa only. Gestures: Jordan decides within the micro-budget. Purchasing: Jordan up to sixty dollars, Lisa above."),
  F("Escalation thresholds: call now vs note", "Call now: water, gas, smoke, anything about a child, anyone at the door who should not be. Note in the report: everything else, including things that look urgent and are not.", "CAUTION"),
  F("Expense & receipt mechanic", "Company card only. Jordan never uses personal money, which is a rule for Jordan's protection as much as the client's. Receipt photographed at the point of sale, before leaving the shop."),
  F("Expense mechanics: company payment method", "Same rule stated on the operations side: company payment method, receipt at point of purchase, nothing reimbursed that was paid personally. Recorded twice in the template deliberately and answered consistently."),
  F("Gesture micro-budget", "Twenty-five dollars a month, standing, unprompted. Peonies most months. Unused months do not roll forward, and nobody is asked to justify a gesture inside the limit."),
  F("Guest-and-visitor policy", "No. Jordan works alone in the house and brings nobody, including for a moment at the door. Set at intake and not negotiable."),
  F("In-scope for THIS home", "Kitchen and island reset, ground floor, laundry as scoped, children's rooms, bins, groceries put away, the sentinel sweep, and the standing orders. That is the concrete list."),
  F("Out-of-scope and the never-do list", "No cleaning behind Rosa. No adult laundry. No discipline. No moving the study ceramics. No discarding anything. No cooking a family meal. No indoor cameras and no photographs of the children.", "CAUTION"),
  F("Proposal format preference", "Lisa reads a short paragraph and a recommendation. She does not read options laid out three ways, and has said so. Situation, what Jordan suggests, what it costs, one line each."),
  F("REQUEST TRIAGE LADDER", "Emergency: anything in the call-now list. Urgent same day: a vendor no-show, a delivery that must be signed. Routine: the rest, which goes in the report. Anticipated: what the record already knew was coming."),
  F("Report format this client actually reads", "Three sentences and the photographs. Lisa reads it on her phone between meetings. Anything longer gets skimmed, which she has said herself without embarrassment."),
  F("Response-time expectations", "Jordan to the household: same day, and within the hour on a call-now item. Household to Jordan: Lisa within a few hours on weekdays, David by evening. Nobody expects a weekend reply."),
  F("Spending authority", "Sixty dollars per order without asking, on the household accounts. Above that Lisa approves. Emergency authorisation to two hundred and fifty for anything preventing damage, David told the same day."),
  F("The quarterly review conversation", "Thirty minutes with Lisa, scheduled in the first week of the quarter. David joins the one in January. Held three times so far: March, June and September."),
  F("Tier and weekly rhythm", "Concierge tier, one visit a week on Thursdays, membership from 15 March 2026. Rate and terms on the commercial record rather than here."),
  F("Tier entitlements", "Weekly visit, the standing orders, the quarterly household audit, seasonal add-on windows, and the gesture micro-budget. The audit is the entitlement the family has used least and Jordan should raise it."),

  // ---- 23. Horizon -----------------------------------------------------
  F("Add-ons LIKELY by rhythm", "Holiday decorating in December, which they struggled with last year. Back-to-school in August. Thanksgiving prep in November. The summer swap in April. Four predictable moments, none yet offered."),
  F("Add-ons this household has USED", "None so far. Six months in, the family has taken the weekly visit and nothing beyond it, which is itself the finding rather than a gap in the record."),
  F("Existing household service spend map", "Housekeeping weekly, dog walking daily, lawn fortnightly in season, HVAC annually. The raw figures sit on the commercial record; what matters here is that four vendors already come and none of them coordinate."),
  F("HORIZON LIST", "Owen starting kindergarten, September 2026, now current. The first-grade programme decision, spring 2027. The roof workmanship warranty expiring in 2026. Gram Ruth is 74 and independent, and that is a horizon rather than a plan."),
  F("Horizon item 1:", "Owen starts kindergarten, September 2026. Changes the morning rhythm, the school app, and the bus. Raised in August and now live."),
  F("Horizon item 2:", "Roof workmanship warranty expires in 2026. Worth an inspection while a claim is still possible. Raise in the September or October visit, not later."),
  F("Horizon item 3:", "Language immersion decision for first grade, spring 2027. Not to be raised by Jordan; recorded so that if the family opens it, the record already knows."),
  F("Last season's add-on choices", "None taken. The family did the holiday decorating themselves in December and Lisa mentioned in January that it had taken a whole weekend. That remark is the opening for the October recommendation."),
  F("Life-stage coordination notes", "Nothing current. No disability or chronic-illness logistics in the household. Gram Ruth's independence is the only life-stage item and it is watched rather than managed."),
  F("Partner coordination consent and fee transparency", "Not yet discussed. No partner service has been proposed, so there is nothing the client has agreed to and nothing to disclose. This row is blank because the conversation has not happened, not because it was skipped."),
  F("Partner routing rules", "Not yet applicable. When a partner service is first proposed, the routing goes through the Operations Coordinator and the fee position is stated to the client before anything is booked."),
  F("Partner-service categories relevant", "Now: none. One to two years: holiday decorating and possibly a window company. Later: nothing identified. The household already holds four vendor relationships and does not want a fifth casually."),
  F("Per-household proposal protocol", "Offer directly: the seasonal add-ons and the audit. Route to the Coordinator: anything involving a new vendor in the home. Lisa is the one who decides, and one proposal at a time."),
  F("Proposal framing that lands with THIS client", "The I-noticed register works with Lisa. The decorating remark in January is the model: name the thing she said, offer the specific help, one line on cost. Nothing that reads as an upsell."),
  F("Retirement horizon", "Neither adult is near retirement. David has mentioned wanting fewer quarter-ends eventually, which is a feeling rather than a date and is recorded as such."),
  // ---- The thirteen that are answerable rather than not applicable ----
  // Everything still blank after these is blank for one of the three
  // reasons in the header, and a reader can tell which at a glance.
  F("DO-NOT-ADMIT REGISTER", "Empty, and asked directly rather than assumed. No estranged person, no former staff, nobody under an order. Re-asked at the six-month review and still empty."),
  F("Crawl space, where present", "None. The house sits on a full finished basement, so there is no crawl space and no entry question to answer."),
  F("EV charger, home battery, or solar", "None of the three. Two petrol vehicles and no panels. David has mentioned solar twice in passing, which is a horizon rather than a plan."),
  F("Sacred objects & spaces protocol", "None. Not a religious household and nothing in the house is treated as sacred. The study ceramics are the only objects handled differently, and that is sentiment rather than observance."),
  F("Workshop or power-equipment safety boundary", "David's workbench in the garage: a drill, a sander and a circular saw on the shelf above. Jordan does not use any of it and does not tidy that bench. No kiln, no welding, no soldering.", "CAUTION"),
  F("Household goods provenance", "Everything in the house is the family's own. Nothing employer provided, nothing on loan, no temporary housing inventory. Recorded because a later move or claim turns on it."),
  F("Transportation safety protocol", "Jordan does not transport either child, in any vehicle, for any reason. Not a rule about driving standards; the household simply does not want it and the boundary is cleaner stated than assumed.", "CAUTION"),
  F("COLLECTION REGISTRY", "Lisa's grandmother's ceramics on the study shelves, six pieces, dry brush only and never moved. Two framed prints in the dining room. No watches, no instruments, no cellar. Nothing separately insured.", "CAUTION"),
  F("FANDOM & HOBBY REGISTRY", "Not a fandom household. No teams followed, no colours that matter, no seasons to plan around. Recorded as an answer rather than left blank, because absent and unasked look identical otherwise."),
  F("GESTURE LOG", "Two so far, both from dots. The returns run, which Lisa called weirdly life-changing in May and again in August. The coffee reorder at half a can, which came from a passing remark in April. Neither has been repeated as a surprise."),
  F("STANDING COMMITMENTS REGISTRY", "No religious or spiritual observance to work around. The standing commitments are Mia's swim season January to March and the Ridge Association meetings, which the family attends about half the time."),
  F("Aging-parent horizon", "Gram Ruth is 74, twelve minutes away, drives, and is in the house most weeks. No signals of change and nothing being managed. Recorded because she is load bearing in this household's week, and a change in her would be felt immediately."),
  F("MEMORY & MILESTONE REGISTER", "Owen's first day of kindergarten, September 2026, photographed on the front step as every first day has been. Mia's last year at Maple Grove, 2027. Biscuit is 6 and that horizon is real but not near."),
];

const hh = await pool.query("SELECT id, name FROM household WHERE id = $1", [FERNBROOK_DEMO_ID]);
if (!hh.rowCount) {
  console.error(`No household at the pinned Fernbrook id ${FERNBROOK_DEMO_ID}.`);
  console.error("This script writes playbook content and will not guess which household to write to.");
  process.exit(1);
}
const householdId: string = hh.rows[0].id;
console.log(`Fernbrook resolved by pinned id: ${hh.rows[0].name}`);

// Two failure modes, both REFUSED rather than written through:
//   0 matches: the template moved and the pattern names nothing.
//   >1 match:  the pattern is ambiguous and would write to whichever row
//              the database happened to return first, which is the G-95
//              shape at field scale.
const ambiguous: string[] = [];
const missing: string[] = [];
let written = 0;

for (const [pattern, value, flag, provenance] of FILL) {
  const like = `${pattern}%`;
  const { rows } = await pool.query(
    "SELECT id FROM playbook_field WHERE household_id = $1 AND name LIKE $2", [householdId, like]);
  if (rows.length === 0) { missing.push(pattern); continue; }
  if (rows.length > 1) { ambiguous.push(`${pattern} (${rows.length} matches)`); continue; }
  await pool.query(
    `UPDATE playbook_field SET value = $1, flag = $2::field_flag, provenance = $3::provenance,
       confirmed = true, provenance_date = $4, updated_at = now() WHERE id = $5`,
    [value, flag, provenance, new Date("2026-06-14T14:00:00Z"), rows[0].id]);
  written += 1;
}

if (missing.length) {
  console.error(`\n${missing.length} pattern(s) matched NOTHING; the template may have moved:`);
  for (const m of missing) console.error(`  - ${m}`);
}
if (ambiguous.length) {
  console.error(`\n${ambiguous.length} pattern(s) matched MORE THAN ONE field and were refused:`);
  for (const a of ambiguous) console.error(`  - ${a}`);
}

const after = await pool.query(
  `SELECT count(*) AS total,
          count(*) FILTER (WHERE value IS NOT NULL AND value <> '') AS carries,
          count(*) FILTER (WHERE (value IS NULL OR value = '') AND sensitivity = 's3') AS blank_s3
   FROM playbook_field WHERE household_id = $1`, [householdId]);
const a = after.rows[0];
console.log(`\nwritten this run: ${written}`);
console.log(`playbook now: ${a.carries} of ${a.total} carry a value (${a.total - a.carries} blank, of which ${a.blank_s3} are s3 under the vault guardrail)`);
await pool.end();
if (missing.length || ambiguous.length) process.exit(1);
