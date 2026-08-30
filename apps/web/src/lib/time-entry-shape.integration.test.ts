import { test, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * G-111 paid time (founder ruling, 30 August 2026), migration 0059: the
 * subject-shape CHECK holds the two ruled row shapes structurally.
 * Household work (delivery, travel, intake, admin) carries its household;
 * person work (training and WK-SOP-017's four) carries none, whole or
 * refused both directions. These are the same five proofs run in raw SQL
 * at the migration's landing, held here so CI re-proves them on every run.
 *
 * Precondition asserted first (the G-72 rule): the constraint EXISTS,
 * read from pg_constraint, before any case runs. Without this, all three
 * refusal cases would "pass" against a database where the migration never
 * applied, by failing for a different reason or not failing at all.
 */
let userId = "";
let householdId = "";

beforeAll(async () => {
  const con = await db.execute(sql`SELECT count(*)::int AS n FROM pg_constraint WHERE conname = 'time_entry_subject_shape'`);
  expect(Number((con.rows[0] as { n: number }).n), "precondition: the subject-shape constraint must exist").toBe(1);
  const u = await db.execute(sql`SELECT id FROM auth_user LIMIT 1`);
  const h = await db.execute(sql`SELECT id FROM household LIMIT 1`);
  userId = (u.rows[0] as { id: string }).id;
  householdId = (h.rows[0] as { id: string }).id;
});

const insert = (category: string, hh: string | null) =>
  db.execute(sql`INSERT INTO time_entry (id, household_id, user_id, category, started_at, ended_at, minutes, source, note)
    VALUES (gen_random_uuid(), ${hh}, ${userId}, ${category}::time_category, now(), now() + interval '1 hour', 60, 'manual', 'shape-proof')`);

/** Drizzle wraps the Postgres error ("Failed query: ..."), with the real
 * message in the cause chain. The refusal must be THIS constraint by name,
 * chased through the chain: accepting any failed insert would let a down
 * database or an unrelated error read as a passing refusal, which is the
 * G-72 evasion this file's precondition exists to block. */
async function expectShapeRefusal(p: Promise<unknown>) {
  let err: unknown = null;
  try { await p; } catch (e) { err = e; }
  expect(err, "the insert was ACCEPTED; the CHECK did not refuse it").not.toBeNull();
  const chain: string[] = [];
  for (let e = err; e; e = (e as { cause?: unknown }).cause) {
    chain.push(String((e as { message?: unknown }).message ?? e));
  }
  expect(chain.join(" | ")).toMatch(/time_entry_subject_shape/);
}

test("a delivery row without a household refuses on the CHECK", async () => {
  await expectShapeRefusal(insert("delivery", null));
});

test("a person-scoped row WITH a household refuses on the CHECK (training)", async () => {
  await expectShapeRefusal(insert("training", householdId));
});

test("a new WK-SOP-017 category WITH a household refuses on the CHECK", async () => {
  await expectShapeRefusal(insert("team_meeting", householdId));
});

test("the refusal helper refuses a WRONG failure: a non-CHECK error must not pass as a refusal", async () => {
  // The helper's own red direction (the it-tests-its-logic lesson): hand it
  // a rejection that is real but is not this constraint, and it must throw.
  let passedWrongly = false;
  try {
    await expectShapeRefusal(Promise.reject(new Error("connection refused")));
    passedWrongly = true;
  } catch { /* correct: the helper refused the wrong failure */ }
  expect(passedWrongly, "a non-CHECK failure was accepted as a shape refusal").toBe(false);
});

test("both ruled shapes are accepted: household delivery, and person-scoped team_meeting", async () => {
  await insert("delivery", householdId);
  await insert("team_meeting", null);
  const r = await db.execute(sql`SELECT count(*)::int AS n, count(household_id)::int AS hh FROM time_entry WHERE note = 'shape-proof'`);
  const row = r.rows[0] as { n: number; hh: number };
  expect(Number(row.n)).toBe(2);
  expect(Number(row.hh)).toBe(1);
  await db.execute(sql`DELETE FROM time_entry WHERE note = 'shape-proof'`);
});
