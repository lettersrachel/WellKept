import { test } from "vitest";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * W-12 (WORK_QUEUE): does CI notice when a guard stops running? A renamed
 * job, a moved file, or a test dropping out of collection turns a guard
 * back into a memory, and nothing would say so. This is the
 * guard-must-fire doctrine applied one level up: assert the expected
 * guard set is present, wired, and reachable by the CI entrypoint.
 *
 * When a guard legitimately moves, update this manifest in the same
 * commit — that is the point: the move becomes a reviewed decision.
 *
 * Escape hatches, per guard (founder item 4): this manifest IS its own
 * hatch (edit it in a reviewed commit). The payload guard's exceptions
 * are design changes to the permission model, never allowlisted. The
 * sizes CHECK's hatch is a reviewed migration. The copy guards carry
 * allowlists-with-written-reasons in client-copy.test.ts. The child-data
 * classification's hatch is moving a kind between its two named sets.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../..");

test("the guard files exist where the manifest says they are", () => {
  const files = [
    "packages/schema/src/erasure-coverage.test.ts",
    "packages/schema/src/client-copy.test.ts",
    // the payload-guard suite (client responses never carry staff rows)
    "packages/permissions/src/permissions.test.ts",
    "packages/schema/src/child-data-kinds.test.ts",
    "packages/schema/src/frozen-records.test.ts",
    "packages/trigger-engine/src/seed-binding.test.ts",
    "packages/schema/src/staff-disclosure.test.ts",
    // G-55: refusal targets render the banner (lives in apps/web because
    // it reads the route tree and the action layer).
    "apps/web/src/lib/refusal-visibility.test.ts",
    // Direction 0: counsel-pending markers resolve in the register and
    // never go stale unnoticed.
    "packages/schema/src/provisional-markers.test.ts",
    // Direction 2: no trigger rule may read a decline-class field without
    // a reviewed exclusion; no new Section 1/3 field ships unclassified.
    "packages/trigger-engine/src/decline-class-exclusion.test.ts",
    // WK-DEV-006 D7 (register A564): no client surface renders a
    // duration-typed field or staffing-wall quantity.
    "apps/web/src/lib/client-duration.test.ts",
  ];
  for (const f of files) {
    assert.ok(existsSync(path.join(root, f)), `guard file missing: ${f}`);
  }
});

/**
 * Session AP: apps/web became a collection point on 2026-07-29. Until
 * then the app - the auth path, the reveal path, all 40 server actions -
 * had nowhere to put a test, so every guard doctrine stopped at the
 * package boundary. A new runner that silently stops being collected is
 * the same failure this manifest exists to catch, one level out: the
 * package must keep a test script, turbo must still fan out to it, and
 * the suite must contain the G-53 outcome-branch tests that were the
 * reason for building it.
 */
test("apps/web still has a collected test runner", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "apps/web/package.json"), "utf8"));
  assert.equal(pkg.scripts?.test, "vitest run",
    "apps/web lost its test script - its suite is no longer collected by `turbo run test`");
  assert.ok(existsSync(path.join(root, "apps/web/vitest.config.ts")),
    "apps/web/vitest.config.ts missing - the runner cannot resolve the @/ alias without it");
  const revealSuite = path.join(root, "apps/web/src/app/api/reveal/route.test.ts");
  assert.ok(existsSync(revealSuite), "the reveal outcome-branch suite is gone (G-53/AP)");
  const src = readFileSync(revealSuite, "utf8");
  for (const outcome of ["delivered", "no_vault_item", "decrypt_failed"]) {
    assert.ok(src.includes(outcome), `the reveal suite no longer exercises the ${outcome} branch`);
  }
});

test("the sizes CHECK constraint is present in the schema and the latest snapshot", () => {
  const tables = readFileSync(path.join(root, "packages/schema/src/tables.ts"), "utf8");
  assert.ok(tables.includes("registry_sizes_not_client_visible"),
    "sizes CHECK missing from tables.ts");
  const journal = JSON.parse(readFileSync(path.join(root, "packages/schema/drizzle/meta/_journal.json"), "utf8"));
  const last = journal.entries[journal.entries.length - 1];
  const snapshot = readFileSync(
    path.join(root, `packages/schema/drizzle/meta/${String(last.idx).padStart(4, "0")}_snapshot.json`), "utf8");
  assert.ok(snapshot.includes("registry_sizes_not_client_visible"),
    "sizes CHECK missing from the latest migration snapshot — a later migration may have dropped it");
});

test("CI runs the suites the guards live in", () => {
  const ci = readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  assert.ok(/run:\s*pnpm test/.test(ci), "ci.yml no longer runs `pnpm test` — the test guards are unwired");
  assert.ok(/run:\s*pnpm typecheck/.test(ci), "ci.yml no longer runs `pnpm typecheck`");
  const rootPkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(rootPkg.scripts.test, "turbo run test",
    "root `pnpm test` no longer fans out via turbo — package suites may not run in CI");
});

test("CLAUDE.md's guard table matches the manifest (founder item 5)", () => {
  // Two copies of the same list drifting independently is the /privacy vs
  // master-doc failure; the stale copy would be the one that loads into
  // every session. Each guard the manifest knows must have a row.
  const claudeMd = readFileSync(path.join(root, "CLAUDE.md"), "utf8");
  for (const named of [
    "permissions.test.ts", "erasure-coverage.test.ts", "client-copy.test.ts",
    "child-data-kinds.test.ts", "guards-manifest.test.ts", "`sizes` CHECK",
    "frozen-records.test.ts", "seed-binding.test.ts", "staff-disclosure.test.ts",
    "refusal-visibility.test.ts", "provisional-markers.test.ts",
    "decline-class-exclusion.test.ts", "client-duration.test.ts",
  ]) {
    assert.ok(claudeMd.includes(named), `CLAUDE.md guard table missing a row for ${named}`);
  }
});
