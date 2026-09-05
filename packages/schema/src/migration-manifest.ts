/**
 * migration-manifest.ts : how many migrations the RUNNING CODE expects.
 *
 * Part Five item 1 of the comprehensive instruction (the operational
 * health surface): migration drift between disk and database is one of
 * the four signals, and it needs a number a server can compare against.
 *
 * THE COUNT IS BAKED IN AT BUILD TIME, DELIBERATELY, and the difference
 * from reading the filesystem at runtime is the whole point. The
 * question this answers is "does the database agree with THE CODE THAT
 * IS RUNNING". A filesystem read would answer for whatever tree happens
 * to be on the server's disk, which is a different question wearing the
 * same words, and in a deployment where code and files can diverge it is
 * the wrong one. Importing the journal makes the claim a property of the
 * build.
 *
 * `deploy.sh` already agrees three ways (disk, journal, database) before
 * every deploy. This is the same fact made visible BETWEEN deploys,
 * which is when G-120's skew went unnoticed: production ran three
 * migrations ahead of its schema and nothing on any screen said so.
 */
import journal from "../drizzle/meta/_journal.json" with { type: "json" };

/** Migrations this build was compiled against. */
export const EXPECTED_MIGRATION_COUNT = journal.entries.length;

/** The newest migration this build knows about, for a legible message. */
export const LATEST_MIGRATION_TAG =
  journal.entries[journal.entries.length - 1]?.tag ?? "none";
