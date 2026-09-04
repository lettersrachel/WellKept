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
  revealS3, assertClientPayloadSafe, assertDeclaredClientKeys,
  FORBIDDEN_CLIENT_KEYS,
  CLIENT_PLAYBOOK_FIELD_KEYS, CLIENT_REGISTRY_ENTRY_KEYS,
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

test("stranger mode narrows only: s2 hidden unless marked, s3 out regardless of any marker", () => {
  const fields = [
    F("s1", "florist"),
    F("s2", "candid"),
    { ...F("s2", "allergies", "tree nuts, strict"), strangerVisible: true },
    { ...F("s3", "alarm", "SECRET"), strangerVisible: true }, // a marker can never open the vault
  ];
  const out = filterFields("house_manager", fields, { strangerMode: true });
  assert.deepEqual(out.map((f) => f.name).sort(), ["allergies", "florist"],
    "s1 plus the marked safety exception, nothing else");
  assert.equal(out.find((f) => f.name === "allergies")!.value, "tree nuts, strict",
    "the marked field arrives whole; a hidden allergy is the failure mode the marker exists for");

  // The overlay never widens: a client in stranger mode still gets s1 only,
  // marker or not (the role matrix runs first).
  const clientOut = filterFields("client", fields, { strangerMode: true });
  assert.deepEqual(clientOut.map((f) => f.name), ["florist"]);

  // And OFF means off: without the flag the ordinary projection stands.
  const normal = filterFields("house_manager", fields);
  assert.equal(normal.length, 4);
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

/**
 * G-78 (corrected): the shape assertion's own unit cases. The guard test
 * that derives the registry key set from the schema lives in
 * packages/schema (which is where the table is); these are the branch
 * cases, kept here because this package holds the function and enforces
 * its own coverage.
 *
 * permissions.verified.mjs is DELIBERATELY untouched, and so is its
 * mirror suite. That artifact implements the WK-APP-003 Section 2
 * visibility matrix, which is policy requiring founder sign-off; a
 * payload SHAPE assertion decides nothing about who may read what, so
 * the two-suites-assert-the-same-behaviors contract does not reach it.
 * Said here rather than left as a silent omission.
 */
test("assertDeclaredClientKeys accepts a payload carrying only declared keys", () => {
  const rows = [{ id: "f1", section: 2, name: "Trash day", value: "Tuesday", flag: null, sensitivity: "s1" }];
  assert.equal(assertDeclaredClientKeys(rows, CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"), true);
  // A projection may DROP a declared key; absence is the safe direction.
  assert.equal(assertDeclaredClientKeys([{ id: "f1" }], CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"), true);
  assert.equal(assertDeclaredClientKeys([], CLIENT_REGISTRY_ENTRY_KEYS, "registry entries"), true);
});

test("assertDeclaredClientKeys throws on an undeclared key, naming it and the remedy", () => {
  assert.throws(
    () => assertDeclaredClientKeys(
      [{ id: "f1", sensitivity: "s1", installerPhoneNumber: "555-0100" }],
      CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"),
    /SEVERE: undeclared key "installerPhoneNumber" reached a client payload at playbook fields\[0\]/,
  );
});

test("assertDeclaredClientKeys asserts its own preconditions before reading a row", () => {
  // An empty declared list would accept an empty payload and read as a
  // passing guard; that is the vacuous-coverage shape, refused.
  assert.throws(() => assertDeclaredClientKeys([], [], "no list"), /declared key list is empty/);
  assert.throws(
    () => assertDeclaredClientKeys([], undefined as unknown as string[], "no list"),
    /declared key list is empty/);
  assert.throws(
    () => assertDeclaredClientKeys({} as unknown as unknown[], CLIENT_PLAYBOOK_FIELD_KEYS, "bad payload"),
    /must be an array of rows/);
});

test("assertDeclaredClientKeys refuses a row that is not an object rather than skipping it", () => {
  for (const bad of [null, "a string", ["nested", "array"]]) {
    assert.throws(
      () => assertDeclaredClientKeys([bad], CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"),
      /playbook fields\[0\]: payload row is not an object/);
  }
});


test("Q-5: a forbidden key is refused in a payload, whatever the declared list says", () => {
  // The acknowledgement this exists for: the stage assertion covers ANY
  // client payload rather than relying on today's payloads not carrying
  // one. assertNoAnticipationRows walks the payloads that call it; this
  // covers the declared-list family, which calls a different assertion.
  assert.ok(Object.keys(FORBIDDEN_CLIENT_KEYS).length > 0,
    "the forbidden set is empty; every case below would pass vacuously");
  assert.ok("stage" in FORBIDDEN_CLIENT_KEYS, "stage is not in the forbidden set");

  assert.throws(
    () => assertDeclaredClientKeys([{ id: "f1", stage: "decide" }], CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"),
    /SEVERE: forbidden key "stage" reached a client payload/,
  );
});

test("Q-5: declaring a forbidden key is refused, so the hatch cannot publish one", () => {
  // A declared list is a hatch a person may widen in a reviewed change.
  // The whole point of a forbidden key is that widening is not the
  // available remedy, so the refusal fires on the LIST, before any row.
  assert.throws(
    () => assertDeclaredClientKeys([], [...CLIENT_PLAYBOOK_FIELD_KEYS, "stage"], "playbook fields"),
    /SEVERE: "stage" is declared for playbook fields and may never reach a member/,
  );
  // And it fires on an empty payload too, which is the case a row-level
  // check alone would miss entirely.
  assert.throws(
    () => assertDeclaredClientKeys([{ id: "f1" }], ["id", "stage"], "some future payload"),
    /may never reach a member/,
  );
});

test("Q-5: the forbidden check does not disturb the real client payloads", () => {
  const fields = [{ id: "f1", section: "Household", name: "Front door", value: "blue", flag: null, sensitivity: "s1" }];
  assert.equal(assertDeclaredClientKeys(fields, CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"), true);
  assert.equal(assertDeclaredClientKeys([{ report: ["a", "b", "c"], photoCount: 2 }], ["report", "photoCount"], "client visit report"), true);
});
