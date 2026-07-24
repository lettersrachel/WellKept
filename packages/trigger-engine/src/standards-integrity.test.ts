/**
 * standards-integrity.test.ts : seed integrity gate (brief T7).
 * Every methodRef in the cascade library and every governing_provisions
 * entry in the Fernbrook bindings must resolve to a live provision in the
 * provision seed — a dangling reference is a release blocker, not a warning.
 * (Post-load, the same rule holds against standard_provision with
 * tombstoned_at IS NULL; this is the seed-level gate that runs in CI.)
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CASCADES } from "./cascades";

const seedDir = (f: string) => fileURLToPath(new URL(`../../../tooling/seed/${f}`, import.meta.url));
const provisionIds = new Set(
  (JSON.parse(readFileSync(seedDir("provisions_seed.json"), "utf8")) as { provision_id: string }[])
    .map((r) => r.provision_id),
);

test("every cascade methodRef resolves to a provision (empty is a finding, not an error)", () => {
  const dangling: string[] = [];
  for (const rule of CASCADES) {
    for (const item of rule.definition.items) {
      if (item.methodRef != null && !provisionIds.has(item.methodRef)) {
        dangling.push(`${rule.definition.packName}: ${item.methodRef}`);
      }
    }
  }
  assert.deepEqual(dangling, []);
});

test("every Fernbrook binding resolves to a provision and a real template field", () => {
  const csv = readFileSync(seedDir("fernbrook_bindings.csv"), "utf8").trim().split(/\r?\n/);
  assert.equal(csv[0], "section,name,provision_ids");
  const template: { fields: { section: number; name: string }[] } =
    JSON.parse(readFileSync(seedDir("fernbrook_template_seed.json"), "utf8"));
  const fields = template.fields;
  const fieldKeys = new Set(fields.map((f) => `${f.section}|${f.name}`));
  const problems: string[] = [];
  let refs = 0;
  for (const line of csv.slice(1)) {
    // name may contain commas and quotes; CSV quotes it and doubles inner quotes
    const m = line.match(/^(\d+),(?:"((?:[^"]|"")*)"|([^,]*)),(.*)$/);
    if (!m) { problems.push(`unparseable line: ${line.slice(0, 60)}`); continue; }
    const [, section, quoted, bare, ids] = m;
    const name = quoted !== undefined ? quoted.replaceAll('""', '"') : bare!;
    if (!fieldKeys.has(`${Number(section)}|${name}`)) {
      problems.push(`no template field: S${section} ${name.slice(0, 50)}`);
    }
    for (const id of ids!.split(";")) {
      refs += 1;
      if (!provisionIds.has(id)) problems.push(`dangling provision: ${id}`);
    }
  }
  assert.deepEqual(problems, []);
  assert.ok(csv.length - 1 >= 25, "the worked example stays substantial (~30 bindings)");
  assert.ok(refs >= 40, `expected a real reference set, got ${refs}`);
});
