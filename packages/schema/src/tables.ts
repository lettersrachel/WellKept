// tables.ts - implements REQ-001/005/010/011/012/013/014/015
// Naming per WK-DEV-004 S2: snake_case, singular, uuid v7 ids,
// created_at/updated_at everywhere, household_id indexed on scoped tables.
// Source of truth for the field shape: WK-PLAY-001 via WK-APP-003 S1.
import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, index, pgEnum,
  primaryKey, uniqueIndex,
} from "drizzle-orm/pg-core";

export const sensitivityEnum = pgEnum("sensitivity", ["s1", "s2", "s3"]);
export const provenanceEnum = pgEnum("provenance", [
  "asked", "observed", "verified_by_touch", "client_written", "unconfirmed",
]);
export const fieldFlagEnum = pgEnum("field_flag", ["none", "CRITICAL", "CAUTION", "DELIGHT"]);
export const tierEnum = pgEnum("tier", ["essential", "family_ops", "concierge"]);
export const statusTagEnum = pgEnum("status_tag", [
  "ONBOARDING-90", "STEADY", "LIFE-EVENT", "WATCH", "RENEWAL-WINDOW", "CHAMPION",
]);
export const roleEnum = pgEnum("role", [
  "client", "house_manager", "backup_hm",
  "corporate_ops", "corporate_admin", "cfo_readonly",
]);

const stamps = {
  id: uuid("id").primaryKey(), // uuid v7 generated at the repository layer
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// REQ-010: the household record. Status tag drives app-wide behavior (REQ-041).
export const household = pgTable("household", {
  ...stamps,
  name: text("name").notNull(),
  tier: tierEnum("tier").notNull(),
  statusTag: statusTagEnum("status_tag").notNull().default("ONBOARDING-90"),
  isNda: boolean("is_nda").notNull().default(false), // REQ-006
  foundingRateLockUntil: timestamp("founding_rate_lock_until", { withTimezone: true }),
  membershipTerms: jsonb("membership_terms"),
  archivedAt: timestamp("archived_at", { withTimezone: true }), // nothing hard-deletes (DEV-005 S3)
});

// REQ-011/012: the field record, rich from day one (WK-APP-003 "why the field is rich").
// S3 VALUES ARE NEVER STORED HERE; the vault_item table holds them (REQ-013).
export const playbookField = pgTable("playbook_field", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  section: integer("section").notNull(), // 1..24, fixed; never renumber (DEV-005 S2)
  name: text("name").notNull(),
  value: text("value").notNull().default(""), // "" = unasked; "N/A-confirmed" is a VALUE
  note: text("note").notNull().default(""),
  sensitivity: sensitivityEnum("sensitivity").notNull(),
  provenance: provenanceEnum("provenance").notNull().default("unconfirmed"),
  provenanceDate: timestamp("provenance_date", { withTimezone: true }),
  provenanceActor: uuid("provenance_actor"),
  confirmed: boolean("confirmed").notNull().default(false),
  flag: fieldFlagEnum("flag").notNull().default("none"),
  photoRefs: jsonb("photo_refs"),
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }), // fields tombstone, never delete
}, (t) => [
  index("playbook_field_household_idx").on(t.householdId),
  index("playbook_field_section_idx").on(t.householdId, t.section),
]);

// REQ-013: the vault. Envelope-encrypted (libsodium sealed box, per-household
// data key wrapped by KMS, per WK-DEV-003). Ciphertext only; reveal is a
// server-side decrypt + audit row + 60s TTL, never a document render.
export const vaultItem = pgTable("vault_item", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  fieldId: uuid("field_id").notNull(), // the s3 playbook_field this backs
  ciphertext: text("ciphertext").notNull(),
  keyRef: text("key_ref").notNull(), // wrapped data-key reference (KMS)
}, (t) => [index("vault_item_household_idx").on(t.householdId)]);

// REQ-005: append-only audit. Every s3 read and every field write.
export const auditEvent = pgTable("audit_event", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  actorUser: uuid("actor_user").notNull(),
  actorRole: text("actor_role").notNull(),
  kind: text("kind").notNull(), // field_write | s3_reveal | s3_corporate_view | tag_change | import | export
  fieldId: uuid("field_id"),
  oldValueHash: text("old_value_hash"),
  newValueHash: text("new_value_hash"),
  detail: jsonb("detail"),
}, (t) => [index("audit_event_household_idx").on(t.householdId)]);

// REQ-031/032: one row per visit; the close flow fills it and it syncs as a unit.
export const visit = pgTable("visit", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  hmUser: uuid("hm_user").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  changesNoticed: text("changes_noticed"), // required before submit; "none" is a valid answer
  lifeChangeSignal: boolean("life_change_signal"), // yes routes corporate same day, never a proposal
  signalDetail: text("signal_detail"),
  zoneDriftNotes: text("zone_drift_notes").notNull().default(""),
  reportSentence1: text("report_sentence_1").notNull().default(""),
  reportSentence2: text("report_sentence_2").notNull().default(""),
  reportSentence3: text("report_sentence_3").notNull().default(""),
  photoCount: integer("photo_count").notNull().default(0),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  syncConflict: boolean("sync_conflict").notNull().default(false), // last-write-wins + conflict row
}, (t) => [index("visit_household_idx").on(t.householdId)]);

// Dots and gestures attach at the household level (WK-APP-003 S1).
export const dot = pgTable("dot", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  verbatim: text("verbatim").notNull(),
  heardAt: timestamp("heard_at", { withTimezone: true }).notNull(),
  heardBy: uuid("heard_by").notNull(),
  promotedFieldId: uuid("promoted_field_id"), // REQ-046: promotion fires attached triggers
}, (t) => [index("dot_household_idx").on(t.householdId)]);

export const gesture = pgTable("gesture", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  triggerSource: text("trigger_source").notNull(),
  idea: text("idea").notNull(),
  culturalFitChecked: boolean("cultural_fit_checked").notNull().default(false), // REQ-042 gate 1
  hmNotified: boolean("hm_notified").notNull().default(false), // REQ-042 gate 2
  executedAt: timestamp("executed_at", { withTimezone: true }),
  costCents: integer("cost_cents"), // money in integer cents (DEV-004 S3)
}, (t) => [index("gesture_household_idx").on(t.householdId)]);

// REQ-050/052: triggers bind to fields; packs are scheduled instances, not live queries.
export const triggerRule = pgTable("trigger_rule", {
  ...stamps,
  householdId: uuid("household_id"), // null = fleet-level library rule
  family: text("family").notNull(), // roster_age | calendar | threshold | signal | relationship | external
  bindsToFieldName: text("binds_to_field_name"),
  definition: jsonb("definition").notNull(), // versioned library content (corporate_admin editable)
  enabled: boolean("enabled").notNull().default(true),
});

export const promptPackItem = pgTable("prompt_pack_item", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  triggerRuleId: uuid("trigger_rule_id").notNull(),
  packName: text("pack_name").notNull(),
  itemText: text("item_text").notNull(),
  fireAt: timestamp("fire_at", { withTimezone: true }).notNull(), // household-local computed upstream
  firedAt: timestamp("fired_at", { withTimezone: true }),
  suppressedByTag: boolean("suppressed_by_tag").notNull().default(false), // LIFE-EVENT holds, not deletes
}, (t) => [index("prompt_pack_item_household_idx").on(t.householdId)]);

// REQ-022: client edits land in review state, merge only on HM approval, full diff kept.
export const clientEdit = pgTable("client_edit", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  fieldId: uuid("field_id").notNull(),
  proposedValue: text("proposed_value").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | declined
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (t) => [index("client_edit_household_idx").on(t.householdId)]);

// REQ-033: stranger test records.
export const strangerTest = pgTable("stranger_test", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  coveredBy: uuid("covered_by").notNull(),
  frictionNotes: jsonb("friction_notes").notNull(),
  passed: boolean("passed").notNull(),
});

// DEV-005 S2: movable observances come from a maintained calendar table, never computed.
export const movableObservance = pgTable("movable_observance", {
  ...stamps,
  name: text("name").notNull(), // Eid, Passover, Lunar New Year, Diwali, ...
  year: integer("year").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
});

// ---------------------------------------------------------------------------
// Auth (ported from the July 12 foundation repo's proven Auth.js integration).
// Auth.js manages auth_user/account/session/verification_token through
// @auth/drizzle-adapter (database sessions: revocable by deleting the row;
// the Email provider supports nothing else anyway). Text ids here are Auth.js
// convention; everything domain-side stays uuid.
// ---------------------------------------------------------------------------

export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
});

export const authAccount = pgTable("auth_account", {
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const authSession = pgTable("auth_session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const authVerificationToken = pgTable("auth_verification_token", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

// Maps an authenticated user to the single role they hold at a given
// household (unique on user x household). The role ALWAYS comes from this
// server-side table, never from anything the client supplies; a routing
// householdId only selects which row to read. Multiple rows per user across
// households is how backup HMs and corporate coverage work; there is no
// "sees every household" wildcard.
export const householdRoleAssignment = pgTable("household_role_assignment", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  householdId: uuid("household_id").notNull().references(() => household.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  ndaApproved: boolean("nda_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("household_role_assignment_user_household_unique").on(t.userId, t.householdId)]);

// One row per command from @wellkept/close-flow's submit() (visit.submit,
// dot.create, signal.route), drained by @wellkept/offline-queue. id IS the
// command's idempotencyKey: redelivery (a device retrying after a flaky
// reconnect) is a plain insert conflict — a safe no-op, not a domain
// conflict. A domain conflict (status='conflict') is a second, distinct
// visit.submit for a household that already has one applied the same day;
// stored, never dropped, so corporate can review (last-write-wins per
// REQ-032). Ported from the July 12 foundation repo.
export const visitCommand = pgTable("visit_command", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // visit.submit | dot.create | signal.route
  householdId: uuid("household_id").notNull().references(() => household.id),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull(), // applied | conflict
  reason: text("reason"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("visit_command_household_received_idx").on(t.householdId, t.receivedAt)]);

// REQ-014: the structured registries. One table, seven kinds — see
// docs/adr/002-registries-single-table.md for the decision and its
// revisit triggers. key_date is the single column the trigger engine
// queries across every kind; sensitivity reuses the tested matrix.
export const registryKindEnum = pgEnum("registry_kind", [
  "dates", "sizes", "appliance", "vendor", "subscription", "commitment", "horizon",
]);

export const registryEntry = pgTable("registry_entry", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  kind: registryKindEnum("kind").notNull(),
  label: text("label").notNull(),
  detail: jsonb("detail").notNull().default({}),
  keyDate: timestamp("key_date", { withTimezone: true }),
  cadence: text("cadence"),
  sensitivity: sensitivityEnum("sensitivity").notNull().default("s1"),
  sourceFieldId: uuid("source_field_id"),
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }), // tombstone, never delete
}, (t) => [
  index("registry_entry_household_idx").on(t.householdId),
  index("registry_entry_household_kind_idx").on(t.householdId, t.kind),
]);
