import { test } from "vitest";
import assert from "node:assert/strict";
import { applianceSearchTerm, parseRecalls, recallNotificationKind } from "./cpsc.ts";

test("REQ-047: the model is the search term when captured; the label otherwise; short terms search nothing", () => {
  assert.equal(applianceSearchTerm({ id: "1", label: "Washer", detail: { model: "LG WM4000HWA" } }), "LG WM4000HWA");
  assert.equal(applianceSearchTerm({ id: "2", label: "Water heater", detail: { model: "AB" } }), "Water heater");
  assert.equal(applianceSearchTerm({ id: "3", label: "Water heater", detail: null }), "Water heater");
  assert.equal(applianceSearchTerm({ id: "4", label: "Fan", detail: null }), null);
});

test("REQ-047: a malformed feed response becomes zero matches, never a crash or a notification", () => {
  assert.deepEqual(parseRecalls(null), []);
  assert.deepEqual(parseRecalls("error page"), []);
  assert.deepEqual(parseRecalls([{ RecallID: "not-a-number", Title: "x", URL: "y" }]), []);
  assert.deepEqual(parseRecalls([null, 42]), []);
  const good = parseRecalls([
    { RecallID: 9001, Title: "Water heaters recalled for fire hazard", URL: "https://cpsc.gov/r/9001", RecallDate: "2026-05-01", Extra: true },
  ]);
  assert.equal(good.length, 1);
  assert.equal(good[0]!.RecallID, 9001);
});

test("REQ-047: the dedupe key is stable per recall, so a household is notified once, ever", () => {
  assert.equal(recallNotificationKind(9001), "cpsc_recall:9001");
  assert.equal(recallNotificationKind(9001), recallNotificationKind(9001));
});
