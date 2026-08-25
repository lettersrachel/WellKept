import { test, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { requirementCalibration } from "./estimate-calibration";

/**
 * The Gate 2 scaffolding's own proofs: variance is arithmetic on what
 * the record says, NULL stays the honest unknown at every step, and
 * nothing about a person or a catalog id enters the row.
 */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

const hhId = randomUUID();
const userId = randomUUID();
const defId = randomUUID();
const profileId = randomUUID();
const reqBoth = randomUUID();   // estimate 45, actuals 60 then 50 (latest 50)
const reqNoEst = randomUUID();  // occurrence only
const reqUnknown = randomUUID(); // estimate known, actual NULL (the honest unknown)
const reqEmpty = randomUUID();  // nothing on record

beforeAll(async () => {
  await pool.query("INSERT INTO household (id, name, tier, is_fixture) VALUES ($1,'CAL proof home','concierge',true)", [hhId]);
  await pool.query("INSERT INTO auth_user (id, email, name) VALUES ($1,$2,'Cal Proof')", [userId, `cal-${userId.slice(0, 8)}@proof.test`]);
  await pool.query("INSERT INTO task_definition (id, name, description, created_by, provisional) VALUES ($1,'CAL proof task','proof','" + "'||$2||'" + "',true)".replace("'||$2||'", "$2"), [defId, userId]);
  await pool.query("INSERT INTO household_task_profile (id, household_id, task_definition_id, cadence, configured_by) VALUES ($1,$2,$3,'weekly, in words',$4)", [profileId, hhId, defId, userId]);
  for (const r of [reqBoth, reqNoEst, reqUnknown, reqEmpty]) {
    await pool.query("INSERT INTO work_requirement (id, household_id, task_profile_id, due_on, created_by) VALUES ($1,$2,$3,'2026-09-01',$4)", [r, hhId, profileId, userId]);
  }
  const est = (req: string, minutes: number | null, when: string) => pool.query(
    "INSERT INTO estimate_snapshot (id, household_id, work_requirement_id, estimated_minutes, basis, estimated_by, created_at) VALUES ($1,$2,$3,$4,'proof basis, in words',$5,$6)",
    [randomUUID(), hhId, req, minutes, userId, when]);
  const occ = (req: string, minutes: number | null, day: string) => pool.query(
    "INSERT INTO task_occurrence (id, household_id, work_requirement_id, occurred_on, outcome, actual_minutes, recorded_by) VALUES ($1,$2,$3,$4,'as_expected',$5,$6)",
    [randomUUID(), hhId, req, day, minutes, userId]);
  await est(reqBoth, 45, "2026-08-20T10:00:00Z");
  await occ(reqBoth, 60, "2026-08-21");
  await occ(reqBoth, 50, "2026-08-24"); // latest actual wins
  await occ(reqNoEst, 30, "2026-08-22");
  await est(reqUnknown, 40, "2026-08-20T10:00:00Z");
  await occ(reqUnknown, null, "2026-08-23"); // happened, duration honestly unknown
});

afterAll(async () => {
  await pool.query("DELETE FROM task_occurrence WHERE household_id=$1", [hhId]);
  await pool.query("DELETE FROM estimate_snapshot WHERE household_id=$1", [hhId]);
  await pool.query("DELETE FROM work_requirement WHERE household_id=$1", [hhId]);
  await pool.query("DELETE FROM household_task_profile WHERE household_id=$1", [hhId]);
  await pool.query("DELETE FROM task_definition WHERE id=$1", [defId]);
  await pool.query("DELETE FROM household WHERE id=$1", [hhId]);
  await pool.query("DELETE FROM auth_user WHERE id=$1", [userId]);
  await pool.end();
});

test("variance is latest actual minus latest estimate, and only when both are known", async () => {
  const c = await requirementCalibration(db, reqBoth);
  expect(c.estimatedMinutes).toBe(45);
  expect(c.actualMinutes).toBe(50);
  expect(c.varianceMinutes).toBe(5);
  expect(c.estimateCount).toBe(1);
  expect(c.occurrenceCount).toBe(2);
  // The row carries no person and no catalog id, by shape.
  expect(Object.keys(c).sort()).toEqual([
    "actualMinutes", "estimateCount", "estimatedMinutes",
    "occurrenceCount", "varianceMinutes", "workRequirementId",
  ]);
});

test("NULL stays the honest unknown: missing estimate, unknown actual, and empty record all yield null variance", async () => {
  const noEst = await requirementCalibration(db, reqNoEst);
  expect(noEst.estimatedMinutes).toBeNull();
  expect(noEst.actualMinutes).toBe(30);
  expect(noEst.varianceMinutes).toBeNull();

  const unknown = await requirementCalibration(db, reqUnknown);
  expect(unknown.estimatedMinutes).toBe(40);
  expect(unknown.actualMinutes).toBeNull(); // never invented as zero
  expect(unknown.varianceMinutes).toBeNull();

  const empty = await requirementCalibration(db, reqEmpty);
  expect(empty.estimateCount).toBe(0);
  expect(empty.occurrenceCount).toBe(0);
  expect(empty.varianceMinutes).toBeNull();
});
