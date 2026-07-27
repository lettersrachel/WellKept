import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Session J (POST_DEPLOY_SESSIONS_2.md): the erasure rule as a GUARD, not a
 * policy. The standing rule — a data category ships with its erasure
 * treatment or it does not ship — was half-applied within one commit of
 * being written, and the mechanical version of this check found four more
 * missing tables the day it was drafted (anticipation_exclusion,
 * notification, field_event_outbox, trigger_rule). Same move G-37 made for
 * version skew: detect the CLASS of failure automatically.
 *
 * Mechanism: every table whose definition carries a household reference
 * must be NAMED in erase-household.mjs — mentioning it is the floor, and
 * forces the author to decide its treatment. Deliberate exceptions go in
 * the allowlist below WITH A WRITTEN REASON; an empty-reason entry fails.
 *
 * The match is word-bounded, not substring: underscore is a word
 * character, so `visit_photo` cannot vicariously satisfy `visit`, and a
 * comment naming the table counts exactly as much as a query does (the
 * floor is being NAMED — the treatment decision — not a particular SQL
 * shape). Verified to fire: blanking every standalone mention of one
 * table turns the suite red.
 */
const ALLOWLIST: Record<string, string> = {
  // (none today — the tool names every household-referencing table.
  //  Add entries as `table_name: "reason it is deliberately absent"`.)
};

const here = path.dirname(fileURLToPath(import.meta.url));
const tablesSrc = readFileSync(path.join(here, "tables.ts"), "utf8");
const toolSrc = readFileSync(
  path.join(here, "../../../apps/web/scripts/erase-household.mjs"),
  "utf8",
);

test("every household-referencing table appears in the erasure tool", () => {
  const blocks = tablesSrc.split(/export const \w+ = pgTable\("(\w+)"/);
  const missing: string[] = [];
  for (let i = 1; i < blocks.length; i += 2) {
    const table = blocks[i]!;
    const body = (blocks[i + 1] ?? "").split("pgTable")[0]!;
    const carriesHousehold = body.includes("household_id") || table === "household";
    if (!carriesHousehold) continue;
    if (table in ALLOWLIST) {
      assert.ok(
        ALLOWLIST[table]!.trim().length > 10,
        `allowlist entry for ${table} needs a real written reason`,
      );
      continue;
    }
    if (!new RegExp(`\\b${table}\\b`).test(toolSrc)) missing.push(table);
  }
  assert.deepEqual(
    missing,
    [],
    `household-referencing table(s) missing from erase-household.mjs: ${missing.join(", ")} — ` +
      `a data category ships with its erasure treatment or it does not ship (G-40). ` +
      `Either handle each table in the tool or allowlist it here with a written reason.`,
  );
});
