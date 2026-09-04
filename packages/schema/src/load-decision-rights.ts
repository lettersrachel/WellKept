/**
 * load-decision-rights.ts : the Decision Rights seed loader
 * (pnpm db:decision-rights).
 *
 * Q-6-1. Seeds one household's Decision Rights block from the FROZEN
 * values package, at the tier the household actually carries. It takes
 * NO value arguments: every figure comes from
 * `docs/intake/2026-09-04-founder-values/decision_rights_by_tier.csv`,
 * which entered the repository once under the 4 September intake that
 * hash-pinned it. A different value arrives by amending that package
 * through an intake, never by an argument here.
 *
 * PROVENANCE IS VISIBLE, NOT IMPLICIT (founder ruling): every seeded row
 * lands `status = 'recommended'` with an `authority` string naming the
 * frozen file and the tier column it was read from. These are the
 * company's proposal until the COO and the founder confirm the rows, and
 * a person reading the block can tell which is which without being told.
 *
 * Usage: pnpm db:decision-rights --household <uuid>
 *        pnpm db:decision-rights --household <uuid> --dry-run
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { household, decisionRight } from "./tables.ts";
import { parseDecisionRights } from "./decision-rights-source.ts";

const SOURCE = "docs/intake/2026-09-04-founder-values/decision_rights_by_tier.csv";

const argv = process.argv.slice(2);
const hi = argv.indexOf("--household");
const householdId = hi >= 0 ? argv[hi + 1] : undefined;
const dryRun = argv.includes("--dry-run");
if (!householdId) {
  console.error("REFUSED: --household <uuid> is required. Decision Rights belong to one household; there is no fleet-wide seed.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const [hh] = await db.select({ id: household.id, name: household.name, tier: household.tier })
  .from(household).where(eq(household.id, householdId));
if (!hh) {
  console.error(`REFUSED: no household ${householdId}.`);
  await pool.end();
  process.exit(1);
}

const csv = readFileSync(join(import.meta.dirname, "../../../", SOURCE), "utf8");
const seeds = parseDecisionRights(csv, hh.tier);
const authority = `${SOURCE} (tier column for ${hh.tier}), intaken and hash-pinned 2026-09-04; RECOMMENDATION until confirmed`;

console.log(`${hh.name}: tier ${hh.tier}, ${seeds.length} rights from the frozen source.`);

// The residues are PRINTED rather than left to be discovered in the
// data: a NULL materiality that nobody announced reads like a parse
// that gave up, and these two are decisions.
for (const s of seeds) {
  if (s.materialityResidueReason) {
    console.log(`  materiality NULL on ${s.rightKey}: ${s.materialityResidueReason}`);
  }
}

if (dryRun) {
  for (const s of seeds) {
    const v = s.valueCents !== null ? `${s.valueCents} cents` : `"${s.valueText}"`;
    console.log(`  DRY RUN would upsert ${s.rightKey} = ${v} [${s.materiality ?? "materiality NULL"}]`);
  }
  console.log("DRY RUN: nothing was written.");
  await pool.end();
  process.exit(0);
}

let written = 0;
for (const s of seeds) {
  // Upsert in place on (household, right). A re-run must not mint a
  // second opinion, and it must NOT overwrite a CONFIRMED row: once a
  // household has agreed a right, the company's recommendation stops
  // being the authority on it.
  const [existing] = await db.select({ id: decisionRight.id, status: decisionRight.status })
    .from(decisionRight)
    .where(and(eq(decisionRight.householdId, hh.id), eq(decisionRight.rightKey, s.rightKey)));
  if (existing?.status === "confirmed") {
    console.log(`  kept CONFIRMED ${s.rightKey} (the household's own answer outranks the seed)`);
    continue;
  }
  await db.insert(decisionRight).values({
    id: randomUUID(),
    householdId: hh.id,
    rightKey: s.rightKey,
    valueCents: s.valueCents,
    valueText: s.valueText,
    materiality: s.materiality as "safety_access" | "money_legal" | "convenience" | null,
    status: "recommended",
    authority,
    note: s.note,
  }).onConflictDoUpdate({
    target: [decisionRight.householdId, decisionRight.rightKey],
    set: {
      valueCents: s.valueCents, valueText: s.valueText,
      materiality: s.materiality as "safety_access" | "money_legal" | "convenience" | null, authority, note: s.note,
      updatedAt: new Date(),
    },
  });
  written++;
}
console.log(`${written} right(s) written as RECOMMENDED. None is confirmed until the COO and the founder say so.`);
await pool.end();
