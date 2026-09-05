import { describe, expect, test } from "vitest";
import { displayState, isHandled, m25, unmetClauses, HANDLED_CLAUSES } from "./commitment-ledger";

const open = {
  accountableOwner: null, memberDecisionQuestion: null, memberDecisionResolvedAt: null,
  externalCompletionOn: null, followUpAt: null, verifiedAt: null,
  verificationPendingReason: null, closedAt: null,
};
const handled = { ...open, accountableOwner: "u1", verifiedAt: new Date("2026-09-01") };

describe("the Handled invariant, computed", () => {
  test("a bare open item fails two clauses, named in the invariant's order", () => {
    expect(unmetClauses(open)).toEqual([HANDLED_CLAUSES[0], HANDLED_CLAUSES[3]]);
    expect(isHandled(open)).toBe(false);
  });

  test("each clause fails on its own, and the other three do not fire", () => {
    expect(unmetClauses({ ...handled, accountableOwner: null })).toEqual([HANDLED_CLAUSES[0]]);
    expect(unmetClauses({ ...handled, memberDecisionQuestion: "which vendor?" })).toEqual([HANDLED_CLAUSES[1]]);
    expect(unmetClauses({ ...handled, externalCompletionOn: "the plumber returns" })).toEqual([HANDLED_CLAUSES[2]]);
    expect(unmetClauses({ ...handled, verifiedAt: null })).toEqual([HANDLED_CLAUSES[3]]);
  });

  test("a resolved member decision and a follow-up satisfy their clauses", () => {
    expect(isHandled({ ...handled, memberDecisionQuestion: "which?", memberDecisionResolvedAt: new Date() })).toBe(true);
    expect(isHandled({ ...handled, externalCompletionOn: "the plumber returns", followUpAt: new Date() })).toBe(true);
  });

  test("verification EXPLICITLY PENDING satisfies clause four, which is the point of the wording", () => {
    expect(isHandled({ ...handled, verifiedAt: null, verificationPendingReason: "invoice not yet received" })).toBe(true);
  });

  test("activity is never closure: nothing here can be satisfied by an event", () => {
    // The clause columns are all facts about STATE. There is no column a
    // "vendor contacted" event could set, which is the invariant's whole
    // posture expressed as a test rather than as a comment.
    expect(Object.keys(open)).not.toContain("vendorContacted");
    expect(Object.keys(open)).not.toContain("emailSent");
  });
});

describe("the four display states are a total function", () => {
  test("closed wins over everything, including an unresolved decision", () => {
    expect(displayState({ ...handled, closedAt: new Date() })).toBe("done or changed");
  });
  test("an unresolved member decision reads needs you", () => {
    expect(displayState({ ...handled, memberDecisionQuestion: "which?" })).toBe("needs you");
  });
  test("the invariant met reads handled", () => {
    expect(displayState(handled)).toBe("handled");
  });
  test("open and not yet handled reads approaching", () => {
    expect(displayState(open)).toBe("approaching");
  });
  test("every shape lands in one of the four, including the one the temporal reading drops", () => {
    const states = new Set([open, handled, { ...open, closedAt: new Date() },
      { ...handled, memberDecisionQuestion: "q" }].map(displayState));
    expect(states).toEqual(new Set(["approaching", "handled", "done or changed", "needs you"]));
  });
});

describe("M-25 counts what was ASKED, in a half-open window", () => {
  const week = { from: new Date("2026-09-07T00:00:00Z"), to: new Date("2026-09-14T00:00:00Z") };
  test("counts asks inside the window and ignores unasked items", () => {
    expect(m25([
      { memberDecisionAskedAt: new Date("2026-09-07T00:00:00Z") },
      { memberDecisionAskedAt: new Date("2026-09-13T23:59:59Z") },
      { memberDecisionAskedAt: null },
    ], week.from, week.to)).toBe(2);
  });
  test("the window is half-open, so the next week's first instant belongs to the next week", () => {
    expect(m25([{ memberDecisionAskedAt: new Date("2026-09-14T00:00:00Z") }], week.from, week.to)).toBe(0);
  });
  test("a quiet week is zero rather than absent, which is the number the spec wants to fall", () => {
    expect(m25([], week.from, week.to)).toBe(0);
  });
});
