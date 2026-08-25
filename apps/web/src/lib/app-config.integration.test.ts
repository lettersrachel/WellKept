import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { authUser, appSetting, appSettingVersion, setAppSettingVersioned } from "@wellkept/schema";
import { db } from "./db";

/**
 * The versioned-knob path (v5 intake ruling section 3), proven against
 * the real database: the first write mints version 1 with a null prior,
 * a change mints version 2 recording exactly what it replaced, and an
 * unchanged value is a NO-OP that mints nothing. A scratch key keeps
 * the proof away from the real knobs.
 */
const KEY = `test_knob_${randomUUID().slice(0, 8)}`;
const U = `knob-test-${KEY.slice(-8)}`;

beforeAll(async () => {
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
});

afterAll(async () => {
  await db.delete(appSettingVersion).where(eq(appSettingVersion.key, KEY));
  await db.delete(appSetting).where(eq(appSetting.key, KEY));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("versioned knob: first write is v1, a change records its prior, an unchanged value no-ops", async () => {
  const first = await db.transaction((tx) =>
    setAppSettingVersioned(tx, { key: KEY, value: { cap: 5 }, setBy: U, reason: "test first set" }));
  assert.deepEqual(first, { changed: true, version: 1 });

  // Unchanged value: no-op, no empty version minted.
  const again = await db.transaction((tx) =>
    setAppSettingVersioned(tx, { key: KEY, value: { cap: 5 }, setBy: U, reason: "test repeat" }));
  assert.deepEqual(again, { changed: false, version: 1 });

  // A change mints v2 and records exactly what it replaced.
  const second = await db.transaction((tx) =>
    setAppSettingVersioned(tx, { key: KEY, value: { cap: 5, bandMin: 3 }, setBy: U, reason: "test change" }));
  assert.deepEqual(second, { changed: true, version: 2 });

  // THE case caught live on db:capacity's second run: jsonb does not
  // preserve key order, so the same value written with keys in a
  // different order must still no-op (canonical comparison, not
  // stringify equality).
  const reordered = await db.transaction((tx) =>
    setAppSettingVersioned(tx, { key: KEY, value: { bandMin: 3, cap: 5 }, setBy: U, reason: "test reorder" }));
  assert.deepEqual(reordered, { changed: false, version: 2 });

  const versions = await db.select().from(appSettingVersion)
    .where(eq(appSettingVersion.key, KEY)).orderBy(appSettingVersion.version);
  assert.equal(versions.length, 2, "exactly two versions: the no-op minted nothing");
  assert.equal(versions[0]!.priorValue, null, "v1 replaced nothing");
  assert.deepEqual(versions[1]!.priorValue, { cap: 5 }, "v2 records what it replaced");
  assert.equal(versions[1]!.setBy, U);
  assert.equal(versions[1]!.reason, "test change");

  const [setting] = await db.select().from(appSetting).where(eq(appSetting.key, KEY));
  assert.deepEqual(setting!.value, { cap: 5, bandMin: 3 }, "the setting carries the latest value");
});
