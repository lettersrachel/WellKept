/**
 * load-seed.ts : load a wk_import.py seed JSON into the local dev database.
 * Usage: node src/load-seed.ts [path/to/seed.json]
 * Defaults to the Fernbrook template seed. Upserts by UUID (re-runs are
 * idempotent, matching the importer's UUID-preservation rule); never deletes.
 */
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { household, playbookField, authUser, householdRoleAssignment } from "./tables.ts";

interface SeedField {
  id: string; section: number; name: string; value: string;
  provenance: string; provenanceDate: string; sensitivity: "s1" | "s2" | "s3";
  confirmed: boolean; flag: string; note: string;
}
interface Seed {
  household: { id: string; name: string; tier: "essential" | "family_ops" | "concierge" };
  fields: SeedField[];
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const withDemoAccounts = process.argv.includes("--with-demo-accounts") || args.length === 0;
const seedPath = args[0]
  ?? new URL("../../../tooling/seed/fernbrook_template_seed.json", import.meta.url).pathname;
const seed = JSON.parse(await readFile(seedPath, "utf8")) as Seed;

/**
 * is_fixture IS A REQUIRED ARGUMENT, never a default (founder ruling,
 * 5 September 2026, `FOUNDER_RULINGS_2026-09-05_Items5and6.md` item 6), the
 * same pattern as `rateLimit`'s failure mode.
 *
 * **The reasoning, not only the rule.** `household.is_fixture` is what excludes
 * a household from fleet roll-ups, the reconciliation knob, the capacity
 * calculation and every covenant figure. The column is `NOT NULL DEFAULT
 * false`, and this loader never set it, so **a default let a household become
 * NON-FIXTURE WITHOUT THE CALLER SAYING SO, and that distinction is the entire
 * purpose of the flag.** A real household will go through `db:seed` one day,
 * which is exactly why the caller states which kind it is loading rather than
 * inheriting an answer.
 *
 * **What it would have cost, found by loading the three fixture workbooks
 * rather than trusting them (Q-11y):** all three landed as `is_fixture = false`
 * and would have been counted as real households in every corporate number,
 * looking entirely plausible while being wrong.
 *
 * Refusing is the whole point: a run that states nothing does not get a guess.
 */
const FIXTURE_FLAG = process.argv.includes("--fixture") ? true
  : process.argv.includes("--real") ? false
  : null;
if (FIXTURE_FLAG === null) {
  console.error(
    "REFUSED: state what you are loading.\n" +
    "  --fixture   a synthetic household, excluded from every fleet number\n" +
    "  --real      a real household, counted everywhere\n" +
    "There is no default: is_fixture decides whether this household appears in\n" +
    "fleet roll-ups, the reconciliation knob, the capacity calculation and the\n" +
    "covenant figures, so it is the caller's statement rather than an inherited\n" +
    "answer (founder ruling, 5 September 2026).",
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

await db.insert(household).values({
  id: seed.household.id, name: seed.household.name, tier: seed.household.tier,
  isFixture: FIXTURE_FLAG,
}).onConflictDoNothing();

const PROVENANCE = new Set(["asked", "observed", "verified_by_touch", "client_written", "unconfirmed"]);
const FLAGS = new Set(["none", "CRITICAL", "CAUTION", "DELIGHT"]);

let n = 0;
for (const f of seed.fields) {
  const row = {
    id: f.id,
    householdId: seed.household.id,
    section: f.section,
    name: f.name,
    value: f.value,
    note: f.note,
    sensitivity: f.sensitivity,
    // fail closed on vocabulary drift rather than guessing
    provenance: (PROVENANCE.has(f.provenance) ? f.provenance : "unconfirmed") as
      "asked" | "observed" | "verified_by_touch" | "client_written" | "unconfirmed",
    provenanceDate: f.provenanceDate ? new Date(f.provenanceDate) : null,
    confirmed: f.confirmed,
    flag: (FLAGS.has(f.flag) ? f.flag : "none") as "none" | "CRITICAL" | "CAUTION" | "DELIGHT",
  };
  await db.insert(playbookField).values(row).onConflictDoUpdate({
    target: playbookField.id,
    set: { value: row.value, note: row.note, sensitivity: row.sensitivity,
           provenance: row.provenance, provenanceDate: row.provenanceDate,
           confirmed: row.confirmed, flag: row.flag, name: row.name,
           section: row.section, updatedAt: new Date() },
  });
  n++;
}
console.log(`seeded household "${seed.household.name}" (${seed.household.id}): ${n} playbook_field rows upserted`);

// Demo identities (magic-link sign-in; links surface at /dev/last-email).
// Role comes from household_role_assignment, never from the client.
// GATED (HO sprint dry run, 2026-08-24): attaching these to EVERY loaded
// household would grant demo identities roles on a real household the day
// the real import runs, and a second house_manager assignment makes the
// field-surface resolution order-dependent (data.ts getFieldHouseholdAndPrincipal
// takes the first assignment with no ORDER BY). Default ON only for the
// bare `db:seed` (the Fernbrook dev template); any explicit seed path must
// opt in with --with-demo-accounts.
const DEMO_ACCOUNTS = [
  { email: "lisa@fernbrook.demo", name: "Lisa (client demo)", role: "client" as const },
  { email: "rachel@wellkept.demo", name: "Rachel (corporate demo)", role: "corporate_admin" as const },
  { email: "jordan@wellkept.demo", name: "Jordan (HM demo)", role: "house_manager" as const },
];
for (const acct of withDemoAccounts ? DEMO_ACCOUNTS : []) {
  const userId = randomUUID();
  await db.insert(authUser).values({ id: userId, email: acct.email, name: acct.name })
    .onConflictDoNothing({ target: authUser.email });
  const [user] = await db.select().from(authUser).where(eq(authUser.email, acct.email));
  await db.insert(householdRoleAssignment).values({
    id: randomUUID(), userId: user!.id, householdId: seed.household.id, role: acct.role,
  }).onConflictDoNothing();
  console.log(`  demo account ${acct.email} -> ${acct.role}`);
}
await pool.end();
