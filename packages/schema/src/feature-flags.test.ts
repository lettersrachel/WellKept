import { test } from "vitest";
import assert from "node:assert/strict";
import { featureEnabled, readFeatureFlags } from "./feature-flags";

/** Mock db returning a fixed app_setting row (or none). */
const dbWith = (value: unknown | undefined) => ({
  select: () => ({ from: () => ({ where: async () => (value === undefined ? [] : [{ value }]) }) }),
});

test("absent row: dark features stay off, kill-switched features stay on", async () => {
  const db = dbWith(undefined);
  assert.equal(await featureEnabled(db, "shadow_engine"), false);
  assert.equal(await featureEnabled(db, "visit_digest", true), true);
});

test("a set flag wins over the fallback in both directions", async () => {
  const db = dbWith({ shadow_engine: true, visit_digest: false });
  assert.equal(await featureEnabled(db, "shadow_engine"), true);
  assert.equal(await featureEnabled(db, "visit_digest", true), false, "the kill switch kills");
});

test("malformed rows resolve to the declared fallback, never a surprise flip", async () => {
  assert.equal(await featureEnabled(dbWith("not an object"), "shadow_engine"), false);
  assert.equal(await featureEnabled(dbWith(["array"]), "visit_digest", true), true);
  assert.equal(await featureEnabled(dbWith({ shadow_engine: "yes" }), "shadow_engine"), false, "a non-boolean value is not a yes");
  assert.deepEqual(await readFeatureFlags(dbWith({ a: true, b: 1, c: false })), { a: true, c: false });
});
