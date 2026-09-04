import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Q-1 (the re-cut queue, Part C section 4.3): every server action
 * declares and enforces its permission, at CI level.
 *
 * The queue row's acceptance is "an action file without a declared
 * permission fails lint". This repository's lint mechanism for rules
 * of this shape is the census guard, and this is it: the census
 * COMPUTES both of its inputs (the inputs doctrine), the set of
 * "use server" files under apps/web/src and the set of exported async
 * actions in each, and demands every action body call one of the
 * sanctioned permission gates before it can ship. A new action file, or
 * a new action pasted in without a gate, fails CI with its name.
 *
 * The sanctioned gates are the ones the whole action layer already
 * uses, verbatim (read from all 61 actions on 2026-09-04):
 *   - getPrincipal(householdId): the per-household role gate
 *   - getStaffIdentity(): staff-anywhere, for person-scoped writes
 *   - guardedUser(): the mfa action helper (session + staff + token)
 *   - getSessionUser(): the global-object gate (createTaskDefinition
 *     pairs it with an assignment check)
 * A gate CALL is the floor this guard can see; whether the role check
 * beside it is the right one stays a review question (the not-covered
 * column). An action that genuinely needs no gate is an ALLOWLIST
 * entry with a written reason, the standing escape-hatch shape.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.join(here, "..");

const ALLOWLIST: Record<string, string> = {
  dismissRecoveryCodesAction:
    "clears the viewer's own display cookie (the backup-codes card) and redirects; it reads nothing, writes nothing beyond that cookie, and has no subject to authorize against",
};

const GATE = /await\s+(getPrincipal|getStaffIdentity|guardedUser|getSessionUser)\s*\(/;

/** Every .ts file under apps/web/src whose FIRST line is the directive. */
function useServerFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...useServerFiles(p));
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      const firstLine = readFileSync(p, "utf8").split("\n", 1)[0] ?? "";
      // First line only: totp.ts mentions the directive inside a
      // comment mid-file and is a library, not an action file.
      if (/^\s*["']use server["'];?\s*$/.test(firstLine)) out.push(p);
    }
  }
  return out;
}

/** The literal body of a named function, brace-matched (the G-68 shape). */
function bodyOf(src: string, name: string, file: string): string {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is gone from ${file} - this guard's input is stale, not satisfied`);
  const open = src.indexOf("{", src.indexOf(")", start));
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) break;
  }
  return src.slice(open, i + 1);
}

test("Q-1: every exported server action calls a permission gate, or carries a written reason", () => {
  const files = useServerFiles(SRC_ROOT);
  // Floor: a broken directory walk finds nothing and would pass vacuously.
  assert.ok(files.length >= 2,
    `only ${files.length} "use server" file(s) found under apps/web/src - the walk broke, not the action layer`);

  const ungated: string[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/export async function (\w+)\(/g)) {
      const name = m[1]!;
      total++;
      seen.add(name);
      if (name in ALLOWLIST) continue;
      if (!GATE.test(bodyOf(src, name, file))) ungated.push(`${path.relative(SRC_ROOT, file)}:${name}`);
    }
  }

  // Floor in the unit that is at risk: ACTIONS, not files.
  assert.ok(total >= 55,
    `only ${total} exported actions found across the "use server" files - the extractor broke, not the layer`);

  assert.deepEqual(ungated, [],
    `server action(s) with NO permission gate: ${ungated.join(", ")}. Every action calls `
    + `getPrincipal / getStaffIdentity / guardedUser / getSessionUser before touching anything, `
    + `or carries a written ALLOWLIST reason in this guard. An unguarded action is a route anyone `
    + `signed in (or not) can invoke by POST; that is the whole point of this census.`);

  // The reverse direction: a stale allowlist entry is a false claim.
  for (const [name, reason] of Object.entries(ALLOWLIST)) {
    assert.ok(reason.trim().length > 20, `allowlist reason for ${name} is too thin to be a reason`);
    assert.ok(seen.has(name),
      `${name} is allowlisted but no longer exists - remove its entry so the hatch stays exactly as wide as its exceptions`);
  }
});
