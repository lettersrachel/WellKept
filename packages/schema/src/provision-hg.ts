/**
 * provision-hg.ts : provision Household Green and its tester (pnpm db:hg).
 *
 * WK_Tester_Provisioning_Household_Green (24 Aug 2026, register draft
 * A576), section 2, developer-side checklist items 1-3:
 *
 *  - Household Green (HG) starts PSEUDONYMIZED: the codename is the
 *    household name, no street address, no contact details, the s3 tier
 *    empty. Real identifiers enter only after Phase 1 clears, via one
 *    importer run at the Day 5 go/no-go.
 *  - Lauren Green is a HOM-ROLE USER, tenant-scoped to HG ONLY, with
 *    the tester flag set: full HOM read/write in her one household
 *    (never the trainee role), and her events excludable from every
 *    covenant, payroll, or learning computation by the single
 *    is_tester filter. Standard app authentication; D3 passkey
 *    requirements attach only if the account ever gains a privileged
 *    or corporate capability. Default: NO corporate role (the founder
 *    grant, if ever given, excludes the Ruling 1 surfaces).
 *  - Starter fixture set so her first session has something to see: a
 *    handful of rooms, three or four assets, one open loop, one
 *    upcoming rhythm item. Every seeded row says fixture-origin in its
 *    own note/detail; the ROWS are placeholders, the HOUSEHOLD is not
 *    a fixture (is_fixture=false: HG is the real test tenant, and the
 *    exclusion contract rides the tester flag on the USER, per the
 *    provisioning doc, not the household).
 *
 * Usage: pnpm db:hg --email tester@example.com [--name "Lauren Green"]
 * The tester's real email is REQUIRED and never lives in this repo; a
 * run without it refuses. Re-running is idempotent (fixed ids; the
 * user keys on the email given).
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  household, playbookField, authUser, householdRoleAssignment, registryEntry, workItem,
} from "./tables.ts";

const argv = process.argv.slice(2);
const argOf = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const email = argOf("--email");
const name = argOf("--name") ?? "Lauren Green";
if (!email || !email.includes("@")) {
  console.error("REFUSED: --email is required (the tester's real sign-in address; it never lives in this repo).");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

// Fixed ids: the whole provisioning converges on re-run.
const HG = "01997700-0000-7000-8000-00000000a001";
const F = (n: number) => `01997700-0000-7000-8000-00000000a1${String(n).padStart(2, "0")}`;
const R = (n: number) => `01997700-0000-7000-8000-00000000a2${String(n).padStart(2, "0")}`;
const OPEN_LOOP = "01997700-0000-7000-8000-00000000a301";

await db.insert(household).values({
  id: HG, name: "Household Green", tier: "family_ops", statusTag: "ONBOARDING-90",
}).onConflictDoNothing();

await db.insert(authUser).values({ id: randomUUID(), email, name, isTester: true })
  .onConflictDoNothing({ target: authUser.email });
const [tester] = await db.select().from(authUser).where(eq(authUser.email, email));
await db.update(authUser).set({ isTester: true }).where(eq(authUser.id, tester!.id));
await db.insert(householdRoleAssignment).values({
  id: randomUUID(), userId: tester!.id, householdId: HG, role: "house_manager", ndaApproved: true,
}).onConflictDoNothing();
console.log(`HG tenant + tester provisioned: ${email} -> house_manager on Household Green (is_tester=true)`);

// The starter fixture set. Pseudonymized: rooms and assets carry no
// address, no names beyond the codename; content is deliberately thin
// so the real intake import replaces rather than fights it.
const NOTE = "fixture-origin starter row (HG provisioning); replaced by the real intake import";
const FIELDS: Array<{ id: string; section: number; name: string; value: string; sensitivity: "s1" | "s2" }> = [
  { id: F(1), section: 1, name: "Household summary paragraph (drafted after intake, client-readable)",
    value: "Household Green. Pseudonymized test tenant; the real record enters at the Phase 1 go/no-go.", sensitivity: "s1" },
  { id: F(2), section: 6, name: "Rooms: main floor overview",
    value: "Kitchen, living room, study. Starter row for the tester's first session.", sensitivity: "s1" },
  { id: F(3), section: 6, name: "Rooms: upstairs overview",
    value: "Two bedrooms, shared bath. Starter row for the tester's first session.", sensitivity: "s1" },
  { id: F(4), section: 7, name: "Access: how the HOM enters",
    value: "To be captured at the walkthrough. Nothing real is stored while HG is pseudonymized.", sensitivity: "s2" },
];
for (const f of FIELDS) {
  await db.insert(playbookField).values({
    id: f.id, householdId: HG, section: f.section, name: f.name, value: f.value,
    note: NOTE, sensitivity: f.sensitivity, provenance: "unconfirmed", confirmed: false,
  }).onConflictDoNothing();
}

const ASSETS = [
  { id: R(1), kind: "appliance" as const, label: "Furnace", detail: { fixtureOrigin: true, location: "basement" } },
  { id: R(2), kind: "appliance" as const, label: "Water heater", detail: { fixtureOrigin: true, location: "basement" } },
  { id: R(3), kind: "appliance" as const, label: "Washer and dryer", detail: { fixtureOrigin: true, location: "upstairs hall" } },
  // The upcoming rhythm item.
  { id: R(4), kind: "commitment" as const, label: "Seasonal changeover walkthrough", detail: { fixtureOrigin: true }, keyDate: new Date("2026-09-15T12:00:00Z"), cadence: "seasonal" },
];
for (const r of ASSETS) {
  await db.insert(registryEntry).values({ householdId: HG, ...r }).onConflictDoNothing();
}

// The one open loop.
await db.insert(workItem).values({
  id: OPEN_LOOP, householdId: HG, title: "Confirm the walkthrough date with the founder",
  detail: NOTE, kind: "followup", source: "corporate",
}).onConflictDoNothing();

console.log("HG starter set in place: 4 fields, 3 assets, 1 rhythm item, 1 open loop (all fixture-origin)");
await pool.end();
