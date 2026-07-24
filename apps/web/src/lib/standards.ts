/**
 * The standards store, as the briefing read path consumes it (Addendum A1;
 * brief T4). The provision set is BUNDLED at build time from the seed — the
 * airplane test: rendering a briefing never takes a network dependency on the
 * store. The database is consulted only for the standards.seed_reviewed gate,
 * which stays false until the founder's corrected seed loads (db:provisions
 * --reviewed); until then every portal renders zero provisions.
 *
 * The docx library remains the authored source; when a corrected seed ships,
 * this bundle updates with the release, which is exactly the "provision
 * version in force on that date" semantics the spec wants.
 */
import { eq } from "drizzle-orm";
import {
  appSetting, provisionSeedRowSchema, seedRowToProvision,
  type StandardProvision,
} from "@wellkept/schema";
import provisionsSeedJson from "../../../../tooling/seed/provisions_seed.json";
import { db } from "./db";

let cache: Map<string, StandardProvision> | null = null;

/** provision id -> provision, validated once per process from the bundled seed. */
export function provisionsById(): ReadonlyMap<string, StandardProvision> {
  if (!cache) {
    cache = new Map(
      (provisionsSeedJson as unknown[]).map((row) => {
        const p = seedRowToProvision(provisionSeedRowSchema.parse(row));
        return [p.id, p] as const;
      }),
    );
  }
  return cache;
}

/** The T4 gate: provisions render only after the corrected seed loads. */
export async function standardsSeedReviewed(): Promise<boolean> {
  try {
    const [row] = await db.select().from(appSetting)
      .where(eq(appSetting.key, "standards.seed_reviewed"));
    return row?.value === true;
  } catch {
    return false; // fail dark: no flag row, no table yet, no rendering
  }
}
