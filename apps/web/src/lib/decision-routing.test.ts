import { describe, expect, test } from "vitest";
import { routeByDecisionRights, type RoutingRight } from "./decision-routing";

const rights: RoutingRight[] = [
  { rightKey: "spend_without_asking_per_item_usd", valueCents: 15000, valueText: null },
  { rightKey: "vendor_substitution", valueCents: null, valueText: "approved_substitute_only" },
];

describe("the Decision Rights block as the routing table", () => {
  // The founder's instruction: the null-threshold case is built and
  // proven FIRST, because it is the direction a missing row falls in.
  test("NO RIGHT ON RECORD proposes, and never auto-executes", () => {
    const r = routeByDecisionRights({ rights: [], rightKey: "spend_without_asking_per_item_usd", amountCents: 100 });
    expect(r.outcome).toBe("propose");
    expect(r.why).toContain("no decision right on record");
  });

  test("a right recorded in WORDS proposes, because no mapping from those words has been ruled", () => {
    const r = routeByDecisionRights({ rights, rightKey: "vendor_substitution", amountCents: null });
    expect(r.outcome).toBe("propose");
    expect(r.why).toContain("approved_substitute_only");
  });

  test("an UNKNOWN amount proposes: an unknown amount is not below a ceiling", () => {
    expect(routeByDecisionRights({ rights, rightKey: "spend_without_asking_per_item_usd", amountCents: null }).outcome).toBe("propose");
  });

  test("at or below the ceiling auto-executes, and the boundary is INCLUSIVE", () => {
    expect(routeByDecisionRights({ rights, rightKey: "spend_without_asking_per_item_usd", amountCents: 14999 }).outcome).toBe("auto_execute");
    expect(routeByDecisionRights({ rights, rightKey: "spend_without_asking_per_item_usd", amountCents: 15000 }).outcome).toBe("auto_execute");
  });

  test("one cent above the ceiling proposes", () => {
    expect(routeByDecisionRights({ rights, rightKey: "spend_without_asking_per_item_usd", amountCents: 15001 }).outcome).toBe("propose");
  });

  test("a ceiling of ZERO means ask about everything, and zero is not the unknown", () => {
    const zero: RoutingRight[] = [{ rightKey: "k", valueCents: 0, valueText: null }];
    expect(routeByDecisionRights({ rights: zero, rightKey: "k", amountCents: 0 }).outcome).toBe("auto_execute");
    expect(routeByDecisionRights({ rights: zero, rightKey: "k", amountCents: 1 }).outcome).toBe("propose");
  });

  // The producer note in the module says `blocked` is declared and
  // unreachable, in the same form a migration header states an inert
  // column. This test is that note's assertion: if a producer is added
  // without updating the note, the note stops being true and this test
  // is where it shows.
  test("NOTHING produces `blocked` yet, and that is a build fact rather than an oversight", () => {
    const outcomes = new Set([
      routeByDecisionRights({ rights: [], rightKey: "x", amountCents: null }).outcome,
      routeByDecisionRights({ rights, rightKey: "vendor_substitution", amountCents: 1 }).outcome,
      routeByDecisionRights({ rights, rightKey: "spend_without_asking_per_item_usd", amountCents: 1 }).outcome,
    ]);
    expect(outcomes.has("blocked")).toBe(false);
  });
});
