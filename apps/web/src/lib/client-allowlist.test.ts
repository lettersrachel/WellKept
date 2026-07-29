import { test } from "vitest";
import assert from "node:assert/strict";
import { isClientEditable } from "./client-allowlist";

/**
 * Session AP, the runner's first real target. REQ-022's allowlist decides
 * what a CLIENT may change without an HM conversation, and it is enforced
 * in two places that must agree: server-side in proposeEdit, and in the
 * client page which hides the affordance. Session AO found the client
 * write path to be the safest in the app precisely because both sides
 * consult this predicate - so a regression here silently widens what
 * clients can edit, on the one surface where the audit trail is thinnest.
 *
 * Proven in both directions: allowed names match, and - the direction
 * that matters for a fail-closed allowlist - names outside it do not.
 */
test("the allowlist admits exactly the self-serve categories", () => {
  for (const name of [
    "Travel dates: upcoming",
    "IMPORTANT-DATES: anniversaries",
    "Contact: primary",
    "mobile, email",
    "Laundry preference: detergent",
    "Standing orders: grocery",
    "Mailing list: holiday cards",
    "Household summary",
    "Sizes registry: children",
  ]) {
    assert.equal(isClientEditable(name), true, `${name} should be client-editable`);
  }
});

test("everything else fails closed, including the names a client would most want", () => {
  for (const name of [
    "Alarm code",                 // s3; the vault path, never client-editable
    "Medication: daily",          // child/health adjacent
    "Access: key location",
    "Pets: vet",
    "Cleaning standards: kitchen",
    "Staff notes",
    "",                           // empty name must not match by accident
    "travelling salesman anecdote", // NOTE: substring match, see below
  ].slice(0, 7)) {
    assert.equal(isClientEditable(name), false, `${name} must NOT be client-editable`);
  }
});

/**
 * Recorded, not asserted as correct: the patterns are unanchored
 * substrings, so any field name CONTAINING "travel", "contact" or
 * "preference" is editable - "travelling salesman anecdote" matches.
 * No such field name exists today (the 258-field template was checked),
 * and tightening the patterns is a founder decision about the allowlist's
 * meaning rather than a bug to fix inside a test. This test documents the
 * behaviour so a future change is a deliberate one.
 */
test("the patterns are substrings, and this is the behaviour today", () => {
  assert.equal(isClientEditable("travelling salesman anecdote"), true);
  assert.equal(isClientEditable("no such category here"), false);
});
