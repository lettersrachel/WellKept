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
  visit_photo: {
    category: "document and media manifest",
    why: "RULED into member scope (founder ruling B, docs/FOUNDER_RULINGS_2026-09-04_NoDependency.md), on the distinction the exporter already implements: a manifest of content_sha256 and metadata is not an image. IMAGE BYTES ARE NEVER ADMITTED TO ANY ARCHIVE AT ANY SCOPE, which the projection enforces on the way out and the restore enforces by not writing photo rows at all. legal/README.md carries the settling sentence.",
  },
  audit_event: {
    category: "audit metadata",
    why: "the append-only trail, which is the phrase verbatim. Subjects are ADR-006 TOKENS and audit_subject_token is excluded from every scope, so the trail says what happened without naming staff.",
  },
};

/**
 * THE ALLOW-LIST IS TOTAL OVER THE CORPORATE SET (founder ruling, 5
 * September 2026, ruling 1 of the Q-8b acceptance). Every table in the
 * corporate archive carries an explicit decision: MEMBER_SCOPE above, or
 * a written reason here. A table with NO entry fails the guard rather
 * than defaulting quietly to corporate-only.
 *
 * The reason is the erasure-coverage floor applied to a second question,
 * and it is the same property: the author must DECIDE, not merely omit.
 * The first version of this module left thirty-five tables out by
 * saying nothing about them, so "considered and left out" and "never
 * considered" were the same absence, and a table added tomorrow would
 * have joined that silence. Writing it down is what leaves the trace.
 *
 * "Corporate-only" is not a judgment that the fact is secret. It is the
 * narrower claim that the portability line does not name it, or that
 * another standing rule keeps it off a member-reaching artifact.
 */
export const CORPORATE_ONLY: Record<string, string> = {
  // The anticipation engine and its own bookkeeping. None of it is a
  // fact ABOUT the household; it is how the company decides what to
  // notice, and the portability line names no category for it.
  anticipation_exclusion: "engine tuning: which objects or topics are suppressed from anticipation, with the corporate approver. A record of the company's own noticing rules, not of the household.",
  trigger_rule: "the company's rule set. Which conditions raise attention is Well Kept's method, and STD-016's change control governs it; a household's copy of the record does not carry the method.",
  prompt_pack_item: "scheduled engine output, and Q-5's stage tag lives here. Spec section 5 makes the stage internal to the point that both client-payload mechanisms forbid the key by name.",
  prompt_outcome: "one row per prompt answered by a staff member, used to retire rules that do not earn their place. About the RULE, not the household.",
  season_observation: "repeat-season recall the engine builds for itself. Superseded rather than deleted, versioned as engine memory.",
  shadow_log: "internal engine output about the household, named by the founder's ruling. Its erasure treatment is DELETE for the same reason.",
  stranger_test: "records of the stranger-mode projection being exercised. A test of the software, kept against the household id for tenancy.",
  situation: "the bundling of related noticing into one thing a person meets once. Bundling is a corporate judgment in v1 and the label is the bundler's words.",
  attention_record: "internal noticing with its firewall destination. The record that the company paid attention, in the company's own vocabulary.",
  visit_brief_snapshot: "the evidence rail: exactly what a staff member was shown before a visit. Its value is as proof of what the company did, and it carries the staff projection verbatim.",

  // Staff-authored internal records. Each is a person's working note,
  // and in four cases legal/README.md says in as many words that it is
  // never shown to the client.
  dot: "verbatim staff observations. legal/README.md: never shown to the client.",
  incident_report: "complaints, breakages, injuries and near-misses with the resolver's note. legal/README.md: internal, never shown to the client in the app.",
  paused_decision: "research a staff member paused, named by the founder's ruling. Its own table comment reads INTERNAL: no client projection exists at all.",
  condition_flag: "a staff member's concern in their own words, with a revisit trigger. The condition_flag class erases by DELETE precisely because it is the staff member's note rather than a business record.",
  object_observation: "the repeated-observation series behind a flag or an object. Staff observation, and the series is how the company decides something is worsening.",
  capture_artifact: "the HOM's pre-filing words, named by the founder's ruling. Tell Well Kept is the staff member speaking to the company.",
  work_item: "internal work tracking, staff-only by default (s2) by its own design.",
  decision_record: "one routed corporate choice with its authority rule and decider. Its own comment records that the client audience is deliberately absent until the freeze lifts.",
  gesture: "CORRECTED 5 September 2026: the first version of this reason called this interaction telemetry about the software, and it is not. REQ-042: a thoughtful act toward the household, carrying the idea in words, the two approval gates, when it was executed and what it cost. It is a household fact and arguably outcome history. It stays corporate-only because nothing has yet decided a member should see the company deliberating about a gesture toward them, and because the idea text is the company thinking aloud rather than a record of what happened. A candidate for the member scope if the founder rules it, unlike everything else in this group.",
  client_edit: "RULED corporate-only (founder ruling A, docs/FOUNDER_RULINGS_2026-09-04_NoDependency.md). Half the row is the member's own words and half is an internal review disposition, and a row carrying both would ship a staff judgment about the member's edit under the guise of returning their own text. The member half becomes its own build: a projection of the member-authored text alone, asserted in the shape the exporter already uses rather than hand-listed. Queue row Q-8c.",

  // Duration-carrying tables. D7 (register A564) bars a duration from a
  // client surface, and these carry one either as a column or inside a
  // payload. This is a rule keeping them out, not a judgment that the
  // household should not know.
  visit: "the visit row the close flow fills, which travels as a unit with visit_command's hours. Held by D7 with visit_command; see the freeze packet's first ruling.",
  visit_command: "the applied visit, whose jsonb payload carries the HOURS. D7 bars a duration from a client surface, and which keys to drop inside a jsonb column is a decision nobody has made.",
  time_entry: "wage-time records, duration by definition, and a wage record besides.",
  time_segment: "derived service-time segments. The duration is computed from the window rather than stored, which changes nothing about D7.",
  estimate_snapshot: "internal duration estimates for a work requirement. D7, and estimates are the company's planning rather than the household's record.",
  task_occurrence: "what actually happened for a requirement, carrying actual minutes. D7.",
  work_requirement: "planned recurring instances, the forecasting unit, and the parent of the estimate and occurrence rows that D7 holds. Out with them so the member scope does not carry a skeleton whose content is absent.",
  household_task_profile: "how a reusable task manifests here, with s2 how-they-want-it-done notes and the company's cadence in words. Durations are absent by construction; the s2 notes are the reason.",

  commitment_ledger_item: "the Commitment Ledger (0067): what the company committed to, who is accountable for it, what was asked of the household and how it closed under the Handled invariant. CORPORATE-ONLY BY THE FREEZE, not by a judgment that the household should not know: the member decision inbox is Q-6's freeze-gated half and waits for the 25 September two-key decision, so the export cannot ship the record of member-facing asks ahead of the surface that makes them (the decision_right posture, one row over). A member scope for it is a candidate the moment the freeze lifts, and it carries a staff accountable_owner, which is its own question then.",

  // Delivery and event plumbing. The portability line names audit
  // metadata, which is audit_event; none of these is that.
  event_outbox: "the internal event bus. Envelope plumbing, and its provenance answers a different question from audit metadata.",
  notification: "in-app notification delivery. The notification class erases by DELETE; the record that matters is the thing notified about.",
  mail_outcome: "provider delivery telemetry: bounces, complaints and delivery ids from Resend. Plumbing carrying the member's address, erased by DELETE for that reason.",

  // Money and commercial standing.
  cost_entry: "costs recorded against the household. D7 does not bar money, but R25 rules that the monthly itemized statement is the transparency commitment for the launch cohort and an always-available billing history is not shipped.",
  membership_event: "membership and tier history with cause codes, and a cause code is the company's characterization of why a household left.",

  // Named by the founder, freeze-gated on its own account.
  decision_right: "what the household wants decided on its behalf, named by the founder's ruling. Its member-facing surface is itself freeze-gated (Q-6-1), so the export cannot ship it ahead of the surface.",

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
