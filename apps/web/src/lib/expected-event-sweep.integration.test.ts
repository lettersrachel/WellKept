import { test, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  household, authUser, expectedEvent, decisionRight, attentionRecord, decisionRecord, eventOutbox,
} from "@wellkept/schema";
import { sweepExpectedEvents } from "@wellkept/trigger-engine";
import { db } from "./db";

/**
 * Q-12b-1 on the REAL database, against the queue row's own acceptance
 * criterion: "Given an expected event's window passes with no matching
 * signal, when the sweep runs, then a `missing_expected` result opens
 * with candidate decisions routed by materiality, and the member is
 * never asked to check."
 *
 * The last clause is the one worth testing hardest, because it is the
 * clause a future change could break silently: the test asserts that the
 * sweep wrote NOTHING into attention_record (which reaches the previsit
 * brief) and nothing into decision_record. Shadow means those tables
 * stay empty, and empty is only evidence if something checks it.
 */
const H = randomUUID();
const U = `expect-test-${H.slice(0, 8)}`;
const PAST = randomUUID();       // window passed, unclassified materiality
const PAST_MONEY = randomUUID(); // window passed, money_legal under the ceiling
const FUTURE = randomUUID();     // still inside its window

beforeAll(async () => {
  await db.insert(household).values({ id: H, name: `Expect Test ${H.slice(0, 8)}`, tier: "essential", isFixture: true });
  await db.insert(authUser).values({ id: U, email: `${U}@test.invalid` });
  await db.insert(decisionRight).values({
    id: randomUUID(), householdId: H, rightKey: "routine_supply_spend",
    valueCents: 15000, valueText: null, materiality: "money_legal",
    status: "recommended", authority: "test fixture",
  });
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  await db.insert(expectedEvent).values([
    {
      id: PAST, householdId: H, pattern: "vendor_visit_without_invoice_or_report",
      expectation: "invoice from the gutter vendor", expectedBy: yesterday,
      materiality: null, amountCents: null, decisionRightKey: null, recordedBy: U,
    },
    {
      id: PAST_MONEY, householdId: H, pattern: "return_shipped_without_refund",
      expectation: "refund for the returned filter", expectedBy: yesterday,
      materiality: "money_legal", amountCents: 4200,
      decisionRightKey: "routine_supply_spend", recordedBy: U,
    },
    {
      id: FUTURE, householdId: H, pattern: "promised_estimate_overdue",
      expectation: "estimate for the fence repair", expectedBy: tomorrow,
      materiality: "convenience", amountCents: null, decisionRightKey: null, recordedBy: U,
    },
  ]);
});

afterAll(async () => {
  await db.delete(eventOutbox).where(eq(eventOutbox.householdId, H));
  await db.delete(expectedEvent).where(eq(expectedEvent.householdId, H));
  await db.delete(decisionRight).where(eq(decisionRight.householdId, H));
  await db.delete(household).where(eq(household.id, H));
  await db.delete(authUser).where(eq(authUser.id, U));
});

test("a passed window with no match opens missing_expected with a routed candidate", async () => {
  const first = await sweepExpectedEvents(db as never);
  assert.equal(first.missed, 2, "both passed windows reconcile, the future one does not");

  const [unclassified] = await db.select().from(expectedEvent).where(eq(expectedEvent.id, PAST));
  assert.equal(unclassified!.reconciliationStatus, "missing_expected");
  assert.ok(unclassified!.reconciledAt, "the result is whole: a status carries its time");
  assert.match(unclassified!.candidateDecision!, /Expected and not seen: invoice from the gutter vendor/);
  // An unclassified miss PROPOSES. This is the direction that matters:
  // treating a NULL materiality as permissive would let a judgment
  // nobody made take an action.
  assert.equal(unclassified!.candidateRouting, "propose");
  assert.match(unclassified!.candidateRoutingWhy!, /no materiality/);

  // Routed BY MATERIALITY: the money_legal right's ceiling is what
  // decides, and the right was never named on the row. The mapping came
  // from decision_right.materiality, which is data on record.
  const [money] = await db.select().from(expectedEvent).where(eq(expectedEvent.id, PAST_MONEY));
  assert.equal(money!.reconciliationStatus, "missing_expected");
  assert.equal(money!.candidateRouting, "auto_execute");
  assert.match(money!.candidateRoutingWhy!, /at or below every money_legal ceiling/);

  // Still inside its window: untouched, and NULL is the true statement.
  const [future] = await db.select().from(expectedEvent).where(eq(expectedEvent.id, FUTURE));
  assert.equal(future!.reconciliationStatus, null);
  assert.equal(future!.candidateDecision, null);
});

test("THE MEMBER IS NEVER MADE TO CHECK: the sweep writes into no surface that reaches anyone", async () => {
  // Asserted against the tables rather than against the code, because
  // "shadow" is a claim about what was written and not about intent.
  const attention = await db.select().from(attentionRecord).where(eq(attentionRecord.householdId, H));
  assert.equal(attention.length, 0, "an attention record would reach the previsit brief, which shadow forbids");
  const decisions = await db.select().from(decisionRecord).where(eq(decisionRecord.householdId, H));
  assert.equal(decisions.length, 0, "a decision record needs a routed_by person, and a sweep has none");
});

test("the sweep is idempotent: a second run claims nothing and emits nothing", async () => {
  const before = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  const second = await sweepExpectedEvents(db as never);
  assert.equal(second.missed, 0, "the NULL status is the claim-once mechanism");
  const after = await db.select().from(eventOutbox).where(eq(eventOutbox.householdId, H));
  assert.equal(after.length, before.length, "no second event for a row already reconciled");
  assert.equal(before.filter((e) => e.kind === "expected_event.missing").length, 2);
});

test("matched is never written by this sweep, and that is a build fact rather than an oversight", async () => {
  const rows = await db.select().from(expectedEvent).where(eq(expectedEvent.householdId, H));
  assert.equal(rows.filter((r) => r.reconciliationStatus === "matched").length, 0);
  // Nothing in this tree emits a signal that MATCHES an expectation;
  // that is Q-12b-2's changeset work. The column and its composite FK
  // ship so the match lands without a migration.
  assert.equal(rows.filter((r) => r.matchedEventId !== null).length, 0);
});
