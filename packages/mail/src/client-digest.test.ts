import { test } from "vitest";
import assert from "node:assert/strict";
import { composeClientWeeklyDigest } from "./index";

/**
 * Launch scope 24.2: the client weekly digest carries only what the
 * household may see, and an empty week composes nothing. The input shape
 * cannot carry a staff name or an hour count; these tests hold the
 * composition to the projection rules the client card already follows.
 */
const week = {
  householdName: "Fernbrook",
  weekOf: "Aug 21",
  visits: [{ report: ["Kitchen reset and linens rotated.", "The grout note is on our list.", "Coffee stocked for the week."], photoCount: 2 }],
  takenCareOf: [{ noticed: "gutter joint over the porch" }],
  plannedForLater: [{ noticed: "grout in the guest bath", planned: "after the next deep clean" }],
};

test("a full week renders the three sentences, both deferral lists, and nothing internal", () => {
  const out = composeClientWeeklyDigest(week);
  assert.ok(out);
  assert.equal(out.subject, "This week at Fernbrook");
  for (const s of week.visits[0]!.report) assert.ok(out.html.includes(s));
  assert.ok(out.html.includes("2 photos from this visit"));
  assert.ok(out.html.includes("Since taken care of"));
  assert.ok(out.html.includes("gutter joint over the porch"));
  assert.ok(out.html.includes("Noticed, and planned for later"));
  assert.ok(out.html.includes("after the next deep clean"));
  // The D7 wall and the projection rules, asserted on the output:
  for (const barred of ["hour", "minute", "House Manager", "HOM", "utilization", "caseload"]) {
    assert.ok(!out.html.includes(barred), `client digest must never carry "${barred}"`);
  }
  assert.ok(!out.html.includes("\u2014"), "no em dashes in client copy");
});

test("an empty week composes nothing at all", () => {
  assert.equal(composeClientWeeklyDigest({ householdName: "Fernbrook", weekOf: "Aug 21", visits: [], takenCareOf: [], plannedForLater: [] }), null);
});

test("a quiet week with only an open deferral still renders the planned list alone", () => {
  const out = composeClientWeeklyDigest({ ...week, visits: [], takenCareOf: [] });
  assert.ok(out);
  assert.ok(!out.html.includes("Since taken care of"));
  assert.ok(out.html.includes("Noticed, and planned for later"));
});
