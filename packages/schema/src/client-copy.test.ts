import { test } from "vitest";
import assert from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * The no-em-dash rule for client-facing copy (CLAUDE.md conventions),
 * enforced the same way the erasure rule is: a guard, not a memory.
 * Scope is the pages a CLIENT can see — the (client) route group and the
 * public pages. Staff surfaces and prompt text are out of scope, and code
 * comments are stripped before checking (an em dash in a comment is not
 * user-facing).
 *
 * Verified to fire: reintroducing an em dash into rendered playbook copy
 * turns this red naming the file and line.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const webApp = path.join(here, "../../../apps/web/src/app");

const CLIENT_FACING_ROOTS = [
  "(client)",
  "privacy",
  "support",
  "signin",
  "verify-request",
];

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function stripComments(src: string): string {
  // Blank out block and line comments, preserving line numbers so the
  // failure message points at the real line.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/[^\n]*$/gm, (m) => m.replace(/[^\n]/g, " "));
}

test("client-facing pages contain no em dashes outside comments", () => {
  const offenders: string[] = [];
  for (const root of CLIENT_FACING_ROOTS) {
    const dir = path.join(webApp, root);
    let files: string[] = [];
    try {
      files = tsxFiles(dir);
    } catch {
      continue; // a root may not exist in a future layout; absence is not a failure
    }
    for (const file of files) {
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (line.includes("—")) offenders.push(`${path.relative(webApp, file)}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `em dash in client-facing copy (CLAUDE.md: plain prose, no em dashes): ${offenders.join(", ")}`,
  );
});
