import { test } from "vitest";
import assert from "node:assert";
import { getTableColumns } from "drizzle-orm";
import {
  assertDeclaredClientKeys,
  CLIENT_PLAYBOOK_FIELD_KEYS,
  CLIENT_REGISTRY_ENTRY_KEYS,
} from "@wellkept/permissions";
import { registryEntry } from "./tables.js";

/**
 * The seventeenth guard (G-78, corrected). Every other payload guard reads
 * either row sensitivity or a known-bad signature, so all of them are blind
 * to a column that did not exist when they were written. This one reads the
 * KEY SET of what reaches a member and refuses anything undeclared.
 *
 * WHAT THIS GUARD DOES NOT COVER, stated beside it because a guard read
 * without its residue is read as wider than it is:
 *
 *  - **A staff-only fact typed into a correctly client-visible column.**
 *    `playbook_field.value` is gated by ROW sensitivity; an s1 field is
 *    client-visible by design, so a HOM typing an internal note into one
 *    publishes it. This guard sees a permitted key holding a string. So
 *    does every other mechanism in the system. Same class as the copy
 *    guard's free text, and like it, there is no mechanical answer.
 *  - **The inside of a jsonb column.** `registry_entry.detail` is one
 *    permitted key; its contents are never read here.
 *  - **A value that should have been nulled.** The declared list governs
 *    key PRESENCE, not content. The five working-note columns
 *    `getRegistries` nulls for a client stay a separate mechanism.
 *
 * PRECONDITIONS (widened G-72): every case below rests on the assertion
 * being present and on the column derivation returning a real set. Both are
 * asserted first, because a missing export and a passing guard look
 * identical from a green run.
 *
 * NO DATABASE IS INVOLVED, said plainly so nobody reads a green run here as
 * evidence about one: the inputs are the drizzle table object and literal
 * payloads built the way the page builds them.
 */

const REGISTRY_COLUMN_FLOOR = 20;

/**
 * Columns of `registry_entry` deliberately kept OUT of the client payload's
 * declared key list, each with a written reason. Empty today: the client
 * projection is a spread, so it carries every column. An entry here means a
 * future projection stopped carrying one.
 */
const REGISTRY_KEYS_EXCLUDED_FROM_CLIENT_PAYLOAD: Record<string, string> = {};

function actualRegistryColumns(): string[] {
  return Object.keys(getTableColumns(registryEntry)).sort();
}

test("preconditions: the assertion exists and the column derivation is not vacuous", () => {
  assert.equal(typeof assertDeclaredClientKeys, "function",
    "assertDeclaredClientKeys is not exported from @wellkept/permissions; every case below would be meaningless");
  const cols = actualRegistryColumns();
  assert.ok(cols.length >= REGISTRY_COLUMN_FLOOR,
    `registry_entry column derivation returned ${cols.length} columns, below the floor of ${REGISTRY_COLUMN_FLOOR}. ` +
    "A broken derivation returns a small set and passes every comparison vacuously.");
  assert.ok(CLIENT_REGISTRY_ENTRY_KEYS.length > 0 && CLIENT_PLAYBOOK_FIELD_KEYS.length > 0,
    "a declared key list is empty; the guard would check nothing");
});

test("an empty declared list is refused rather than treated as a passing guard", () => {
  assert.throws(() => assertDeclaredClientKeys([], [], "empty list"),
    /declared key list is empty/);
});

test("the declared registry list matches the table, or the difference is written down", () => {
  const actual = actualRegistryColumns();
  const declared: string[] = [...CLIENT_REGISTRY_ENTRY_KEYS].sort();

  const phantom = declared.filter((k) => !actual.includes(k));
  assert.deepEqual(phantom, [],
    `declared client keys that are not columns of registry_entry: ${phantom.join(", ")}`);

  const undeclared = actual.filter(
    (k) => !declared.includes(k) && !(k in REGISTRY_KEYS_EXCLUDED_FROM_CLIENT_PAYLOAD));
  assert.deepEqual(undeclared, [],
    `registry_entry columns reaching the client payload with no declaration: ${undeclared.join(", ")}. ` +
    "Decide whether a member may see each one, then add it to CLIENT_REGISTRY_ENTRY_KEYS " +
    "or to the written exclusions in this file.");
});

/**
 * The two blessed projections, built HERE the way the page builds them,
 * because the whole finding is that their syntax is opposite and a rule
 * that accepts one can accept everything.
 */
function seededRegistryRow(): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const c of actualRegistryColumns()) row[c] = null;
  row.id = "00000000-0000-7000-8000-000000000001";
  row.label = "Water heater";
  row.sensitivity = "s1";
  return row;
}

/** The page's registry shape: SPREAD, then null the working notes. */
function projectRegistryBySpread(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    ...r,
    derivationSource: null, derivedYear: null, installConfidence: null,
    photoPassAt: null, askPassAt: null,
  }));
}

/** The page's field shape: an ALLOW-LIST LITERAL, key by key. */
function projectFieldsByLiteral(rows: Record<string, unknown>[]) {
  return rows.map((f) => ({
    id: f.id, section: f.section, name: f.name, value: f.value,
    flag: f.flag, sensitivity: f.sensitivity,
  }));
}

test("GREEN: both blessed projections pass unchanged, despite opposite syntax", () => {
  const spread = projectRegistryBySpread([seededRegistryRow()]);
  assert.equal(assertDeclaredClientKeys(spread, CLIENT_REGISTRY_ENTRY_KEYS, "registry entries"), true);

  const literal = projectFieldsByLiteral([{
    id: "f1", section: 2, name: "Trash day", value: "Tuesday",
    flag: null, sensitivity: "s1",
    // internal columns a full row carries, dropped by the literal
    governingProvisions: ["STD-004.9.2"], updatedBy: "hom-1",
  }]);
  assert.equal(assertDeclaredClientKeys(literal, CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"), true);
});

test("RED: a column added without a declaration throws through the SPREAD projection", () => {
  // The case most likely to slip through, proven directly rather than
  // inferred from the literal case.
  const row = seededRegistryRow();
  row.installerPhoneNumber = "555-0100"; // stands in for migration 0059
  const payload = projectRegistryBySpread([row]);

  // The mutation LANDED at the intended site: assert the new key is really
  // on the payload before reading the throw. A projection that silently
  // dropped it and an assertion that cannot fire produce the same green.
  const [mutatedRow] = payload;
  assert.ok(mutatedRow && "installerPhoneNumber" in mutatedRow,
    "the simulated new column never reached the payload; the case below would pass vacuously");

  assert.throws(
    () => assertDeclaredClientKeys(payload, CLIENT_REGISTRY_ENTRY_KEYS, "registry entries"),
    /undeclared key "installerPhoneNumber" reached a client payload/,
  );
});

test("the LITERAL projection is safe by construction, which is why the guard bites on the spread", () => {
  // Same simulated column, same source row, other syntax. The literal never
  // carries it, so the guard has nothing to catch. Recorded rather than left
  // implicit: this guard's value is concentrated entirely on the spread
  // shape, and a projection written key by key does not need it.
  const payload = projectFieldsByLiteral([{
    id: "f1", section: 2, name: "Trash day", value: "Tuesday",
    flag: null, sensitivity: "s1", installerPhoneNumber: "555-0100",
  }]);
  const [projectedRow] = payload;
  assert.ok(projectedRow && !("installerPhoneNumber" in projectedRow),
    "the literal projection grew a key it does not name; the claim above is false");
  assert.equal(assertDeclaredClientKeys(payload, CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"), true);
});

test("RED: a non-object row and a non-array payload are refused, not skipped", () => {
  assert.throws(() => assertDeclaredClientKeys(
    [null] as unknown[], CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"), /is not an object/);
  assert.throws(() => assertDeclaredClientKeys(
    {} as unknown as unknown[], CLIENT_PLAYBOOK_FIELD_KEYS, "playbook fields"), /must be an array/);
});

test("the page still calls the assertion at both member-reaching sites", async () => {
  // The G-55 lesson one level up: an assertion that stops being called is a
  // guard that stopped running, and nothing else here would say so.
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const page = readFileSync(
    path.join(root, "apps/web/src/app/(client)/playbook/page.tsx"), "utf8");
  assert.ok(page.includes('assertDeclaredClientKeys(visible, CLIENT_PLAYBOOK_FIELD_KEYS'),
    "the playbook field payload no longer asserts its declared keys");
  assert.ok(page.includes('assertDeclaredClientKeys(entries, CLIENT_REGISTRY_ENTRY_KEYS'),
    "the registry payload no longer asserts its declared keys");
});
