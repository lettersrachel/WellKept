import { test } from "vitest";
import assert from "node:assert/strict";
import { runTriggerPass } from "./run.ts";
import { CASCADES } from "./cascades";
import { household, triggerRule, anticipationExclusion } from "@wellkept/schema";
import type { FieldChangeEvent } from "./engine.ts";

/**
 * Q-5, the acceptance criterion's first clause: a fired trigger lands in
 * `anticipate`.
 *
 * WHY THIS IS A CAPTURED-VALUES TEST. It was written when the column
 * carried `DEFAULT 'anticipate'`, where a row read back from Postgres
 * said `anticipate` whether the engine wrote it or the database did, so
 * only the insert's own VALUES could tell those two claims apart. The
 * founder's 4 September ruling removed that default, which makes the
 * database read honest as well: a missing producer now leaves NULL. The
 * test stays as it is, because it still fails FIRST and for the right
 * reason, and because it names the producer requirement directly rather
 * than inferring it from a stored value. Kept with its history because
 * the reasoning is what a later reader needs, not the conclusion.
 *
 * NO DATABASE IS INVOLVED, said plainly so a green run here is not read
 * as evidence about one.
 */

const EVENT: FieldChangeEvent = {
  householdId: "hh-1",
  fieldId: "f-1",
  fieldName: "Medication list: refill cadence and pharmacy",
  section: 3,
  newValue: "Albuterol inhaler, refill monthly at Elm St pharmacy",
  changedAt: "2026-07-18T15:00:00Z",
};

/** Records every insert's values; answers selects by which table was asked for. */
function capturingDb() {
  const inserted: Record<string, unknown>[] = [];
  const rowsFor = (table: unknown) => {
    if (table === household) return [{ id: "hh-1", statusTag: "STEADY" }];
    if (table === triggerRule) return CASCADES;
    if (table === anticipationExclusion) return [];
    throw new Error("the fake db was asked for a table this test does not model");
  };
  const db = {
    select: () => ({
      from: (table: unknown) => {
        const result = rowsFor(table);
        return { where: async () => result, then: (r: (v: unknown) => void) => r(result) };
      },
    }),
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        inserted.push(v);
        return {
          onConflictDoNothing: () => ({ returning: async () => [{ id: v.id }] }),
        };
      },
    }),
  };
  return { db, inserted };
}

test("preconditions: the fake produces real drafts, so an empty pass cannot pass vacuously", async () => {
  const { db, inserted } = capturingDb();
  const result = await runTriggerPass(db as never, EVENT);
  assert.ok(inserted.length > 0,
    "no prompt_pack_item was inserted; every assertion below would be vacuous");
  assert.equal(result.emitted, inserted.length);
});

test("the trigger engine WRITES the stage itself: every emitted item carries anticipate", async () => {
  const { db, inserted } = capturingDb();
  await runTriggerPass(db as never, EVENT);
  for (const values of inserted) {
    assert.ok("stage" in values,
      "the insert omitted stage; the column default would supply it and the producer claim would be false");
    assert.equal(values.stage, "anticipate");
  }
});
