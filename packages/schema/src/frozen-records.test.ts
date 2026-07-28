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
};

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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
