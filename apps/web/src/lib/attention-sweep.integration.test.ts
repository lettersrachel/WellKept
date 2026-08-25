import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { household, authUser, deferral, workItem, attentionRecord, eventOutbox } from "@wellkept/schema";
import { sweepAttentionRecords } from "@wellkept/trigger-engine";
import { db } from "./db";

/**
 * RFC-PRIM-01 build 2 on the REAL database: the sweep raises one
 * attention record per overdue source with its opened event, re-runs
 * raise nothing (the one-per-source index), and a resolved record does
 * not resurrect on the next pass.
 */
const H = randomUUID();
const U = `attn-test-${H.slice(0, 8)}`;
const D = randomUUID();
const W = randomUUID();

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `Attention Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
  await db.insert(deferral).values({
    id: D, householdId: H, noticed: "gutter joint", reason: "sealed area needs dry weather",
    revisitDate: "2026-08-01", decidedBy: U, decidedAt: new Date(),
  });
  await db.insert(workItem).values({
    id: W, householdId: H, title: "vendor quote follow-up", kind: "followup", source: "corporate", dueDate: "2026-08-10",
  });
});

afterAll(async () => {
  await db.delete(attentionRecord).where(eq(attentionRecord.householdId, H));
  await db.delete(eventOutbox).where(eq(eventOutbox.householdId, H));
  await db.delete(deferral).where(eq(deferral.householdId, H));
  await db.delete(workItem).where(eq(workItem.householdId, H));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("the sweep raises once per source with its event, stays idempotent, and never resurrects a resolved record", async () => {
  const first = await sweepAttentionRecords(db);
  const mine = () => db.select().from(attentionRecord).where(eq(attentionRecord.householdId, H));
  let rows = await mine();
  assert.equal(rows.length, 2, "one record per overdue source in this household");
  assert.ok(first.raised >= 2);
  const kinds = rows.map((r) => r.sourceKind).sort();
  assert.deepEqual(kinds, ["deferral", "work_item"]);
  for (const r of rows) {
    assert.equal(r.status, "open");
    assert.equal(r.audience, "hom");
    assert.equal(r.acknowledgedAt, null);
  }
  const events = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  assert.equal(events.filter((e) => e.kind === "attention_record.opened").length, 2,
    "only genuine inserts emit events");

  // Idempotent: the same overdue facts raise nothing new.
  await sweepAttentionRecords(db);
  rows = await mine();
  assert.equal(rows.length, 2);
  const events2 = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  assert.equal(events2.filter((e) => e.kind === "attention_record.opened").length, 2);

  // A resolved record stays resolved: the source is still overdue, and
  // the next pass does NOT nag it back open (one per source, ever).
  const target = rows.find((r) => r.sourceKind === "deferral")!;
  await db.update(attentionRecord).set({
    status: "resolved", resolution: "spoke with the HOM; scheduled", resolvedAt: new Date(), resolvedBy: U,
  }).where(eq(attentionRecord.id, target.id));
  await sweepAttentionRecords(db);
  rows = await mine();
  assert.equal(rows.length, 2, "no resurrection");
  assert.equal(rows.filter((r) => r.status === "resolved").length, 1);
});
