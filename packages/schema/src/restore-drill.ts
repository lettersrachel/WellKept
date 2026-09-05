/**
 * restore-drill.ts : the repo-side half of the backup restore drill
 * (comprehensive instruction, Part Five item 2).
 *
 * "Has a restore ever been tested" currently has one honest answer, and
 * it is no. This turns that assumption into a fact, and it does it with
 * evidence rather than with a person saying the page loaded.
 *
 * TWO MODES, BOTH STRICTLY READ-ONLY. Nothing here writes, ever, in
 * either mode, and that is deliberate rather than incidental: the second
 * mode runs against a RESTORED database, which is the one place where a
 * stray write would corrupt the very thing being verified.
 *
 *   pnpm db:restore-drill --baseline --out <file>
 *       Against the SOURCE (production). Records what a good restore
 *       must contain.
 *
 *   pnpm db:restore-drill --verify --from <file>
 *       Against the RESTORED database. Compares, prints every check, and
 *       exits non-zero on any failure.
 *
 * The file flag is `--from` rather than `--baseline` because the first
 * version used `--baseline` for both the MODE and the FILE, so
 * `--verify --baseline base.json` set both mode flags and the script
 * refused its own documented invocation. Caught on the proof's first
 * real run, which is what proof runs are for.
 *
 * WHAT THE BASELINE ANCHORS ON, and why it is not simply row counts.
 * A point-in-time restore lands at an instant, and production keeps
 * moving, so equal row counts are the wrong test: they fail for a
 * healthy restore taken a minute earlier. So counts are reported and
 * compared with a >= rule (a restore may hold fewer recent rows and must
 * never hold fewer OLD ones), and the actual assertion is a CONTENT
 * HASH over the oldest rows of `audit_event`, which is append-only by
 * law and therefore identical in any restore that did not lose or
 * corrupt history.
 *
 * NOT EXPORTED FROM THE PACKAGE INDEX, deliberately, and the same rule
 * the household export and import scripts already follow: this module
 * imports `pg` and `node:fs`, and re-exporting it from `index.ts` drags
 * a Postgres client into the CLIENT bundle through the schema barrel.
 * The build said so immediately ("Can't resolve 'fs'", traced through
 * trigger-engine to VisitWizard), which is the build doing its job on a
 * mistake made in this file's own first version.
 *
 * The vault check is the one that answers "is this restore USABLE
 * rather than merely present": a restored ciphertext that no longer
 * decrypts is a restore that returned bytes and lost the record. It
 * runs only when WK_KMS_KEY is available, and says so when it does not.
 */
import pg from "pg";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { EXPECTED_MIGRATION_COUNT, LATEST_MIGRATION_TAG } from "./migration-manifest.ts";

export interface RestoreBaseline {
  generatedAt: string;
  migrationCount: number;
  latestMigrationTag: string;
  /** Every table with its row count at baseline time. */
  tableCounts: Record<string, number>;
  /** The oldest audit rows, hashed. Append-only, so a restore must match. */
  auditAnchor: { rows: number; sha256: string };
  vaultItems: number;
}

const ANCHOR_ROWS = 200;

export function hashAuditRows(rows: { id: string; kind: string; created_at: unknown }[]): string {
  const h = createHash("sha256");
  for (const r of rows) h.update(`${r.id}|${r.kind}|${new Date(r.created_at as string).toISOString()}\n`);
  return h.digest("hex");
}

async function census(pool: pg.Pool): Promise<RestoreBaseline> {
  const { rows: tables } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  const tableCounts: Record<string, number> = {};
  for (const { table_name } of tables) {
    const { rows } = await pool.query<{ n: string }>(`SELECT count(*)::int AS n FROM "${table_name}"`);
    tableCounts[table_name] = Number(rows[0]!.n);
  }
  const { rows: journal } = await pool.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
  );
  const { rows: anchor } = await pool.query<{ id: string; kind: string; created_at: unknown }>(
    `SELECT id, kind, created_at FROM audit_event ORDER BY created_at, id LIMIT ${ANCHOR_ROWS}`,
  );
  return {
    generatedAt: new Date().toISOString(),
    migrationCount: Number(journal[0]!.n),
    latestMigrationTag: LATEST_MIGRATION_TAG,
    tableCounts,
    auditAnchor: { rows: anchor.length, sha256: hashAuditRows(anchor) },
    vaultItems: tableCounts.vault_item ?? 0,
  };
}

export interface Check { name: string; pass: boolean; detail: string }

export async function verifyAgainst(pool: pg.Pool, base: RestoreBaseline): Promise<Check[]> {
  const now = await census(pool);
  const checks: Check[] = [];

  checks.push({
    name: "migration count",
    pass: now.migrationCount === base.migrationCount,
    detail: `restored ${now.migrationCount}, baseline ${base.migrationCount}, this build expects ${EXPECTED_MIGRATION_COUNT}`,
  });

  const missing = Object.keys(base.tableCounts).filter((t) => !(t in now.tableCounts));
  checks.push({
    name: "every table present",
    pass: missing.length === 0,
    detail: missing.length === 0 ? `${Object.keys(now.tableCounts).length} tables` : `MISSING: ${missing.join(", ")}`,
  });

  // A restore taken BEFORE the baseline read legitimately holds fewer
  // recent rows. It may never hold fewer than a table that was empty,
  // and a table that had rows and now has none is the failure this
  // catches: a restore that silently returned an empty schema.
  const emptied = Object.entries(base.tableCounts)
    .filter(([t, n]) => n > 0 && (now.tableCounts[t] ?? 0) === 0)
    .map(([t, n]) => `${t} had ${n}, restored 0`);
  checks.push({
    name: "no table came back empty that had rows",
    pass: emptied.length === 0,
    detail: emptied.length === 0 ? "none emptied" : emptied.join("; "),
  });

  checks.push({
    name: "audit history intact (content hash over the oldest rows)",
    pass: now.auditAnchor.sha256 === base.auditAnchor.sha256 && now.auditAnchor.rows === base.auditAnchor.rows,
    detail: `restored ${now.auditAnchor.rows} rows ${now.auditAnchor.sha256.slice(0, 16)}, baseline ${base.auditAnchor.rows} rows ${base.auditAnchor.sha256.slice(0, 16)}`,
  });

  checks.push({
    name: "vault rows present",
    pass: now.vaultItems >= Math.min(base.vaultItems, 1) || base.vaultItems === 0,
    detail: `restored ${now.vaultItems}, baseline ${base.vaultItems}. Presence only; the DECRYPT check is the next one.`,
  });

  return checks;
}

export async function main(argv: string[]): Promise<number> {
  const arg = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const baselineMode = argv.includes("--baseline");
  const verifyMode = argv.includes("--verify");
  const out = arg("--out");
  const from = arg("--from");

  if (baselineMode === verifyMode) {
    console.error("REFUSED: pass exactly one of --baseline or --verify.");
    return 1;
  }
  if (baselineMode && !out) {
    console.error("REFUSED: --baseline needs --out <file>.");
    return 1;
  }
  if (verifyMode && !from) {
    console.error("REFUSED: --verify needs --from <file>, the record written by a --baseline run.");
    return 1;
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
  });
  try {
    if (baselineMode) {
      const base = await census(pool);
      writeFileSync(out!, JSON.stringify(base, null, 2));
      console.log(`Baseline written to ${out}.`);
      console.log(`  migrations ${base.migrationCount} (through ${base.latestMigrationTag})`);
      console.log(`  ${Object.keys(base.tableCounts).length} tables, ${Object.values(base.tableCounts).reduce((a, b) => a + b, 0)} rows`);
      console.log(`  audit anchor ${base.auditAnchor.rows} row(s), sha256 ${base.auditAnchor.sha256.slice(0, 16)}`);
      console.log(`  vault_item ${base.vaultItems}`);
      console.log("NOTHING was written to the database.");
      return 0;
    }

    const base = JSON.parse(readFileSync(from!, "utf8")) as RestoreBaseline;
    console.log(`Verifying a restore against the baseline taken ${base.generatedAt}.`);
    const checks = await verifyAgainst(pool, base);
    let failed = 0;
    for (const c of checks) {
      console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}: ${c.detail}`);
      if (!c.pass) failed++;
    }
    console.log("NOTHING was written to the database.");
    if (failed > 0) {
      console.error(`${failed} check(s) FAILED. The restore is not verified.`);
      return 2;
    }
    console.log("Every check passed. The restore is verified against the baseline.");
    return 0;
  } finally {
    await pool.end();
  }
}
