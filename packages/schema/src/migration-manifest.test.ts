import { test } from "vitest";
import assert from "node:assert";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { EXPECTED_MIGRATION_COUNT, LATEST_MIGRATION_TAG } from "./migration-manifest.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const drizzle = path.join(here, "../drizzle");

/**
 * The journal and the .sql files on disk must agree, which `deploy.sh`
 * checks before every deploy and nothing checked in CI. A journal that
 * has drifted from the files would make the health surface report a
 * confident wrong number, which is worse than reporting none.
 */
test("the journal and the migration files on disk agree", () => {
  const sql = readdirSync(drizzle).filter((f) => f.endsWith(".sql"));
  assert.ok(sql.length > 0, "no migration files found; the derivation is broken, not the tree");
  assert.equal(
    EXPECTED_MIGRATION_COUNT,
    sql.length,
    `the journal names ${EXPECTED_MIGRATION_COUNT} migrations and ${sql.length} .sql files are on disk. ` +
    "The health surface compares the database against the journal, so a disagreement here would make it report a confident wrong number.",
  );
});

test("the latest tag names a file that exists", () => {
  const sql = new Set(readdirSync(drizzle).filter((f) => f.endsWith(".sql")));
  assert.ok(sql.has(`${LATEST_MIGRATION_TAG}.sql`),
    `the journal's newest entry is ${LATEST_MIGRATION_TAG} and no such .sql file exists`);
});
