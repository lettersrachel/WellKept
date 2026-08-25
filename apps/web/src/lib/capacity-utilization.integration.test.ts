import { test, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { perHomUtilization } from "./capacity-utilization";

/**
 * The A581 role-based retrieval tests, on the permission-matrix
 * enforcement point itself (WK-DEV-007 section 5: "a role-based test
 * proves a corporate-role user without those flags cannot retrieve it
 * by any route"; the function IS the route every surface must go
 * through, and the journey proves the rendered page separately).
 * Refusals first, then the accepting shape with the tester and
 * fixture exclusions proven inside it.
 */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const hhId = randomUUID();
const fixtureId = randomUUID();
const homId = randomUUID();
const testerId = randomUUID();

beforeAll(async () => {
  // A real (non-fixture) household with one ordinary HOM and one
  // tester-flagged HOM, plus a fixture household the census must skip.
  // is_fixture=false here is safe: rows are synthetic and torn down, and
  // no real-data rule is touched (nothing resembles a person's record).
  await pool.query("INSERT INTO household (id, name, tier, is_fixture) VALUES ($1,'UTIL proof home','concierge',false), ($2,'UTIL proof fixture','concierge',true)", [hhId, fixtureId]);
  await pool.query("INSERT INTO auth_user (id, email, name, is_tester) VALUES ($1,$2,'Util Proof HOM',false), ($3,$4,'Util Proof Tester',true)",
    [homId, `util-hom-${homId.slice(0, 8)}@proof.test`, testerId, `util-tester-${testerId.slice(0, 8)}@proof.test`]);
  await pool.query("INSERT INTO household_role_assignment (id, user_id, household_id, role, nda_approved) VALUES ($1,$2,$4,'house_manager',true), ($3,$5,$4,'house_manager',true)",
    [randomUUID(), homId, randomUUID(), hhId, testerId]);
  // The tester also 'serves' the fixture, which must count nowhere.
  await pool.query("INSERT INTO household_role_assignment (id, user_id, household_id, role, nda_approved) VALUES ($1,$2,$3,'house_manager',true)",
    [randomUUID(), homId, fixtureId]);
  // 120 delivery minutes for the HOM, 60 for the tester (must not appear).
  const put = (user: string, minutes: number) => pool.query(
    "INSERT INTO time_entry (id, household_id, user_id, category, started_at, ended_at, minutes, source) VALUES ($1,$2,$3,'delivery',now() - interval '1 day',now() - interval '1 day' + make_interval(mins => $4::int),$4::int,'manual')",
    [randomUUID(), hhId, user, minutes]);
  await put(homId, 120);
  await put(testerId, 60);
});

afterAll(async () => {
  await pool.query("DELETE FROM time_entry WHERE household_id = ANY($1)", [[hhId, fixtureId]]);
  await pool.query("DELETE FROM household_role_assignment WHERE household_id = ANY($1)", [[hhId, fixtureId]]);
  await pool.query("DELETE FROM household WHERE id = ANY($1)", [[hhId, fixtureId]]);
  await pool.query("DELETE FROM auth_user WHERE id = ANY($1)", [[homId, testerId]]);
  await pool.end();
});

test("the refusal direction: every role without the founder/CFO flags gets null, corporate_ops included", async () => {
  expect(await perHomUtilization(db, ["corporate_ops"])).toBeNull();
  expect(await perHomUtilization(db, ["house_manager"])).toBeNull();
  expect(await perHomUtilization(db, ["backup_hm"])).toBeNull();
  expect(await perHomUtilization(db, ["client"])).toBeNull();
  expect(await perHomUtilization(db, [])).toBeNull();
  // A made-up flag cannot open it either (fail closed, the matrix posture).
  expect(await perHomUtilization(db, ["founder"])).toBeNull();
});

test("the accepting direction: founder and CFO seats retrieve capacity rows; testers and fixtures never enter them", async () => {
  for (const role of ["corporate_admin", "cfo_readonly"]) {
    const rows = await perHomUtilization(db, [role]);
    expect(rows).not.toBeNull();
    const mine = rows!.find((r) => r.name === "Util Proof HOM");
    expect(mine).toBeDefined();
    // One real household (the fixture assignment must not count), two
    // delivery hours, two hours per household.
    expect(mine!.households).toBe(1);
    expect(mine!.deliveryHours30d).toBe(2);
    expect(mine!.hoursPerHousehold).toBe(2);
    // The tester's is_tester filter holds in the capacity computation.
    expect(rows!.some((r) => r.name === "Util Proof Tester")).toBe(false);
  }
});
