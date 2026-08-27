import { test, expect, beforeAll } from "vitest";
import { eq, and, desc } from "drizzle-orm";
import { attentionRecord, household, eventOutbox } from "@wellkept/schema";
import { db } from "./db";
import { raiseSuppressedSendNotice } from "./client-report-notice";

/**
 * G-81 against a real database. The unit cases prove the route calls it
 * and that it is shaped narrowly; this proves a row actually LANDS and
 * reaches the surface the ruling names, because a redirect proves a code
 * path ran and never that a write committed (the G-68 lesson).
 *
 * PRECONDITIONS asserted first: the database answers, and a household
 * exists to attach to. Six CHECK refusals once reported a clean REFUSED
 * with Postgres down, which is why liveness is asserted rather than
 * assumed.
 */
let hhId: string;

beforeAll(async () => {
  const rows = await db.select({ id: household.id }).from(household).limit(1);
  expect(rows.length, "no household in the test database; every case below would be vacuous").toBe(1);
  hhId = rows[0]!.id;
});

test("precondition: the database answers", async () => {
  const [row] = await db.select({ id: household.id }).from(household).limit(1);
  expect(row?.id).toBeTruthy();
});

test("a suppressed send lands as an open corporate-queue attention record", async () => {
  const why = "report carries 2 sentences, and the close-flow contract is exactly 3";
  await raiseSuppressedSendNotice(hhId, why);

  const [rec] = await db.select().from(attentionRecord)
    .where(and(eq(attentionRecord.householdId, hhId), eq(attentionRecord.sourceKind, "system")))
    .orderBy(desc(attentionRecord.createdAt)).limit(1);

  expect(rec, "no attention record was written").toBeTruthy();
  // The ruling: one destination, the corporate queue.
  expect(rec!.destination).toBe("corporate_queue");
  expect(rec!.audience).toBe("corporate");
  // Open, so the board's exception queue renders it.
  expect(rec!.status).toBe("open");
  expect(rec!.acknowledgedBy).toBeNull();
  // Structural reason, and never a member's own sentence.
  expect(rec!.reason).toContain("Client visit report not sent");
  expect(rec!.reason).toContain("the member received no email");
  expect(rec!.sourceId).toBeNull();
});

test("each suppressed send is its own row: nulls do not collide in the source index", async () => {
  const before = await db.select().from(attentionRecord)
    .where(and(eq(attentionRecord.householdId, hhId), eq(attentionRecord.sourceKind, "system")));
  await raiseSuppressedSendNotice(hhId, "report is not an array");
  const after = await db.select().from(attentionRecord)
    .where(and(eq(attentionRecord.householdId, hhId), eq(attentionRecord.sourceKind, "system")));
  // Each one is a separate thing a member did not receive, so each is a
  // separate row rather than an upsert onto the last.
  expect(after.length).toBe(before.length + 1);
});

test("the notice emits its lifecycle event with ids only, no member content", async () => {
  await raiseSuppressedSendNotice(hhId, "a report sentence is empty or not a string");
  const [ev] = await db.select().from(eventOutbox)
    .where(and(eq(eventOutbox.householdId, hhId), eq(eventOutbox.kind, "attention_record.opened")))
    .orderBy(desc(eventOutbox.createdAt)).limit(1);
  expect(ev, "no outbox event for the notice").toBeTruthy();
  expect(ev!.provenance).toBe("mail:client-visit-report");
  const payload = ev!.payload as Record<string, unknown>;
  expect(Object.keys(payload).sort()).toEqual(["attentionRecordId", "sourceKind"]);
});

test("recording is best-effort: an unknown household logs and does not throw", async () => {
  const errs: string[] = [];
  const original = console.error;
  console.error = (...a: unknown[]) => { errs.push(a.join(" ")); };
  try {
    // The FK refuses; the visit must still stand.
    await expect(raiseSuppressedSendNotice(
      "00000000-0000-7000-8000-0000000000ff", "report is not an array")).resolves.toBeUndefined();
  } finally { console.error = original; }
  expect(errs.join(" ")).toContain("could not record the suppressed-send notice");
});
