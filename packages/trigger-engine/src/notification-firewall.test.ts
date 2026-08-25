import { test } from "vitest";
import assert from "node:assert/strict";
import { ATTENTION_DESTINATIONS, destinationFor } from "./notification-firewall.ts";

/**
 * WK-DEV-009 section 6, both directions: the deterministic mapping
 * routes each audience where the brief says, and the CONSERVATIVE
 * property holds exhaustively: no input the system can produce ever
 * routes to an interrupt destination, because which sources justify an
 * interrupt is the founder's safety rule set, not a default.
 */
test("hom noticing reaches the previsit brief; corporate and founder noticing reach the corporate queue", () => {
  assert.equal(destinationFor({ audience: "hom" }), "previsit_brief");
  assert.equal(destinationFor({ audience: "corporate" }), "corporate_queue");
  assert.equal(destinationFor({ audience: "founder" }), "corporate_queue");
});

test("the conservative property: nothing ever maps to an interrupt destination in v1", () => {
  for (const audience of ["hom", "corporate", "founder", "anything-unknown"]) {
    const d = destinationFor({ audience });
    assert.ok(!["immediate_interrupt", "next_transition_prompt"].includes(d),
      `audience ${audience} must never interrupt by default (got ${d})`);
    assert.ok((ATTENTION_DESTINATIONS as readonly string[]).includes(d), "always a known destination");
  }
});
