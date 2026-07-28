import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CASCADES } from "./cascades.ts";
import { OBSERVANCES_FIELD_PREFIX, ZONE_DRIFT_NONE } from "./registry-sweep.ts";

/**
 * M (round six), guarding K's member-3 and member-5 findings: rendered
 * names that are also matchers, where the matcher side lives in DATA or a
 * sibling package and no type system connects them.
 *
 * - Cascades bind to playbook fields by NAME SUBSTRING (engine.ts
 *   ruleMatches). If the intake seed's field names drift away from the
 *   binding vocabulary, the cascades silently never fire for every
 *   household intaken afterward. This asserts each fleet cascade's
 *   bindsToFieldName still matches at least one seed-template field.
 * - The observance sweep locates its input field by name prefix
 *   (OBSERVANCES_FIELD_PREFIX, used in run.ts's LIKE). Same failure mode.
 * - The no-drift vocabulary (ZONE_DRIFT_NONE) is compared in three
 *   packages; close-flow is dependency-free by design and carries its own
 *   literal, so this asserts the mirror has not drifted, the same way the
 *   close-flow tier vocabulary is mirror-tested against the schema's.
 *
 * Live playbook data renamed AFTER intake is out of any repo guard's
 * reach; that residual risk is recorded in ROUND6_FINDINGS_K.md member 3.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../..");

interface SeedField { name: string }

function seedFieldNames(): string[] {
  const seed = JSON.parse(
    readFileSync(path.join(root, "tooling/seed/fernbrook_template_seed.json"), "utf8"),
  ) as { fields: SeedField[] };
  return seed.fields.map((f) => f.name);
}

test("every fleet cascade's field binding matches at least one intake seed field", () => {
  const names = seedFieldNames();
  const unbound: string[] = [];
  for (const rule of CASCADES) {
    if (!rule.bindsToFieldName) continue;
    const needle = rule.bindsToFieldName.toLowerCase();
    if (!names.some((n) => n.toLowerCase().includes(needle))) {
      unbound.push(`${rule.definition.packName} binds to "${rule.bindsToFieldName}"`);
    }
  }
  assert.deepEqual(unbound, [],
    `cascade binding(s) match no seed-template field; a rename in the seed silently ` +
    `unbinds them for every future intake: ${unbound.join("; ")}`);
});

test("the observance sweep's field-name prefix exists in the intake seed", () => {
  const names = seedFieldNames();
  assert.ok(
    names.some((n) => n.startsWith(OBSERVANCES_FIELD_PREFIX)),
    `no seed-template field starts with "${OBSERVANCES_FIELD_PREFIX}"; the observance ` +
    `radar would silently never fire for households intaken from this seed`);
});

test("the no-drift vocabulary has not drifted between packages", () => {
  // close-flow is dependency-free by design; it carries its own literal.
  const closeFlow = readFileSync(path.join(root, "packages/close-flow/src/index.ts"), "utf8");
  assert.ok(closeFlow.includes(`!== "${ZONE_DRIFT_NONE}"`),
    `close-flow no longer compares zone drift against "${ZONE_DRIFT_NONE}"; the wizard's ` +
    `No-drift control and detectLoadSignal would disagree with the close gate`);
});
