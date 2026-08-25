/**
 * set-capacity.ts : the capacity configuration loader (pnpm db:capacity).
 *
 * WK_Handoff_v5_Intake_Ruling section 3 (audit C-06): the 3..5
 * households-per-HOM band is workforce operating doctrine, stored as
 * VERSIONED configuration and never hard-coded in app logic; cap=5 is
 * COVENANT-RELEVANT (the lender capacity math and hiring gates of the
 * model of record are built on it), so a cap change is a two-key model
 * change BEFORE it is a config change. Accordingly this loader takes
 * NO value arguments at all: it writes exactly the ruling's own
 * figures (CAPACITY_CONFIG_RULING), and a different cap can only
 * arrive by editing that constant in a reviewed change citing its
 * two-key register entry. Idempotent: an unchanged value writes no
 * version (setAppSettingVersioned no-ops).
 *
 * Usage: pnpm db:capacity --set-by admin@example.com
 * (the corporate identity this write is attributed to; required.)
 */
import pg from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { authUser } from "./tables.ts";
import { setAppSettingVersioned, CAPACITY_GATE_KEY, CAPACITY_CONFIG_RULING } from "./app-config.ts";

const argv = process.argv.slice(2);
const i = argv.indexOf("--set-by");
const setBy = i >= 0 ? argv[i + 1] : undefined;
if (!setBy || !setBy.includes("@")) {
  console.error("REFUSED: --set-by is required (the corporate identity's email this write is attributed to).");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);
const [user] = await db.select().from(authUser).where(eq(authUser.email, setBy));
if (!user) {
  console.error(`REFUSED: no user with email ${setBy}; the identity must already exist.`);
  await pool.end();
  process.exit(1);
}

const result = await db.transaction(async (tx) =>
  setAppSettingVersioned(tx, {
    key: CAPACITY_GATE_KEY,
    value: CAPACITY_CONFIG_RULING,
    setBy: user.id,
    reason:
      "Capacity doctrine per the v5 intake ruling section 3 (audit C-06): cap=5 covenant-relevant, band 3..5; a cap change is a two-key model change before a config change.",
  }));

console.log(
  result.changed
    ? `capacity_gate set to the ruling's figures at version ${result.version}.`
    : `capacity_gate already carries the ruling's figures (version ${result.version}); no version written.`,
);
await pool.end();
