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
  // REVIEWED HASH UPDATE, 4 September 2026 (founder instruction, G-120).
  // Previous: cd731e14d89aae33243af828dda29728cb27a58638c27c27680318ae149663ac
  // One item added to the A1 reconciliation checklist plus the amendment
  // annotation at the head of the file; nothing else touched and no
  // August finding revised. This is the sanctioned hatch being used as
  // designed, not a bypass: the guard refused the unreviewed edit first.
  "docs/IMPLEMENTATION_HANDOFF_2026-08-24.md": "1daa7af1b0a7bc2fea8c39d77486ab7c088393bb9a61fea6430c8d75e565ba31",
  "docs/FOUNDER_RULINGS_2026-08-24.md": "50fcaefd070054ec33b674d710ad0b6c24e97b50d0d7106db3c69e276bc24c62",
  "docs/DELTA_REPORT_WKDEV003_2026-08-24.md": "c41bc1940c4e7a8aaaacb1dee0bc8e679b643c29aec42699a90830c62358bb1a",
  "docs/SPRINT_HOUSEHOLD_ONE_2026-08-24.md": "5edb003d1a1621f99ac1fbf050a108e669bff515766fa6e99ee19042146f1782",
  "docs/FOUNDER_INPUTS_PHASE0_CLOSE_2026-08-24.md": "979683c469da223ff83fa29d74bd1170a99c61bae2d3d715a81fe389b33666a8",
  "docs/INPUT_SPINE_BASELINE_2026-08-24.md": "352d7a5204d1c4d697df041c24912754dc6570d9c989065d4dd9436cc9116b88",
  "docs/COCKPIT_BASELINE_2026-08-24.md": "7a74b7ddf0321ea9e3fc22d7dce11d36989cd39d3ebe7a5dbfcb22d2713e0d9d",
  "docs/FOUNDER_INPUTS_2026-08-24_EVENING.md": "27a23aa3a875c29850f3241cc1b06165cc13ad74f08685b7c4eb297ac778e72b",
  "docs/WK-DEV-009_v1_1_Unified_Ambient_Brief_2026-08-24.md": "80c31ae0cd48066a1c7b255c171a6085279efb007ff0bdd8438f2ac277248060",
  "docs/WK-DEV-010_v1_1_Unified_Implementation_Directive_2026-08-24.md": "5443b75aa0e67b9be04882c021b774da4ad57ba89cba23e9e6f66d32786b3cfa",
  // The 3 September build-package intake (Q-0b, founder rulings on PR #282):
  // received bytes frozen verbatim; the stripped hashes equal the Q-0 pins.
  "docs/FOUNDER_RULINGS_2026-09-03_PR282_Q0b.md": "3553b742a532987e50b6dfc507ef74a7ff694b7868ad72ae3b017788ba5dc7d0",
  // Part C (4 September): the founder's review of Q-0b, same WK-QA-018 entry.
  "docs/FOUNDER_RULINGS_2026-09-04_PartC_Q0b_Review.md": "1a9d9e4e59b2b4fb65b9558839b46061956b5b662ca0d36d0ebb48e5d8d1e02f",
  // The no-dependency rulings, A through E, same WK-QA-018 entry. Its own
  // title dates it 4 September and it answers a report written on the 5th;
  // the founder's dating is kept as she wrote it and the discrepancy is
  // reported rather than reconciled (G-123).
  "docs/FOUNDER_RULINGS_2026-09-04_NoDependency.md": "adfee7cef7ab5c99b627479b543158ba42fc1f8d312b32b78bd36364399673aa",
  // "Unblocking the run", same WK-QA-018 entry and same dating question
  // (G-123). Part One settles six carried questions; Part Two is standing
  // authority and is merged into CLAUDE.md's session discipline.
  "docs/FOUNDER_RULINGS_2026-09-04_Unblocking.md": "7ac66655c577d1cd199312e238087f005389f77198b4a45ed5cd89d507d29949",
  // The preparation batch: twelve items that run ALONGSIDE the build
  // queue rather than instead of it. Document-only unless an item says
  // otherwise. Same WK-QA-018 entry and same dating question (G-123).
  "docs/PREPARATION_BATCH_2026-09-04.md": "fcd612e41be398e37951489bc5256725d19928eced213dfb7abf2506ced39adb",
  // The 4 September founder values package (document-only intake, the
  // Q-0b shape): received bytes frozen verbatim; .md hashes are
  // frontmatter-stripped, .csv/.yaml hashes are whole-file (no
  // frontmatter exists to strip, and stripFrontmatter no-ops).
  "docs/intake/2026-09-04-founder-values/README.md": "3d3f5605192fd1d7e55745c452b9d36d8c8cf571db239c170bc3174f69fe14b3",
  "docs/intake/2026-09-04-founder-values/surface_copy.md": "58cf3a6d1f7e66c6ca00c6999e7e0c310e3d05682e317524f028579eeee289e8",
  "docs/intake/2026-09-04-founder-values/fcps_calendar_extraction_test.md": "9dd8e175ea65e6aea3ec4d7ccc2fcb1b253e3fa93227f0596137b023cf0ca940",
  "docs/intake/2026-09-04-founder-values/vendor_decisions_and_gap_triage.md": "5bcfd219c1d63bea11b7b4c6152dda6dbfc7ba9abfc25128babdb424448e12bb",
  "docs/intake/2026-09-04-founder-values/ADOPTION_RULINGS_2026-09-04.md": "3dcdbd55c27c4bf2f1f54043260462a5bb1683a19e45b05dd6690329581f9dd1",
  // The package's five .csv/.yaml files cannot carry status frontmatter,
  // so they are pinned by whole-file sha256 in docs/SPEC_REGISTER.md and
  // the session log instead (the TASK_INVENTORY csv precedent). This
  // manifest stays .md-scoped by the L guard's own contract; widening it
  // to non-.md files is a guard change and belongs to its own session.
  "docs/intake/2026-09-03-build-package/PACKAGE_CLAUDE_MD_WITHDRAWN.md": "e9078732e2f10cf1d819b64ed07faa03760e3ea99dc603e4ab218b5fb4231492",
  "docs/intake/2026-09-03-build-package/BENCHMARK_ADOPTION.md": "d9b1db901c57afd51d8132b655b66b697f42a1f1e3a09ac1cebc15c86b80be45",
  "docs/intake/2026-09-03-build-package/BUILD_QUEUE.md": "0a23239fe4f9e13e6ca43e899fd483d50389f01d991368536f970e1aef767521",
  "docs/intake/2026-09-03-build-package/BUILD_RULING_2026-09-03.md": "0c5c10511a75e57b77abb29e7ff0d221d79ea15908d64042fdc84259884ae0bc",
  "docs/intake/2026-09-03-build-package/COMPETITIVE_FEATURE_INPUTS.md": "26595ffc3a022847f0dfb27876f6cf8f9f61354d26e8503ac52d6e77b8e73a4a",
  "docs/intake/2026-09-03-build-package/FIXTURES.md": "a06524a94b99ec37539ac871b4a0afe650d96407ca5d4c7799e7206c1920dca0",
  "docs/intake/2026-09-03-build-package/RFC-001_Schema_Substrate.md": "aaf425964ead9feb0f350b9a10296ea61d0a5e32f332fe38e45c9c7159ac6f19",
  "docs/intake/2026-09-03-build-package/SPEC_MODE_LOGIC.md": "fd94d9a67d4c9d1d188cd236d7f73b367edd2696cc902cc5a1f1e3c0c0027a57",
  "docs/intake/2026-09-03-build-package/SPEC_REGISTER.md": "ebd6bbd59891a7e4ec9a55cc317c381eb88a00b591f5709b1975a898489dfee3",
  "docs/intake/2026-09-03-build-package/START_HERE.md": "3cf116c323d023b44d7a3fc302e34264b557ca5b4718a36656019a5ad69fe3b6",
  "docs/WK_Tester_Provisioning_Household_Green_2026-08-24.md": "683bf7be086ca51f0dbda67d070e5670cf3f5501af89843bf7521e119b6f0ad1",
  "docs/WK_Sprint_Household_Green_HG_2026-08-24.md": "f4a94341ca8baed38e5c7ad42eadee358a8c4eebe6da1596aab12072eb271f53",
  "docs/SECTION4_SITTING_2026-08-25.md": "3e28d95b0977092d4f77193de837767aa3e5cbb377f5b3c53459946b4d869a0e",
  "docs/WK-DEV-011_Consolidated_Build_Brief_2026-08-25.md": "90d64c057198ae2c7d2737c0d2f03f44d587ad5d37ca1920b02d06ce584ca5b3",
  "docs/WK_Handoff_v5_Intake_Ruling_2026-08-25.md": "740877ed487fb962d83d755268acfa86361f7e3c1c2bb9fabd94f21f7b825c0c",
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
