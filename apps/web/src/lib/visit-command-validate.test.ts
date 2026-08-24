import { test } from "vitest";
import assert from "node:assert/strict";
import {
  validateFlagCreate, validateFlagLook, validateFlagClose,
  validateDeferralResolve, validatePausedDecisionResolve, validatePromptOutcome,
} from "./visit-command-validate";

/**
 * Input spine build 1: the validators mirror the server actions' rules,
 * so each rule is proven in both directions here - the action-side rules
 * already carry their own proofs, and a divergence between the two would
 * mean a capture is held to different standards by transport.
 */
const goodFlag = {
  subject: "grout", location: "guest bathroom",
  concern: "cracking along the rear shower wall", revisitCondition: "after the next deep clean",
};

test("flag.create: accepts the W-5 shape, refuses each rule by name", () => {
  const ok = validateFlagCreate(goodFlag);
  assert.ok(ok.ok);
  assert.equal(ok.clean.subject, "grout");
  assert.equal(ok.clean.revisitDate, null);

  assert.deepEqual(validateFlagCreate({ ...goodFlag, subject: "g" }), { ok: false, reason: "bad_input:text" });
  assert.deepEqual(validateFlagCreate({ ...goodFlag, concern: "abc" }), { ok: false, reason: "bad_input:text" });
  assert.deepEqual(validateFlagCreate({ ...goodFlag, concern: "cracking \u2014 badly" }), { ok: false, reason: "bad_input:em_dash" });
  assert.deepEqual(validateFlagCreate({ ...goodFlag, revisitCondition: "" }), { ok: false, reason: "bad_input:no_revisit_trigger" });
  assert.deepEqual(validateFlagCreate({ ...goodFlag, registryEntryId: "not-a-uuid" }), { ok: false, reason: "bad_input:registry_entry_id" });
  const dated = validateFlagCreate({ ...goodFlag, revisitCondition: "", revisitDate: "2026-10-01" });
  assert.ok(dated.ok && dated.clean.revisitDate === "2026-10-01");
});

test("flag.look: value bounds and flag id, both directions", () => {
  const ok = validateFlagLook({ flagId: "1b671a64-40d5-491e-99b0-da01ff1f3341", value: "4", note: "" });
  assert.ok(ok.ok && ok.clean.value === 4 && ok.clean.note === null);
  assert.equal(validateFlagLook({ flagId: "nope", value: "4" }).ok, false);
  assert.equal(validateFlagLook({ flagId: "1b671a64-40d5-491e-99b0-da01ff1f3341", value: "0" }).ok, false);
  assert.equal(validateFlagLook({ flagId: "1b671a64-40d5-491e-99b0-da01ff1f3341", value: "6" }).ok, false);
  assert.equal(validateFlagLook({ flagId: "1b671a64-40d5-491e-99b0-da01ff1f3341", value: "12" }).ok, false);
});

test("flag.close: reasoned close only, no em dash", () => {
  assert.ok(validateFlagClose({ flagId: "1b671a64-40d5-491e-99b0-da01ff1f3341", closeReason: "regrouted and sealed" }).ok);
  assert.equal(validateFlagClose({ flagId: "1b671a64-40d5-491e-99b0-da01ff1f3341", closeReason: "ok" }).ok, false);
  assert.deepEqual(validateFlagClose({ flagId: "1b671a64-40d5-491e-99b0-da01ff1f3341", closeReason: "done \u2014 fixed" }),
    { ok: false, reason: "bad_input:em_dash" });
});

test("resolutions: whole vocabulary accepted, anything else refused", () => {
  for (const r of ["done", "no_longer_needed", "superseded"]) {
    assert.ok(validateDeferralResolve({ deferralId: "1b671a64-40d5-491e-99b0-da01ff1f3341", resolution: r }).ok);
    assert.ok(validatePausedDecisionResolve({ pausedDecisionId: "1b671a64-40d5-491e-99b0-da01ff1f3341", resolution: r }).ok);
  }
  assert.equal(validateDeferralResolve({ deferralId: "1b671a64-40d5-491e-99b0-da01ff1f3341", resolution: "deleted" }).ok, false);
  assert.equal(validatePausedDecisionResolve({ pausedDecisionId: "bad", resolution: "done" }).ok, false);
});

test("prompt.outcome: session A semantics survive the transport", () => {
  const id = "1b671a64-40d5-491e-99b0-da01ff1f3341";
  const acted = validatePromptOutcome({ promptId: id, outcome: "acted", wasNews: "true" });
  assert.ok(acted.ok && acted.clean.wasNews === true && acted.clean.dismissReason === null);
  // was_news on a non-acted outcome drops to null, never coerced
  const dismissed = validatePromptOutcome({ promptId: id, outcome: "dismissed", wasNews: "true", dismissReason: "bad_timing" });
  assert.ok(dismissed.ok && dismissed.clean.wasNews === null && dismissed.clean.dismissReason === "bad_timing");
  const na = validatePromptOutcome({ promptId: id, outcome: "not_applicable", dismissReason: "wrong" });
  assert.ok(na.ok && na.clean.dismissReason === null);
  assert.equal(validatePromptOutcome({ promptId: id, outcome: "shrugged" }).ok, false);
});
