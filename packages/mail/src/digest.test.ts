import { test } from "vitest";
import assert from "node:assert/strict";
import { composeFleetDigest, type DigestHousehold } from "./index";

const H = (over: Partial<DigestHousehold> = {}): DigestHousehold => ({
  name: "Fernbrook", tier: "family_ops", statusTag: "STEADY",
  unconfirmed: 226, total: 258, pendingEdits: 0, upcomingPrompts: 4, lastStranger: "PASS 06-11",
  ...over,
});

test("subject and banner flag households that need eyes", () => {
  const d = composeFleetDigest("Rachel", [H(), H({ name: "Chen-Williams", statusTag: "WATCH" })], "Jul 20");
  assert.match(d.subject, /1 need attention/);
  assert.ok(d.html.includes("1 household(s) need eyes this week: Chen-Williams"));
  assert.ok(d.html.includes("Fernbrook") && d.html.includes("Chen-Williams"));
});

test("all-steady fleet reads calm", () => {
  const d = composeFleetDigest(null, [H(), H({ name: "Two" })], "Jul 20");
  assert.match(d.subject, /all steady/);
  assert.ok(d.html.includes("No households flagged"));
});

test("LIFE-EVENT counts as needing eyes; confirmed math renders", () => {
  const d = composeFleetDigest("R", [H({ statusTag: "LIFE-EVENT", unconfirmed: 8, total: 258 })], "Jul 20");
  assert.match(d.subject, /1 need attention/);
  assert.ok(d.html.includes("250/258 confirmed"));
});
