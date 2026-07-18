/**
 * permissions.test.ts : the required suite for the permission core.
 * WK-DEV-004: this package holds 100% branch coverage or the build fails.
 * Vitest port of permissions.verified.test.mjs (the pre-repo node:test
 * mirror); the two suites must assert the same behaviors.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  ROLES, SENSITIVITIES, readDecision, filterFields, filterFieldsForRole,
  revealS3, assertClientPayloadSafe,
  type FieldRecord, type Decision,
} from "./index";

const F = (sens: string, name = "field", value = "v"): FieldRecord =>
  ({ id: name, name, sensitivity: sens, value });

// ---- The full matrix, every role x every sensitivity (WK-APP-003 S2) ----
const MATRIX: Record<string, Record<string, Decision>> = {
  client: { s1: "visible", s2: "denied", s3: "denied" },
  house_manager: { s1: "visible", s2: "visible", s3: "reveal_only" },
  backup_hm: { s1: "visible", s2: "visible", s3: "reveal_only" },
  corporate_ops: { s1: "visible", s2: "visible", s3: "visible" },
  corporate_admin: { s1: "visible", s2: "visible", s3: "visible" },
  cfo_readonly: { s1: "visible", s2: "visible", s3: "visible" },
};

test("the matrix, exhaustively: every role x sensitivity", () => {
  for (const role of ROLES) {
    for (const sens of SENSITIVITIES) {
      assert.equal(readDecision(role, sens), MATRIX[role]![sens],
        `${role} x ${sens}`);
    }
  }
});

test("fail closed: unknown role, unknown sensitivity, missing args", () => {
  assert.equal(readDecision("intruder", "s1"), "denied");
  assert.equal(readDecision("client", "s9"), "denied");
  assert.equal(readDecision(undefined as unknown as string, undefined as unknown as string), "denied");
  assert.equal(readDecision("house_manager", "S1"), "denied"); // case is not forgiven
});

test("NDA mode (REQ-006): backup HM loses s3 reveal; primary keeps it; corporate unaffected", () => {
  assert.equal(readDecision("backup_hm", "s3", { ndaMode: true }), "denied");
  assert.equal(readDecision("house_manager", "s3", { ndaMode: true }), "reveal_only");
  assert.equal(readDecision("corporate_admin", "s3", { ndaMode: true }), "visible");
  assert.equal(readDecision("backup_hm", "s2", { ndaMode: true }), "visible");
});

test("filterFields: client gets s1 only, nothing else even as placeholder", () => {
  const fields = [F("s1", "florist"), F("s2", "candid"), F("s3", "alarm")];
  const out = filterFields("client", fields);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.name, "florist");
  assert.ok(!out.some((f) => f.sensitivity !== "s1"));
});

test("filterFields: HM gets s1+s2 inline, s3 as vault placeholder with null value", () => {
  const fields = [F("s1", "florist"), F("s2", "candid"), F("s3", "alarm", "SECRET")];
  const out = filterFields("house_manager", fields);
  assert.equal(out.length, 3);
  const alarm = out.find((f) => f.name === "alarm")!;
  assert.equal(alarm.value, null);
  assert.equal(alarm.vault, true);
  assert.equal(fields.find((f) => f.name === "alarm")!.value, "SECRET",
    "input must never be mutated");
});

test("filterFields: corporate gets everything inline", () => {
  const fields = [F("s1"), F("s2", "b"), F("s3", "c", "CODE")];
  const out = filterFields("cfo_readonly", fields);
  assert.equal(out.length, 3);
  assert.equal(out.find((f) => f.name === "c")!.value, "CODE");
});

test("filterFields: non-array and malformed fields fail closed", () => {
  assert.deepEqual(filterFields("client", null as unknown as FieldRecord[]), []);
  assert.deepEqual(filterFields("client", "nope" as unknown as FieldRecord[]), []);
  const out = filterFields("house_manager", [null, {}, F("s1", "ok")] as unknown as FieldRecord[]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.name, "ok");
});

test("filterFieldsForRole is the same function (DEV-004 S3 canonical name)", () => {
  assert.equal(filterFieldsForRole, filterFields);
});

test("revealS3: HM reveal returns value, 60s expiry, and writes the full audit entry", () => {
  const log: object[] = [];
  const session = { role: "house_manager", user: "Jordan", householdId: "fernbrook" };
  const r = revealS3(session, F("s3", "Alarm code", "0000"), (e) => log.push(e),
    { now: () => "2026-07-18T12:00:00Z" });
  assert.equal(r.ok, true);
  assert.equal((r as { ok: true; value: unknown }).value, "0000");
  assert.equal((r as { ok: true; expiresInSeconds: number }).expiresInSeconds, 60);
  assert.equal(log.length, 1);
  assert.deepEqual(log[0], {
    user: "Jordan", role: "house_manager", householdId: "fernbrook",
    field: "Alarm code", fieldId: "Alarm code", at: "2026-07-18T12:00:00Z",
    kind: "in_context_reveal",
  });
});

test("revealS3: corporate view logs as corporate_view", () => {
  const log: { kind: string }[] = [];
  const r = revealS3({ role: "corporate_admin", user: "Rachel", householdId: "h" },
    F("s3", "Gate code", "1111"), (e) => log.push(e));
  assert.equal(r.ok, true);
  assert.equal(log[0]!.kind, "corporate_view");
});

test("revealS3: no audit sink means no reveal; the log is not optional", () => {
  const r = revealS3({ role: "house_manager", user: "J", householdId: "h" },
    F("s3", "x", "v"), undefined);
  assert.equal(r.ok, false);
  assert.match((r as { ok: false; reason: string }).reason, /audit/);
});

test("revealS3: client denied, incomplete session denied, non-vault field refused", () => {
  const sink = () => { throw new Error("must not be called"); };
  assert.equal(revealS3({ role: "client", user: "L", householdId: "h" }, F("s3"), sink).ok, false);
  assert.equal(revealS3(null, F("s3"), sink).ok, false);
  assert.equal(revealS3({ role: "house_manager", user: "J", householdId: "" }, F("s3"), sink).ok, false);
  assert.equal(revealS3({ role: "house_manager", user: "J", householdId: "h" }, F("s2"), sink).ok, false);
  assert.equal(revealS3({ role: "house_manager", user: "J", householdId: "h" }, null, sink).ok, false);
});

test("revealS3: NDA mode denies backup HM at the reveal, not just the list", () => {
  const log: object[] = [];
  const r = revealS3({ role: "backup_hm", user: "Devon", householdId: "h" },
    F("s3", "x", "v"), (e) => log.push(e), { ndaMode: true });
  assert.equal(r.ok, false);
  assert.equal((r as { ok: false; reason: string }).reason, "role denied");
  assert.equal(log.length, 0);
});

test("payload test (US-05): clean client payload passes", () => {
  const payload = filterFields("client", [F("s1", "a"), F("s2", "b"), F("s3", "c")]);
  assert.equal(assertClientPayloadSafe(payload), true);
});

test("payload test: an s2 leak throws SEVERE", () => {
  assert.throws(() => assertClientPayloadSafe([F("s1"), F("s2", "leak")]), /SEVERE.*s2/);
});

test("payload test: an s3 leak throws SEVERE", () => {
  assert.throws(() => assertClientPayloadSafe([F("s3", "alarm")]), /SEVERE.*s3/);
});

test("payload test: unknown sensitivity and non-array both throw", () => {
  assert.throws(() => assertClientPayloadSafe([{ name: "x", sensitivity: "s7" }]), /unknown/);
  assert.throws(() => assertClientPayloadSafe([{ name: "x" }]), /unknown/); // sensitivity absent entirely
  assert.throws(() => assertClientPayloadSafe("nope" as unknown as FieldRecord[]), /array/);
});

test("integration: the real 258-field seed filters correctly for every role", async () => {
  const { readFile } = await import("node:fs/promises");
  const seed = JSON.parse(
    await readFile(new URL("../../../tooling/seed/fernbrook_template_seed.json", import.meta.url), "utf8"),
  ) as { fields: FieldRecord[] };
  const clientView = filterFields("client", seed.fields);
  assert.equal(assertClientPayloadSafe(clientView), true);
  const hmView = filterFields("house_manager", seed.fields);
  const corpView = filterFields("corporate_admin", seed.fields);
  const s3Count = seed.fields.filter((f) => f.sensitivity === "s3").length;
  const s2Count = seed.fields.filter((f) => f.sensitivity === "s2").length;
  assert.equal(clientView.length, seed.fields.length - s2Count - s3Count);
  assert.equal(hmView.length, seed.fields.length);
  assert.equal(hmView.filter((f) => f.vault).length, s3Count);
  assert.equal(corpView.length, seed.fields.length);
  assert.ok(corpView.every((f) => f.value !== null || f.sensitivity !== "s3" || f.value === ""));
});
