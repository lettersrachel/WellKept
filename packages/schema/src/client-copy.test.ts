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

// Item 4 (founder 2026-07-28): every guard scope carries a sanctioned
// escape hatch - an allowlist entry with a written reason - so the first
// legitimate exception is a reviewed line here, never a commented-out
// guard. Keys are paths relative to the scanned root.
const PAGE_ALLOWLIST: Record<string, string> = {};
const SOURCE_ALLOWLIST: Record<string, string> = {};

function allowlisted(list: Record<string, string>, key: string): boolean {
  if (!(key in list)) return false;
  if (list[key]!.trim().length <= 10) throw new Error(`allowlist entry for ${key} needs a real written reason`);
  return true;
}

// W-10: the rule is unqualified — staff prompt text and email/notification
// copy are user-facing too, and templated copy is the surface most at risk
// of drifting into machine voice. These files' STRING LITERALS are checked
// (comments stripped); add a file here when a new templated-copy source
// appears.
const COPY_SOURCES = [
  "../../../packages/trigger-engine/src/registry-sweep.ts",
  "../../../packages/trigger-engine/src/engine.ts",
  "../../../services/worker/src/seed-rules.ts",
  "../../../services/worker/src/digest.ts",
  "../../../packages/mail/src/index.ts",
  "../../../apps/web/src/lib/push.ts",
];

// W-13: the rule covers documents. The legal drafts travel to counsel and
// clients; they carry the same voice rule as the app.
const DOC_DIRS = ["../../../docs/legal"];

// J1 (round five): packName reached House Managers and no guard saw it.
// Staff surfaces are rendered strings too - pack names, labels, buttons,
// empty states, error text leak internal vocabulary and machine voice
// the same way prose does. Same em-dash floor, comments stripped.
const STAFF_ROOTS = ["(hm)", "(corporate)"];
const STAFF_EXTRA_FILES = [
  "../../../apps/web/src/app/RegistryCard.tsx",
  "../../../apps/web/src/app/ProvisionList.tsx",
  "../../../apps/web/src/components/RefusalBanner.tsx",
  "../../../apps/web/src/components/SkewWatch.tsx",
];

// Item 7 (founder 2026-07-28): the two dated verification records are
// historical artifacts; they were punctuation-swept with an inline
// annotation, and any FUTURE em dash in them is exempt only with the
// reason below - restore-from-history plus this allowlist is the
// sanctioned path if a verbatim historical quote ever needs one.
const DOC_ALLOWLIST: Record<string, string> = {
  "COUNSEL_PACKET_VERIFICATION.md": "dated verification record; edits are annotated, claims frozen",
  "COUNSEL_VERIFICATION_SESSION.md": "dated verification record; edits are annotated, claims frozen",
};

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
      if (allowlisted(PAGE_ALLOWLIST, path.relative(webApp, file))) continue;
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

test("templated staff/email copy sources contain no em dashes outside comments", () => {
  const offenders: string[] = [];
  for (const rel of COPY_SOURCES) {
    if (allowlisted(SOURCE_ALLOWLIST, path.basename(rel))) continue;
    const file = path.join(here, rel);
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (line.includes("—")) offenders.push(`${path.basename(file)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [],
    `em dash in templated copy (W-10; the rule is unqualified): ${offenders.join(", ")}`);
});

test("legal documents contain no em dashes", () => {
  const offenders: string[] = [];
  for (const rel of DOC_DIRS) {
    for (const name of readdirSync(path.join(here, rel))) {
      if (!name.endsWith(".md")) continue;
      if (name in DOC_ALLOWLIST) { if (DOC_ALLOWLIST[name]!.trim().length <= 10) throw new Error(`allowlist entry for ${name} needs a real reason`); continue; }
      const file = path.join(here, rel, name);
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (line.includes("—")) offenders.push(`${name}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(offenders, [],
    `em dash in a legal document (W-13; every document carries the rule): ${offenders.join(", ")}`);
});

test("staff-facing surfaces contain no em dashes outside comments (J1)", () => {
  const offenders: string[] = [];
  for (const root of STAFF_ROOTS) {
    for (const file of tsxFiles(path.join(webApp, root))) {
      stripComments(readFileSync(file, "utf8")).split("\n").forEach((line, i) => {
        if (line.includes("—")) offenders.push(`${path.relative(webApp, file)}:${i + 1}`);
      });
    }
  }
  for (const rel of STAFF_EXTRA_FILES) {
    const file = path.join(here, rel);
    stripComments(readFileSync(file, "utf8")).split("\n").forEach((line, i) => {
      if (line.includes("—")) offenders.push(`${path.basename(file)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [],
    `em dash on a staff surface (J1; a House Manager is a user): ${offenders.join(", ")}`);
});
