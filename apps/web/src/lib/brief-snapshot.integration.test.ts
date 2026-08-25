import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { household, authUser, visitBriefSnapshot } from "@wellkept/schema";
import { recordBriefSnapshot } from "./brief-snapshot";
import { db } from "./db";

/**
 * WK-DEV-009 s2.1 on the REAL database: a composed brief persists once,
 * an unchanged re-composition is a silent no-op, changed content and a
 * changed projection each write their own snapshot, and the blanking
 * erasure leaves the skeleton (id, who, when, hash) intact.
 */
const H = randomUUID();
const U = `brief-test-${H.slice(0, 8)}`;

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `Brief Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
});

afterAll(async () => {
  await db.delete(visitBriefSnapshot).where(eq(visitBriefSnapshot.householdId, H));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("distinct briefs persist; unchanged re-composition writes nothing; projections are distinct evidence", async () => {
  const briefA = { household: { name: "Brief Test" }, flags: [{ name: "Allergies", flag: "CRITICAL" }] };
  const mine = () => db.select().from(visitBriefSnapshot).where(eq(visitBriefSnapshot.householdId, H));

  const hash1 = await recordBriefSnapshot({ householdId: H, briefedUser: U, role: "house_manager", strangerMode: false, payload: briefA });
  assert.equal((await mine()).length, 1);

  // Re-composed unchanged: the same hash, no new row.
  const hash2 = await recordBriefSnapshot({ householdId: H, briefedUser: U, role: "house_manager", strangerMode: false, payload: briefA });
  assert.equal(hash1, hash2);
  assert.equal((await mine()).length, 1);

  // The stranger projection of the same moment is its own evidence.
  await recordBriefSnapshot({ householdId: H, briefedUser: U, role: "house_manager", strangerMode: true, payload: { ...briefA, flags: [] } });
  // Changed content writes the next snapshot.
  await recordBriefSnapshot({ householdId: H, briefedUser: U, role: "house_manager", strangerMode: false, payload: { ...briefA, dots: [{ verbatim: "new" }] } });
  const rows = await mine();
  assert.equal(rows.length, 3);
  for (const r of rows) {
    assert.equal(r.briefedUser, U);
    assert.match(r.contentHash, /^[0-9a-f]{64}$/);
  }

  // The blanking erasure shape: payload gone, skeleton and hash intact.
  await db.update(visitBriefSnapshot).set({ payload: { erased: true } }).where(eq(visitBriefSnapshot.householdId, H));
  const blanked = await mine();
  assert.equal(blanked.length, 3, "blanking never drops the record that a brief was shown");
  for (const r of blanked) {
    assert.deepEqual(r.payload, { erased: true });
    assert.match(r.contentHash, /^[0-9a-f]{64}$/);
  }
});
