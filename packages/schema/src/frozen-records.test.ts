import { test } from "vitest";
import assert from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Round four, session B: "frozen" enforced rather than asserted. The four
 * dated evidentiary records (the two annotated verification records and
 * the two post-deploy findings files) are the evidence base for the
 * audit-invariant verdict and the legal-drift findings; a property named
 * without a guard behind it is the pattern this process exists to catch.
 *
 * Any change to a frozen file fails CI until its hash is deliberately
 * updated HERE - a reviewed edit, which is the escape hatch, the same
 * structural hatch guards-manifest uses for itself.
 *
 * Proved red before trusted green: one character changed in a frozen
 * record failed naming the file; restored, green.
 */
const FROZEN: Record<string, string> = {
  "docs/legal/COUNSEL_PACKET_VERIFICATION.md": "f9f8159659bcade8a5878aa12f237cec6fe91068366d86ba5aec30f7762e7cea",
  "docs/legal/COUNSEL_VERIFICATION_SESSION.md": "0f94df2dfbcfb137f03745347dadaf78a2661fdb21b0c4cae61233ded2a96199",
  "docs/POST_DEPLOY_FINDINGS_A_B.md": "90b89da3bd367bd4042176c1cc577ad47ddb12e82ca6fc3ba2aa58f1b4e32da6",
  "docs/POST_DEPLOY_FINDINGS_E_I.md": "fd4831ea5f6abc7e441ee2bf1045b62c6617bc66974a928cf7a2b1742f444e5e",
  "docs/ROUND4_FINDINGS_A.md": "e55e7ecbad8c6cf7b22a4257924d17548a31c922f4d725aa3bd3fa79f2ec3506",
};

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Round five, session H: assert the CLASS by convention, not by list. An
 * unannotated dated record cannot appear in an annotation grep, and one
 * round after the guard was built the set had already drifted
 * (ROUND4_FINDINGS_A). Convention decided 2026-07-28: a docs file whose
 * NAME matches the historical-record pattern below is presumed frozen -
 * automatic, no author memory - and must appear in FROZEN or carry a
 * written reason in LIVING. The erasure-coverage pattern applied to
 * documents.
 */
const RECORD_PATTERN = /(FINDINGS|VERIFICATION|FIELD_MAP|DRAFT)/;
const LIVING: Record<string, string> = {
  "docs/ROUND4_D_FIELD_MAP.md": "awaiting the founder's redline; freezes when session D consumes it",
  "docs/CONCERNS_MINOR_DRAFT.md": "the reviewer's redline draft, a markup target until session D lands",
};

test("frozen historical records are byte-identical to their manifest hashes", () => {
  const changed: string[] = [];
  for (const [rel, expected] of Object.entries(FROZEN)) {
    const actual = createHash("sha256").update(readFileSync(path.join(root, rel))).digest("hex");
    if (actual !== expected) changed.push(rel);
  }
  assert.deepEqual(changed, [],
    `frozen record(s) modified: ${changed.join(", ")} - these are dated evidence, not living copy. ` +
    `If the edit is deliberate and annotated, update the hash here in the same reviewed commit.`);
});

test("every file matching the historical-record pattern is frozen or has a written reason", () => {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith(".md") || !RECORD_PATTERN.test(name)) continue;
      const rel = path.relative(root, p);
      if (rel in FROZEN) continue;
      if (rel in LIVING) {
        if (LIVING[rel]!.trim().length <= 10) throw new Error(`LIVING entry for ${rel} needs a real written reason`);
        continue;
      }
      offenders.push(rel);
    }
  };
  walk(path.join(root, "docs"));
  assert.deepEqual(offenders, [],
    `historical-record-pattern file(s) neither frozen nor excused: ${offenders.join(", ")} - ` +
    `add a hash to FROZEN or a written reason to LIVING (session H).`);
});
