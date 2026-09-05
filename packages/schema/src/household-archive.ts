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
 *
 * THE TWO SCOPES RUN THEIR DEFAULTS IN OPPOSITE DIRECTIONS, and that is
 * the design rather than an inconsistency (founder ruling, 5 September
 * 2026, ruling 3). The CORPORATE archive fails by being incomplete, so
 * everything is in and the written list is the deny side. The MEMBER
 * archive fails by handing a household internal material, so nothing is
 * in and the written list is the allow side: each entry names the
 * phrase in the portability line that admits it, and a table added
 * tomorrow joins the corporate archive automatically and the member
 * archive never, until someone names its category in a reviewed change.
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

/**
 * The portability line's own nine phrases, quoted rather than
 * paraphrased, because the member scope's rule is "what the portability
 * line NAMES" and a paraphrase would quietly widen it. Source:
 * docs/intake/2026-09-03-build-package/BENCHMARK_ADOPTION.md section 2,
 * plan-of-record.
 */
export const PORTABILITY_CATEGORIES = [
  "canonical household structure",
  "document and media manifest",
  "vendor history",
  "asset history",
  "work history",
  "outcome history",
  "preferences and standing rules",
  "access history",
  "audit metadata",
] as const;
export type PortabilityCategory = (typeof PORTABILITY_CATEGORIES)[number];

export type ArchiveScope = "corporate" | "member";
export const ARCHIVE_SCOPES: ArchiveScope[] = ["corporate", "member"];

/**
 * The MEMBER scope's allow-list. A table is in only if it names the
 * portability phrase that admits it AND the tree has already decided
 * that its content reaches the household, so this list restates
 * decisions rather than making them. Everything absent is out.
 *
 * Kept deliberately SMALL. The founder's ruling names four tables to
 * exclude and then a rule ("anything else the portability line does not
 * name"), and applying that rule table by table is a taxonomy exercise
 * over forty-one tables. Rather than invent one, this list admits only
 * what something else already decided, and the session log reports the
 * categories that are consequently EMPTY and what blocks each. Growing
 * it is a reviewed line, which is the right cost for a decision about
 * what a household receives.
 */
export const MEMBER_SCOPE: Record<string, { category: PortabilityCategory; why: string }> = {
  playbook_field: {
    category: "canonical household structure",
    why: "the household record itself. S1 ROWS ONLY, by the row filter below: s2 is internal ops and s3 is secured, and the client projection has always been the s1 subset, so the export inherits that decision instead of taking a new one.",
  },
  registry_entry: {
    category: "asset history",
    why: "appliances, vendors, subscriptions and important dates. Already rendered on the client projection (RegistryCard reaches the client preview), so its member-visibility is decided.",
  },
  deferral: {
    category: "outcome history",
    why: "client-facing by design (W-6): the projection carries the content and never the attribution, and the client card splits open from since-taken-care-of. The only work-and-outcome table with a decided client projection.",
  },
  preference_rule: {
    category: "preferences and standing rules",
    why: "the household's own operating facts in words, which is the phrase verbatim. Provenance rides along, so a member can see which rules they stated and which the company inferred.",
  },
  household_role_assignment: {
    category: "access history",
    why: "who held what role on this household and when, which is the phrase verbatim. Safe to carry because the people table is pseudonymised: a member learns that access existed and its shape, not who held it.",
  },
  audit_event: {
    category: "audit metadata",
    why: "the append-only trail, which is the phrase verbatim. Subjects are ADR-006 TOKENS and audit_subject_token is excluded from every scope, so the trail says what happened without naming staff.",
  },
};

/**
 * Row filters applied in the MEMBER scope only. Today there is one, and
 * it exists because a table can be member-visible while some of its ROWS
 * are not: `playbook_field` is the whole household record and the client
 * projection is its s1 subset. Without this the member archive would
 * hand over every s2 internal-ops value, which no surface does.
 */
export const MEMBER_ROW_FILTERS: Record<string, string> = {
  playbook_field: "sensitivity = 's1'",
};

/**
 * Tables outside the household set that the archive must carry for the
 * restore to satisfy its foreign keys (founder ruling, 5 September 2026,
 * ruling 2). Only the REFERENCED rows travel, not the whole catalog: a
 * household's archive is not the place to ship the company's entire
 * reusable work catalog, and the FK closure needs only what is pointed at.
 */
export const REFERENCED_GLOBAL_TABLES: Record<string, { via: string; column: string; why: string }> = {
  task_definition: {
    via: "household_task_profile",
    column: "task_definition_id",
    why: "global reusable work semantics with no member data by its own design, so carrying the referenced rows adds nothing about anybody and is what lets household_task_profile restore at all.",
  },
};

/**
 * PEOPLE ARE PSEUDONYMISED, and this is the whole of what travels
 * (founder ruling, 5 September 2026, ruling 1, shape 2). Thirty-eight
 * foreign keys from twenty-six archived tables point at `auth_user`, and
 * twenty of those columns are NOT NULL, so nulling the references is not
 * available: the archive either carries people or does not restore.
 *
 * `auth_user` is id, name, email, email_verified, image, is_tester, so
 * carrying it whole would put the names and email addresses of every
 * staff person who ever touched the household inside the household's own
 * exported record. This system already tokenises audit identity rather
 * than exporting it (ADR-006), and the member-facing control over this
 * artifact is one ruling from shipping. So the archive carries the ID and
 * a ROLE LABEL and nothing else.
 *
 * The role is the role that person holds ON THIS HOUSEHOLD, read from
 * household_role_assignment, and it is NULL when they hold none. NULL
 * rather than a coined label such as "staff": inventing a value here
 * would be choosing a vocabulary, and a null is the true statement that
 * this person touched the record without holding a role on it.
 */
export const ARCHIVE_PERSON_EMAIL_DOMAIN = "archived.invalid";
export interface ArchivePerson { id: string; role: string | null }

/** The pseudonymous address for a restored person. RFC 2606 reserves
 *  `.invalid`, so it is visibly not an address and can never route. */
export function archivePersonEmail(id: string): string {
  return `${id}@${ARCHIVE_PERSON_EMAIL_DOMAIN}`;
}

export interface ArchiveTable { table: string; key: string; projected: boolean }

/**
 * The archive's table set for a scope.
 *
 * CORPORATE: every table with a household column, minus the written
 * exclusions, computed from the schema at runtime so a table added
 * tomorrow is in the archive without anyone remembering to add it.
 *
 * MEMBER: the same computed set INTERSECTED with the MEMBER_SCOPE
 * allow-list, so a new table is out until its category is named. The
 * intersection is deliberate rather than reading the allow-list alone:
 * a member-scope entry naming a table that no longer carries a
 * household column would otherwise pass unnoticed, and the guard checks
 * that direction too.
 */
export function archiveTableSet(scope: ArchiveScope): ArchiveTable[] {
  const out: ArchiveTable[] = [];
  for (const [key, value] of Object.entries(tables)) {
    if (!is(value, PgTable)) continue;
    const cols = getTableColumns(value as PgTable);
    if (!Object.values(cols).some((c) => c.name === "household_id")) continue;
    const name = getTableName(value as PgTable);
    if (ARCHIVE_EXCLUSIONS[name]) continue;
    if (scope === "member" && !MEMBER_SCOPE[name]) continue;
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
  scope: ArchiveScope;
  generatedAt: string;
  householdId: string;
  migrationCount: number;
  tables: string[];
  exclusions: Record<string, string>;
  projections: Record<string, string>;
  rowFilters: Record<string, string>;
  globals: Record<string, number>;
  peopleCount: number;
  rowCounts: Record<string, number>;
  /** Stated in the archive rather than left to be discovered on restore. */
  knownLosses: string[];
}

/**
 * Bumped from 1 to 2 by the 5 September rulings. A version 1 archive has
 * no scope, no people section and no globals, so it cannot restore under
 * this importer at all, and the importer refuses it at the door rather
 * than failing on a foreign key halfway through.
 */
export const ARCHIVE_FORMAT_VERSION = 2;

/**
 * Losses every archive carries. The scope-specific ones are appended by
 * the exporter, because a loss that is true of one scope and not the
 * other would read as universal sitting here.
 */
export const ARCHIVE_KNOWN_LOSSES = [
  "Secured (S3) values are absent: vault_item is excluded by design and nothing here is decrypted. A restored household has its secured FIELDS with no values behind them.",
  "Audit rows keep their subject TOKENS and cannot be dereferenced to people, because audit_subject_token is excluded.",
  "People are PSEUDONYMISED: the archive carries each referenced person's id and the role they held on this household, and never a name or an email address. A restored household can tell that two rows were written by different people and can never tell who they were.",
];

/**
 * The photo loss, stated separately because it is TWO losses and the
 * second one only became true when the restore was built. The manifest
 * travels in the archive file; the restored DATABASE does not get the
 * rows at all, because `visit_photo.data` is NOT NULL and inserting a
 * placeholder would write a photo row with empty bytes, which is a
 * claim rather than a gap. So the archive knows which photos existed
 * and the restored database does not.
 */
export const ARCHIVE_PHOTO_LOSS =
  "Photo bytes are absent: visit_photo exports as a manifest with a content hash, and the RESTORE skips those rows entirely rather than inserting empty bytes into a NOT NULL column. The archive file records which photos existed; the restored database does not carry them.";
