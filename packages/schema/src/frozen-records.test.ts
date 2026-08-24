import { test } from "vitest";
import assert from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Round four, session B: "frozen" enforced rather than asserted. The dated
 * evidentiary records are the evidence base for the audit-invariant verdict
 * and the legal-drift findings; a property named without a guard behind it
 * is the pattern this process exists to catch.
 *
 * Any change to a frozen file fails CI until its hash is deliberately
 * updated HERE - a reviewed edit, which is the escape hatch, the same
 * structural hatch guards-manifest uses for itself.
 *
 * Round six, session L (decision 2026-07-28): frozen-vs-living is a
 * PROPERTY carried by the document, not a naming coincidence. Every .md
 * under docs/ declares `status: frozen` or `status: living` in frontmatter;
 * an unmarked file fails CI at the moment of creation with a clear message,
 * which replaces round five's name-pattern heuristic and its allowlist.
 *
 * Hashes cover CONTENT, not metadata: the frontmatter block is stripped
 * before hashing, so classifying a document (or future metadata additions)
 * never burns the reviewed-hash-update hatch. A hash update should only
 * ever signal a content edit.
 *
 * Proved red before trusted green, each direction: content change in a
 * frozen record fails naming the file; an unmarked doc fails; a frozen
 * status without a manifest entry fails; the full tree is green.
 */
const FROZEN: Record<string, string> = {
  "docs/legal/COUNSEL_PACKET_VERIFICATION.md": "f9f8159659bcade8a5878aa12f237cec6fe91068366d86ba5aec30f7762e7cea",
  "docs/legal/COUNSEL_VERIFICATION_SESSION.md": "0f94df2dfbcfb137f03745347dadaf78a2661fdb21b0c4cae61233ded2a96199",
  "docs/POST_DEPLOY_FINDINGS_A_B.md": "90b89da3bd367bd4042176c1cc577ad47ddb12e82ca6fc3ba2aa58f1b4e32da6",
  "docs/POST_DEPLOY_FINDINGS_E_I.md": "fd4831ea5f6abc7e441ee2bf1045b62c6617bc66974a928cf7a2b1742f444e5e",
  "docs/ROUND4_FINDINGS_A.md": "e55e7ecbad8c6cf7b22a4257924d17548a31c922f4d725aa3bd3fa79f2ec3506",
  "docs/ROUND6_FINDINGS_K.md": "be6c157a06e4340e00b34516203511b7461589e978eb4b98ca8eb0d98cde8a1a",
  "docs/AUDIT_WRITE_PATH_SURVEY.md": "eafdd0136535417c8577c767c15c3cbde518c04c6d2709ea5805bbf2a6552a34",
  "docs/ROUND6_FINDINGS_P.md": "b0d53bb4f14bf17322588175b7edfb8cca8d7c3e47330d6b88a214f1fb24e310",
  "docs/ROUND6_FINDINGS_Q.md": "6be3c8ff697ac29cebdc0cfa62afc584ed2aec7586ccb8150ee53086002ff5e5",
  "docs/AUDIT_IDENTITY_SURVEY.md": "9978d39a1fe7cb63e9dc0c0e8f75347cb749cf261416e45d64bca047e7779721",
  "docs/AQ_RECONCILIATION_REPORT.md": "8a137f18e4dbb4dc9dd9d7d02d80e01da5159b3f8c95d8e211f0037dc51b809c",
  "docs/SESSION_COMMISSIONING_BRIEF.md": "31a20592cb35e8596f962be00e13c43f86dc04740f112b8bb10d3d1ba13033e4",
  "docs/FOUNDER_RULINGS_2026-08-02.md": "a85c96a30e03a7e5eeefd3bc85e331224030fd9b999948f1679d94724d9d9155",
  "docs/DURABILITY_REQUIREMENTS_2026-08-02.md": "872379be694bd234fc6c39e371794eacbd95d08bfc1c0cbfe0f5311044ead13a",
  "docs/SESSION_LOG_2026-08-05_HOUSEKEEPING.md": "3741d718aedd79f3ff4768945470235c0ce24bf4357accc99c2ee9ed976457a9",
  "docs/SESSION_LOG_2026-08-05_AR_G59.md": "005f7a2dad391339b57c689bc203b3e3b0aa7b0bbd276044d7c4d6d993b34996",
  "docs/DEV_SESSION_RULINGS_2026-08-24.md": "12e42e1aa4d90d704919e4e05c9a1a3faba46992cfef950823de4702b983c1df",
  "docs/IMPLEMENTATION_HANDOFF_2026-08-24.md": "cd731e14d89aae33243af828dda29728cb27a58638c27c27680318ae149663ac",
  "docs/FOUNDER_RULINGS_2026-08-24.md": "50fcaefd070054ec33b674d710ad0b6c24e97b50d0d7106db3c69e276bc24c62",
};

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Frontmatter block at the top of the file, or null if absent/malformed. */
function frontmatter(raw: string): string | null {
  if (!raw.startsWith("---\n")) return null;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return raw.slice(4, end);
}

/** Content with the frontmatter block removed; hashes cover this. */
function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---\n")) return raw;
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return raw;
  return raw.slice(end + 5);
}

function docsFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (name.endsWith(".md")) out.push(p);
    }
  };
  walk(path.join(root, "docs"));
  return out;
}

test("frozen historical records are content-identical to their manifest hashes", () => {
  const changed: string[] = [];
  for (const [rel, expected] of Object.entries(FROZEN)) {
    const actual = createHash("sha256")
      .update(stripFrontmatter(readFileSync(path.join(root, rel), "utf8")))
      .digest("hex");
    if (actual !== expected) changed.push(rel);
  }
  assert.deepEqual(changed, [],
    `frozen record(s) modified: ${changed.join(", ")} - these are dated evidence, not living copy. ` +
    `If the edit is deliberate and annotated, update the hash here in the same reviewed commit. ` +
    `(Hashes cover content after frontmatter, so status/metadata edits never trip this.)`);
});

test("every document in docs/ declares status frozen or living, and frozen means manifested (L)", () => {
  const offenders: string[] = [];
  const statuses = new Map<string, string>();
  for (const p of docsFiles()) {
    const rel = path.relative(root, p);
    const fm = frontmatter(readFileSync(p, "utf8"));
    const status = fm?.match(/^status: (frozen|living)$/m)?.[1];
    if (!status) {
      offenders.push(`${rel}: missing frontmatter "status: frozen" or "status: living" (session L: ` +
        `classification happens at creation, not by naming coincidence)`);
      continue;
    }
    statuses.set(rel, status);
    if (status === "frozen" && !(rel in FROZEN)) {
      offenders.push(`${rel}: status frozen but no manifest hash here - add its stripped-content sha256 to FROZEN`);
    }
  }
  for (const rel of Object.keys(FROZEN)) {
    if (statuses.get(rel) !== "frozen") {
      offenders.push(`${rel}: in the FROZEN manifest but not marked status frozen (or missing)`);
    }
  }
  assert.deepEqual(offenders, [], `document status guard (session L):\n  ${offenders.join("\n  ")}`);
});
