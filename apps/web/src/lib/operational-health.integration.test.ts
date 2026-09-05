import { test, afterAll } from "vitest";
import assert from "node:assert";
import { sql } from "drizzle-orm";
import { EXPECTED_MIGRATION_COUNT } from "@wellkept/schema";
import { db } from "./db";
import { operationalHealth } from "./operational-health";

/**
 * The migration-drift signal is the one of the four with a verdict that
 * does not depend on a founder threshold, so it is the one that can be
 * proven in BOTH directions against a real database. The other three
 * report readings; asserting a reading would only restate the query.
 *
 * The drift proof mutates `drizzle.__drizzle_migrations` and puts it
 * back. That table is the deploy's own three-way count, so the restore
 * is asserted rather than assumed: a proof that leaves the migrations
 * table wrong would make every later run of `deploy.sh` refuse.
 *
 * THE RESTORE PUTS THE REAL ROW BACK, not a placeholder that happens to
 * make the count right. The first version of this proof re-inserted a
 * row hashed `operational-health-proof-restore`, which restored the
 * COUNT and left the table asserting that a migration nobody wrote had
 * been applied. That is the claim-nobody-made shape one layer down, and
 * it passed its own assertion because the assertion only counted. The
 * row is captured before the delete and written back verbatim.
 */
let baseline = -1;
let removed: { hash: string; created_at: string } | null = null;

test("preconditions: the migrations table is readable and agrees with this build", async () => {
  const r = await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
  baseline = Number((r as unknown as { rows: { n: number }[] }).rows[0]!.n);
  assert.ok(baseline > 0, "no applied migrations; every case below would pass vacuously");
  assert.equal(baseline, EXPECTED_MIGRATION_COUNT,
    "the local database is not at this build's migration count; migrate before running this proof");
});

test("green: an agreeing database reads ok", async () => {
  const drift = (await operationalHealth()).find((s) => s.key === "migration-drift")!;
  assert.equal(drift.verdict, "ok");
  assert.match(drift.reading, new RegExp(`Database ${EXPECTED_MIGRATION_COUNT}`));
});

test("red, the UNSAFE direction: code ahead of the database is called out by name", async () => {
  // Remove one applied row: the database now trails the running code,
  // which is G-120's exact shape and the direction that breaks queries.
  // Captured first, so the restore is the row rather than a stand-in.
  const doomed = await db.execute(sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 1`);
  removed = (doomed as unknown as { rows: { hash: string; created_at: string }[] }).rows[0]!;
  await db.execute(sql`DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations)`);
  const after = await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
  assert.equal(Number((after as unknown as { rows: { n: number }[] }).rows[0]!.n), baseline - 1,
    "the mutation did not land; the result below would be read from unmutated state");

  const drift = (await operationalHealth()).find((s) => s.key === "migration-drift")!;
  assert.equal(drift.verdict, "attention");
  assert.match(drift.note, /UNSAFE direction/);
});

afterAll(async () => {
  // Put the table back, and prove it: leaving it short would make every
  // later deploy preflight refuse for a reason nobody could trace here.
  const r = await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
  const now = Number((r as unknown as { rows: { n: number }[] }).rows[0]!.n);
  if (baseline > 0 && now < baseline && removed) {
    await db.execute(sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${removed.hash}, ${removed.created_at})`);
  }
  const back = await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
  assert.equal(Number((back as unknown as { rows: { n: number }[] }).rows[0]!.n), baseline,
    "the migrations table was not restored to its baseline count");
  if (removed) {
    // The count is not the assertion; the ROW is.
    const top = await db.execute(sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 1`);
    assert.equal((top as unknown as { rows: { hash: string }[] }).rows[0]!.hash, removed.hash,
      "the migrations table has its count back and not its row; a placeholder here would assert that a migration nobody wrote was applied");
  }
});
