/**
 * check-workspace-links.mjs : refuse a test run whose workspace links are
 * missing, with the fix in the message.
 *
 * WHY THIS EXISTS. A new workspace package (`@wellkept/config`, 3
 * September 2026) was declared as a dependency and committed, but a
 * checkout that had not re-run `pnpm install` had no symlink for it. The
 * suite then failed at COLLECTION with
 *
 *   Error: Cannot find package '@wellkept/config' imported from ...
 *
 * which is a module-resolution error naming a package that plainly does
 * exist in the tree, so it reads as a broken import rather than a stale
 * install. It cost a paragraph in three separate reports, each one
 * re-deriving the same answer, because nothing in the failure named
 * `pnpm install`.
 *
 * The check runs as `pretest`, BEFORE vitest, so the actionable message
 * arrives first rather than after the confusing one. It only reads
 * package.json files and the filesystem; it installs nothing, because a
 * test command that silently mutates node_modules is a worse surprise
 * than the one it replaces.
 *
 * Scope note: invoked per package, on the package that runs it. Wiring
 * it to another package is one line in that package's own scripts.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const pkgDir = process.cwd();
const pkgPath = path.join(pkgDir, "package.json");
if (!existsSync(pkgPath)) {
  console.error(`check-workspace-links: no package.json in ${pkgDir}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const declared = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
  .filter(([, spec]) => typeof spec === "string" && spec.startsWith("workspace:"))
  .map(([name]) => name);

// The inputs doctrine: a checker that finds nothing to check must say so
// rather than pass silently. Zero workspace deps is legitimate, but it
// should be visible that this ran and had no work.
if (declared.length === 0) {
  console.log(`check-workspace-links: ${pkg.name} declares no workspace dependencies; nothing to verify.`);
  process.exit(0);
}

const missing = declared.filter((name) => !existsSync(path.join(pkgDir, "node_modules", name)));

if (missing.length > 0) {
  console.error("");
  console.error(`REFUSED: ${pkg.name} declares ${missing.length} workspace dependenc(ies) that are not linked:`);
  for (const name of missing) console.error(`  ${name}`);
  console.error("");
  console.error("These packages exist in the repository; the link is missing because");
  console.error("node_modules predates them. Nothing is wrong with the code.");
  console.error("");
  console.error("  FIX:  pnpm install        (from the repository root)");
  console.error("");
  console.error("Without it the suite fails at collection with \"Cannot find package\",");
  console.error("which reads as a broken import rather than a stale install.");
  console.error("");
  process.exit(1);
}

console.log(`check-workspace-links: ${declared.length} workspace dependenc(ies) linked.`);
