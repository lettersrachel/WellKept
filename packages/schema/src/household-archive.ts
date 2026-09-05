/**
 * household-archive.ts : the provider-independent export set.
 *
 * Q-8b. Authority: the intaken portability line (BENCHMARK_ADOPTION
 * section 2, plan-of-record), which asks for "provider-independent
 * export of canonical household structure, document and media manifest,
 * vendor, asset, work and outcome history, preferences and standing
 * rules, access history and audit metadata". Maple's shutdown is the
 * reason it exists: a household's record has to be able to leave.
 *
 * THE TABLE SET IS COMPUTED, which is the whole design. The acceptance
 * says the archive restores a COMPLETE household, and a hand-written
 * list cannot make that claim for longer than it takes someone to add a
 * table: the list would keep passing its own tests while the archive
 * silently stopped being complete. So every table carrying a
 * `household_id` column is IN by default, discovered by introspection
 * at runtime, and each exclusion is a written entry below.
 *
 * This is the G-78 posture pointed the other way. There the danger was
 * a new column reaching a member by default, so the answer was an
 * explicit allow-list. Here the danger is a new table NOT reaching an
 * archive that claims completeness, so the default inverts and the
 * written list is the deny side.
 */
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as tables from "./tables.ts";

/** Tables kept OUT of the archive, each with the reason it is out. */
export const ARCHIVE_EXCLUSIONS: Record<string, string> = {
  vault_item:
    "the S3 vault. The authorization is explicit that secured values enter only under a " +
    "separate authorized reveal and never in the default archive. Excluding the CIPHERTEXT " +
    "rather than merely declining to decrypt also means an archive is not an offline attack " +
    "surface against the vault.",
  audit_subject_token:
    "the ADR-006 mapping whose DELETION is how audit identity is erased, and it maps tokens to " +
    "people including STAFF addresses, which are the company's rather than the household's. The " +
    "audit trail itself exports whole with its tokens intact, so the record of WHAT happened is " +
    "complete; a restored archive cannot dereference a token to a person, which is the correct " +
    "loss and is stated in the manifest rather than left to be discovered.",
};

/**
 * Tables exported as a PROJECTION rather than whole. `visit_photo` is
 * the only one: photo bytes live in the database and the portability
 * line asks for a "document and media MANIFEST" in its own words.
 *
 * THE PROJECTION NAMES WHAT IT DROPS, NOT WHAT IT KEEPS, and the
 * difference is not stylistic. A keep-list is a hand-written column
 * list, which is the drift shape this whole module exists to avoid: a
 * column added to visit_photo tomorrow would silently fall out of the
 * manifest while every test still passed. Naming the ONE column that is
 * replaced by a hash keeps the archive's default (everything is in)
 * true one level down. The first version of this file used a keep-list
 * and was wrong about three column names on its first real run; the
 * assertion caught it, and inverting the list is what stops the next
 * one.
 */
export const ARCHIVE_PROJECTIONS: Record<string, { dropForHash: string; why: string }> = {
  visit_photo: {
    dropForHash: "data",
    why: "a media MANIFEST in the portability line's own words: every column except the bytes, plus a content hash in their place, so a restored archive can prove which photo a row refers to when the bytes are supplied separately",
  },
};

export interface ArchiveTable { table: string; key: string; projected: boolean }

/**
 * Every table with a household column, minus the written exclusions.
 * Computed from the schema at runtime, so a table added tomorrow is in
 * the archive without anyone remembering to add it.
 */
export function archiveTableSet(): ArchiveTable[] {
  const out: ArchiveTable[] = [];
  for (const [key, value] of Object.entries(tables)) {
    if (!is(value, PgTable)) continue;
    const cols = getTableColumns(value as PgTable);
    if (!Object.values(cols).some((c) => c.name === "household_id")) continue;
    const name = getTableName(value as PgTable);
    if (ARCHIVE_EXCLUSIONS[name]) continue;
    out.push({ table: name, key, projected: Boolean(ARCHIVE_PROJECTIONS[name]) });
  }
  return out.sort((a, b) => a.table.localeCompare(b.table));
}

/** Every household-referencing table, including the excluded ones. */
export function householdReferencingTables(): string[] {
  const out: string[] = [];
  for (const value of Object.values(tables)) {
    if (!is(value, PgTable)) continue;
    const cols = getTableColumns(value as PgTable);
    if (Object.values(cols).some((c) => c.name === "household_id")) out.push(getTableName(value as PgTable));
  }
  return out.sort();
}

/** The archive's own shape, so a reader knows what it is holding. */
export interface ArchiveManifest {
  formatVersion: number;
  generatedAt: string;
  householdId: string;
  migrationCount: number;
  tables: string[];
  exclusions: Record<string, string>;
  projections: Record<string, string>;
  rowCounts: Record<string, number>;
  /** Stated in the archive rather than left to be discovered on restore. */
  knownLosses: string[];
}

export const ARCHIVE_FORMAT_VERSION = 1;

export const ARCHIVE_KNOWN_LOSSES = [
  "Secured (S3) values are absent: vault_item is excluded by design and nothing here is decrypted. A restored household has its secured FIELDS with no values behind them.",
  "Photo bytes are absent: visit_photo exports as a manifest with a content hash. A restored household knows which photos existed and cannot display them.",
  "Audit rows keep their subject TOKENS and cannot be dereferenced to people, because audit_subject_token is excluded.",
];
