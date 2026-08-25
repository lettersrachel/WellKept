// tables.ts - implements REQ-001/005/010/011/012/013/014/015
// Naming per WK-DEV-004 S2: snake_case, singular, uuid v7 ids,
// created_at/updated_at everywhere, household_id indexed on scoped tables.
// Source of truth for the field shape: WK-PLAY-001 via WK-APP-003 S1.
import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, integer, smallint, boolean, timestamp, jsonb, index, pgEnum,
  primaryKey, uniqueIndex, date, check,
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

// Capture session 3 (CORPORATE_CAPTURE_SESSIONS.md, founder decisions
// 2026-07-27): how a household found Well Kept. Recorded once — "you will
// remember for household one; you will not remember for household twenty."
export const referralSourceEnum = pgEnum("referral_source", [
  "client_referral", "professional_referral", "personal_network",
  "community", "press_or_search", "other",
]);

// REQ-010: the household record. Status tag drives app-wide behavior (REQ-041).
export const household = pgTable("household", {
  ...stamps,
  name: text("name").notNull(),
  tier: tierEnum("tier").notNull(),
  statusTag: statusTagEnum("status_tag").notNull().default("ONBOARDING-90"),
  isNda: boolean("is_nda").notNull().default(false), // REQ-006
  foundingRateLockUntil: timestamp("founding_rate_lock_until", { withTimezone: true }),
  membershipTerms: jsonb("membership_terms"),
  // LAUNCH.md 1.5: the client-side counterpart of nda_approved. ADR-001
  // guardrail 3 gates real household data on written consent; these columns
  // record THAT the signed consent exists (when, which doc version, recorded
  // by whom) — the paper stays the artifact, this is the system's sight of it.
  consentSignedAt: timestamp("consent_signed_at", { withTimezone: true }),
  consentDocVersion: text("consent_doc_version"),
  consentRecordedBy: text("consent_recorded_by"),
  // The smoke-test fixture flag (G-23 / deploy runbook phase 3): a permanent
  // non-client household the post-deploy checklist writes against. Excluded
  // from fleet roll-ups, economics totals, and the weekly digest; marked
  // visibly wherever it still appears; exempt from go-live archiving BY
  // THIS COLUMN, not by name.
  isFixture: boolean("is_fixture").notNull().default(false),
  // Capture session 3: the referral channel (LTV:CAC's CAC side starts
  // here) plus an optional note ("other" wants one; a professional
  // referral's name belongs here too).
  referralSource: referralSourceEnum("referral_source"),
  referralNote: text("referral_note"), // s2
  archivedAt: timestamp("archived_at", { withTimezone: true }), // nothing hard-deletes (DEV-005 S3)
});

// Capture session 3: membership state changes as EVENTS — commercial
// history is reconstructable from the sequence, cohort retention needs the
// dates, and a cancellation carries its reason and initiator (the brief's
// done-when). Tier names are the SHIPPED tier enum (founder decision
// 2026-07-27 — same reconciliation pattern as session A); price is
// recorded per event in integer cents (DEV-004 S3). ADR-004 holds:
// QuickBooks bills — this records that a state changed, never that money
// moved. Append-only; corrections append a superseding event.
export const membershipEventKindEnum = pgEnum("membership_event_kind", [
  "start", "tier_change", "pause", "resume", "cancel",
]);

export const membershipEvent = pgTable("membership_event", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  kind: membershipEventKindEnum("kind").notNull(),
  effectiveOn: date("effective_on").notNull(),
  tier: tierEnum("tier"), // set on start and tier_change
  priceCents: integer("price_cents"), // the price at this event, where one applies
  reason: text("reason"), // required on cancel (enforced in the action), s2
  initiatedBy: text("initiated_by"), // client | corporate — required on cancel
  // REQ-083 churn-with-cause, taxonomy v1 adopted 24 Aug 2026 evening
  // (section 8 default under the proceed-with-recommendations
  // authorization; see FOUNDER_INPUTS_2026-08-24_EVENING.md). Required on
  // cancel at the action, the reason/initiatedBy pattern; the vocabulary
  // is a DB CHECK. Household-level by construction, never per-person.
  causeCode: text("cause_code"),
  recordedBy: text("recorded_by").notNull().references(() => authUser.id),
}, (t) => [
  index("membership_event_household_idx").on(t.householdId, t.effectiveOn),
  // The six adopted codes; other_documented requires the reason column's
  // note by the action's done-when. NULL passes (non-departure kinds, and
  // rows predating the taxonomy).
  check("membership_event_cause_code_known",
    sql`${t.causeCode} IS NULL OR ${t.causeCode} IN ('relocated','ended_by_member','ended_by_company','financial','life_event','other_documented')`),
]);

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
  // Stranger-mode ruling (c), 24 Aug 2026 (proceed-with-recommendations):
  // stranger mode hides every s2 surface EXCEPT fields a human explicitly
  // marked stranger-visible (the safety exceptions: an allergy a covering
  // stranger must know). Safe default hidden; s3 never shows in stranger
  // mode, marker or not. The marker is set at capture or corporate review,
  // never inferred, so no engineer ever chooses the safety list.
  strangerVisible: boolean("stranger_visible").notNull().default(false),
  photoRefs: jsonb("photo_refs"),
  // Addendum A1 S4: provision ids governing this field (null = none bound).
  // FK-checked in app code, not the DB — provisions tombstone, never delete.
  governingProvisions: text("governing_provisions").array(),
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

// Direction 3b (PLACEHOLDER_DIRECTIONS.md, 1 August 2026, G-58): the WATCH
// read found escalate-only does not already exist under another name -
// WATCH is a separate, tag-triggered alert (a corporate email on visit
// close, an HM push on tag-set) with no connection to this table at all,
// not a per-candidate routing decision. This column is the placeholder the
// direction asks for: it belongs on the emitted item, never the household,
// because a household can need escalate-only for one domain (a billing
// dispute) while the sentinel sweep still needs to reach the client
// normally. Default is computed from what an item actually does TODAY
// (data.ts's briefing query reads promptPackItem for the HM briefing; no
// client-portal surface renders it directly; corporate sees it in the
// oversight pages regardless) - 'hm' for every existing and new row, so
// this migration changes no behaviour. Nothing routes differently until a
// future session reads this column and wires escalate-only against it.
export const promptItemRoutingEnum = pgEnum("prompt_item_routing", ["client", "hm", "corporate", "none"]);

export const promptPackItem = pgTable("prompt_pack_item", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  triggerRuleId: uuid("trigger_rule_id").notNull(),
  // M (round six): pack_key is the stable IDENTIFIER exclusion matching
  // uses; pack_name is display copy a voice pass may touch freely. Keys
  // were minted equal to the names at the split, so nothing changed then.
  packKey: text("pack_key").notNull(),
  packName: text("pack_name").notNull(),
  itemText: text("item_text").notNull(),
  fireAt: timestamp("fire_at", { withTimezone: true }).notNull(), // household-local computed upstream
  firedAt: timestamp("fired_at", { withTimezone: true }),
  suppressedByTag: boolean("suppressed_by_tag").notNull().default(false), // LIFE-EVENT holds, not deletes
  // A2/REQ-055: the prompt's own target date (a sweep item's occurrence);
  // null for event-driven items. lead_days calibration reads this.
  targetDate: date("target_date"),
  routedTo: promptItemRoutingEnum("routed_to").notNull().default("hm"),
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
  // Tester provisioning (HG, 2026-08-25): an external tester holds a real
  // role with real permissions; THIS flag is the single filter that keeps
  // their events out of every covenant, payroll, and learning computation
  // (the exclusion contract those computations must honor when built).
  // Never a permission bit: access is the role's, exclusion is this.
  isTester: boolean("is_tester").notNull().default(false),
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
  // REQ-003 step-up: stamped when this session clears the TOTP second factor.
  // Per-session (not per-user) so signing out / revoking a session also drops
  // its MFA state; the Auth.js adapter ignores this extra column.
  mfaSatisfiedAt: timestamp("mfa_satisfied_at", { withTimezone: true }),
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

// REQ-003 staff second factor. One TOTP secret per user (not per household —
// a backup HM covering three homes enrolls once). The secret is stored ONLY
// sealed: `secretBox` is the AES-256-GCM box, `wrappedKey` the KMS-wrapped
// data key, mirroring the vault envelope — plaintext never lands in a column.
// confirmedAt is null until the user proves possession with a first code;
// an unconfirmed row is a pending enrollment that grants nothing.
export const userTotp = pgTable("user_totp", {
  userId: text("user_id").primaryKey().references(() => authUser.id, { onDelete: "cascade" }),
  secretBox: text("secret_box").notNull(),
  wrappedKey: text("wrapped_key").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// REQ-003 recovery: single-use backup codes issued at enrollment, so a lost
// authenticator doesn't require an admin reset (which the sole corporate_admin
// couldn't obtain). Only the SHA-256 hash is stored — the plaintext is shown
// once. usedAt stamps the moment a code is redeemed; a used code is spent.
export const userBackupCode = pgTable("user_backup_code", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("user_backup_code_user_idx").on(t.userId)]);

// In-app notifications (REQ-052-ish). Created when corporate flags a household
// (WATCH/LIFE-EVENT); surfaced to the household's house managers in the app.
// The same rows can later drive real device push once there's an EAS build —
// the delivery channel changes, the record doesn't.
export const notification = pgTable("notification", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  householdId: uuid("household_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("notification_user_idx").on(t.userId, t.readAt)]);

// Web-push subscriptions (installed-PWA lock-screen notifications). One row per
// browser/device endpoint; the keys encrypt the push payload. Dead endpoints
// (410/404 on send) are pruned by the sender.
export const pushSubscription = pgTable("push_subscription", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("push_subscription_user_idx").on(t.userId)]);

// Native-app device pairing. A signed-in, MFA-cleared staff member generates a
// short-lived code on the web; the Expo app exchanges it for a real session.
// Only the code HASH is stored; the row is single-use (consumedAt) and expires
// fast. This is how the phone gets a session without re-implementing magic-link
// + TOTP on the device — the human already proved both on the web to mint it.
// Visit photos (REQ-032). Stored base64 in Postgres for the pilot — private by
// default (served only through an auth-gated, role-checked route, same as every
// other household datum) and zero new infra. Move to object storage (R2/S3
// presigned) before scale; the `id` is the client-generated photo id the close
// flow already carries, so a queued offline visit references it unchanged.
export const visitPhoto = pgTable("visit_photo", {
  id: uuid("id").primaryKey(),
  householdId: uuid("household_id").notNull(),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(), // base64, no data: prefix; "" after retention purge
  bytes: integer("bytes").notNull(), // decoded size, for quick accounting
  uploadedBy: text("uploaded_by").notNull(),
  // Photo lifecycle (LAUNCH §3, 2026-07-25): image BYTES purge on a rolling
  // window (app_setting `photo_retention`, default 90 days); the row survives
  // as the tombstone — record stays, picture doesn't. A retention hold
  // (open incident/dispute) exempts the photo until released.
  retentionHold: boolean("retention_hold").notNull().default(false),
  purgedAt: timestamp("purged_at", { withTimezone: true }),
  // REQ-006 media-reuse flag: default NO — a photo is service record only
  // unless corporate explicitly marks it reusable, and never on an NDA
  // household (enforced in the action, not just the interface).
  reuseAllowed: boolean("reuse_allowed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("visit_photo_household_idx").on(t.householdId)]);

// The incident & complaint register (LAUNCH §3, 2026-07-25): a client
// complaint, breakage, injury, or near-miss. NOT a registry kind — registries
// are practical data with date sweeps; an incident is s2, append-only, and
// legally significant (in a dispute, the most important record in the
// business). Rows never delete; corrections and resolutions append/stamp.
export const incidentKindEnum = pgEnum("incident_kind", [
  "complaint", "breakage", "injury", "near_miss", "other",
]);

// Session B: could the anticipation engine have prevented this incident?
// no_prompt_existed rows feed the Misses panel — the only false-negative
// stream the business gets (roadmap item B).
export const incidentPreventableEnum = pgEnum("incident_preventable_kind", [
  "fired_and_ignored", "fired_too_late", "no_prompt_existed", "not_preventable", "unclear",
]);

export const incidentReport = pgTable("incident_report", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  kind: incidentKindEnum("kind").notNull(),
  severity: text("severity").notNull(), // low | medium | high
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  reportedBy: text("reported_by").notNull(), // auth_user.id of who logged it
  reportedVia: text("reported_via").notNull(), // client_call | client_email | hm_visit | corporate | other
  description: text("description").notNull(), // s2
  status: text("status").notNull().default("open"), // open | resolved
  resolutionNote: text("resolution_note"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  // Session B (roadmap item B): the incident-to-engine back-link, answered
  // by the person RESOLVING (never at creation, never inferred — an
  // inferred link is a false-negative stream made of fiction). Skippable
  // by founder decision 2026-07-27: null = the question wasn't answered.
  preventableByPrompt: incidentPreventableEnum("preventable_by_prompt"),
  relatedRuleId: uuid("related_rule_id"), // trigger_rule, where one applies
  relatedPromptId: uuid("related_prompt_id"), // the fired prompt_pack_item, where one exists
}, (t) => [index("incident_report_household_idx").on(t.householdId, t.status)]);

export const devicePairing = pgTable("device_pairing", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("device_pairing_code_idx").on(t.codeHash)]);

// One row per command from @wellkept/close-flow's submit() (visit.submit,
// dot.create, signal.route), drained by @wellkept/offline-queue. id IS the
// command's idempotencyKey: redelivery (a device retrying after a flaky
// reconnect) is a plain insert conflict — a safe no-op, not a domain
// conflict. A domain conflict (status='conflict') is a second, distinct
// visit.submit for a household that already has one applied the same day;
// stored, never dropped, so corporate can review (last-write-wins per
// REQ-032). Ported from the July 12 foundation repo.
// Capture session 1 (CORPORATE_CAPTURE_SESSIONS.md, founder decisions
// 2026-07-27): categorized time. The five categories are the founder's
// list; entry is after-the-fact for the pilot (no live clock — a clock has
// to survive offline sync gaps and waits for a second HM). ADR-004 holds:
// hours in, never paychecks out — no rates, no overtime, no payroll.
export const timeCategoryEnum = pgEnum("time_category", [
  "delivery", "travel", "intake", "admin", "training",
]);

export const timeEntry = pgTable("time_entry", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  userId: text("user_id").notNull().references(() => authUser.id), // the staff member
  category: timeCategoryEnum("category").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  minutes: integer("minutes").notNull(), // derived from the interval at write
  source: text("source").notNull(), // visit_close (derived from the applied visit) | manual
  visitCommandId: text("visit_command_id"), // the visit.submit this derives from, if any
  note: text("note"), // s2
}, (t) => [index("time_entry_household_started_idx").on(t.householdId, t.startedAt)]);

// Capture session 2: non-labor cost. Founder decisions 2026-07-27:
// categories supplies | materials | mileage | other; mileage ENTERED, not
// derived from travel time (a derived number breaks the moment someone
// drives without logging travel). QuickBooks remains the book of record —
// this captures that a cost happened, not reimbursement or accounting.
export const costCategoryEnum = pgEnum("cost_category", [
  "supplies", "materials", "mileage", "other",
]);

export const costEntry = pgTable("cost_entry", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  category: costCategoryEnum("category").notNull(),
  amountCents: integer("amount_cents").notNull(),
  incurredOn: date("incurred_on").notNull(),
  recordedBy: text("recorded_by").notNull().references(() => authUser.id),
  miles: integer("miles"), // mileage rows only
  note: text("note"), // s2
  // A receipt is a visit_photo row: same storage, same rolling retention
  // purge, same hold semantics — one photo lifecycle, not two.
  receiptPhotoId: uuid("receipt_photo_id"),
}, (t) => [index("cost_entry_household_incurred_idx").on(t.householdId, t.incurredOn)]);

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
  // G-49 part two (intake-capture review §1): the horizon-derivation
  // inputs the instruments collect. A maintained key_date rots the first
  // time nobody updates it; these compute the same dates from facts that
  // only change when the world does. key_date, when set, still wins.
  installedAt: timestamp("installed_at", { withTimezone: true }),
  lifespanMonths: integer("lifespan_months"),
  maintenanceIntervalMonths: integer("maintenance_interval_months"),
  lastServicedAt: timestamp("last_serviced_at", { withTimezone: true }),
  sensitivity: sensitivityEnum("sensitivity").notNull().default("s1"),
  sourceFieldId: uuid("source_field_id"),
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }), // tombstone, never delete
}, (t) => [
  index("registry_entry_household_idx").on(t.householdId),
  index("registry_entry_household_kind_idx").on(t.householdId, t.kind),
  // W-4 (WORK_QUEUE) / WK-SOP-019: children's sizes are child data and
  // must never be client-visible by default. The column default stays s1
  // (right for dates/vendors); this constraint makes the unsafe combo
  // impossible at the database, which is the safer place than a write
  // surface remembering to. The sanctioned exception path is a reviewed
  // migration that alters this constraint - never dropping it in place.
  check("registry_sizes_not_client_visible", sql`${t.kind} <> 'sizes' OR ${t.sensitivity} <> 's1'`),
]);

// G-49 (INTAKE_CAPTURE_GAP_REVIEW §2): the observation series. Condition
// and fill level are worthless captured once and valuable captured
// repeatedly — a condition that moved 4→3→2 over three visits is a
// prediction, fill level over time is a reorder date. The intake
// instruments collect these repeatedly; before this table the record held
// only current state. One row per look, against a registry object.
// Erasure: rows DELETED with the household (operational household data,
// no business-record claim). Values are integers by design: condition is
// the rubric's 1–5 scale, fill_level is percent 0–100.
export const observationMeasureEnum = pgEnum("observation_measure", [
  "condition", "fill_level",
]);

// W-5 (STD-016 S5): the flag entity. Named condition_flag because "flag"
// is already taken by playbook-field flags (fieldFlagEnum, the briefing's
// "flags first" section) - the K-class naming collision, avoided at birth.
// No kinds (founder decision 1: a taxonomy invented before a single real
// flag exists shapes what people record). A flag is a subject, a concern
// in the HOM's own words, and a revisit trigger.
export const conditionFlagStatusEnum = pgEnum("condition_flag_status", ["open", "closed"]);

export const conditionFlag = pgTable("condition_flag", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  // Decision 2: nullable on purpose. The standard's own example (caulk in
  // a guest bathroom) is a surface condition, not a registry object; with
  // an object the flag reads its existing series, without one it stands
  // on its own subject and location.
  registryEntryId: uuid("registry_entry_id").references(() => registryEntry.id),
  subject: text("subject").notNull(), // what, in the HM's words ("grout, rear shower wall")
  location: text("location").notNull(), // where in the home ("guest bathroom")
  concern: text("concern").notNull(), // the worry, verbatim; s2, staff-only
  raisedBy: text("raised_by").notNull().references(() => authUser.id),
  raisedAt: timestamp("raised_at", { withTimezone: true }).notNull().defaultNow(),
  // The revisit trigger: a date or a stated condition, set at the moment
  // of flagging. Enforced by the CHECK below, not a form.
  revisitDate: date("revisit_date"),
  revisitCondition: text("revisit_condition"),
  status: conditionFlagStatusEnum("status").notNull().default("open"),
  // Resolution is a state change, never a delete: a reason and who closed.
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedBy: text("closed_by").references(() => authUser.id),
  closeReason: text("close_reason"),
}, (t) => [
  index("condition_flag_household_idx").on(t.householdId, t.status),
  // STD-016's strongest sentence, structural: "a flag without a revisit
  // trigger is worse than no flag." The database refuses one.
  check("condition_flag_has_revisit_trigger",
    sql`${t.revisitDate} IS NOT NULL OR ${t.revisitCondition} IS NOT NULL`),
  check("condition_flag_close_is_reasoned",
    sql`${t.status} <> 'closed' OR (${t.closeReason} IS NOT NULL AND ${t.closedBy} IS NOT NULL)`),
]);

// W-6 (STD-016): deliberate deferral. A RECORDED DECISION NOT TO ACT,
// meant to reach the client - a clean bathroom demonstrates nothing about
// attention; "noticed and left, with the reason and the intended timing"
// does. Distinct from a dot (an observation the client never sees) and
// from a condition_flag (a concern watched over time): this is a single
// judgment made on a visit. The intended timing is a revisit trigger,
// which is why this follows W-5.
// AB: how a deferral resolves. Three ways out, none of them silence.
export const deferralResolutionEnum = pgEnum("deferral_resolution", [
  "done", "no_longer_needed", "superseded",
]);

export const deferral = pgTable("deferral", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  noticed: text("noticed").notNull(), // what was seen
  // The reason reaches the client; its capture label invites an explanation
  // a client would find reassuring, never an internal note.
  reason: text("reason").notNull(),
  revisitDate: date("revisit_date"),
  revisitCondition: text("revisit_condition"),
  decidedBy: text("decided_by").notNull().references(() => authUser.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  // 0034 dropped Z's visit_id: it could NEVER be filled - nothing writes
  // the legacy `visit` table (applied visits are visit_command rows) -
  // and an always-null FK is a false claim about the system living in
  // the schema (the W-11 lesson).
  // AC: the visit it belongs to, BY CONSTRUCTION - deferral capture is a
  // close-flow step and the row is created when the visit.submit command
  // applies, carrying that command's id (the same association time_entry
  // uses).
  visitCommandId: text("visit_command_id"),
  // AB (W-6 follow-on): the lifecycle. "Noticed, and planned for later"
  // is a commitment; without a resolved state the client card makes a
  // promise the data model cannot honor. Resolution keeps the evidence
  // rather than deleting it: the done story ("noticed in March, fixed in
  // May") is exactly the attention STD-016 says a clean bathroom fails
  // to demonstrate.
  resolution: deferralResolutionEnum("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by").references(() => authUser.id),
}, (t) => [
  index("deferral_household_idx").on(t.householdId, t.decidedAt),
  // Same structural sentence as condition_flag: an intended timing is not
  // optional, and the database is where that lives.
  check("deferral_has_revisit_trigger",
    sql`${t.revisitDate} IS NOT NULL OR ${t.revisitCondition} IS NOT NULL`),
  // A resolution is whole or absent: by whom, when, and how travel
  // together, so a half-resolved row cannot exist.
  check("deferral_resolution_is_whole",
    sql`(${t.resolution} IS NULL AND ${t.resolvedAt} IS NULL AND ${t.resolvedBy} IS NULL) OR (${t.resolution} IS NOT NULL AND ${t.resolvedAt} IS NOT NULL AND ${t.resolvedBy} IS NOT NULL)`),
]);

// AD (W-7): a paused decision. Research done and then paused, logged with
// its own revisit trigger so it is not lost to time. INTERNAL, unlike a
// deferral: it never reaches the client, so there is no client projection
// and the payload guard treats any leaked row as a violation. Same
// structural sentence as the deferral and the flag (no revisit trigger,
// no record) and lifecycle-shaped from birth, reusing the deferral's
// resolution vocabulary rather than minting a second one. Nothing acts on
// an arrived revisit automatically: the briefing shows it, a person
// decides (the Misses-panel posture).
export const pausedDecision = pgTable("paused_decision", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  decision: text("decision").notNull(), // what is being decided
  research: text("research").notNull(), // what was learned before the pause
  revisitDate: date("revisit_date"),
  revisitCondition: text("revisit_condition"),
  pausedBy: text("paused_by").notNull().references(() => authUser.id),
  pausedAt: timestamp("paused_at", { withTimezone: true }).notNull().defaultNow(),
  resolution: deferralResolutionEnum("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by").references(() => authUser.id),
}, (t) => [
  index("paused_decision_household_idx").on(t.householdId, t.pausedAt),
  check("paused_decision_has_revisit_trigger",
    sql`${t.revisitDate} IS NOT NULL OR ${t.revisitCondition} IS NOT NULL`),
  check("paused_decision_resolution_is_whole",
    sql`(${t.resolution} IS NULL AND ${t.resolvedAt} IS NULL AND ${t.resolvedBy} IS NULL) OR (${t.resolution} IS NOT NULL AND ${t.resolvedAt} IS NOT NULL AND ${t.resolvedBy} IS NOT NULL)`),
]);

export const objectObservation = pgTable("object_observation", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  // W-5 generalization (founder decision 2, cost reported first): one
  // series table, two subject types. A flag against a registry object
  // carries BOTH references, so the object's series and the flag's are
  // the same series; a flag with no object carries only condition_flag_id.
  registryEntryId: uuid("registry_entry_id").references(() => registryEntry.id),
  conditionFlagId: uuid("condition_flag_id").references(() => conditionFlag.id),
  measure: observationMeasureEnum("measure").notNull(),
  value: integer("value").notNull(),
  note: text("note"), // s2, optional ("left rear burner weak")
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  recordedBy: text("recorded_by").notNull().references(() => authUser.id),
  // W-1 (WORK_QUEUE): an observation is a claim about the world, and a
  // claim can be wrong. Supersede, never delete — the row stays, marked
  // with who corrected it and when, and every derivation excludes
  // superseded rows. Same shape as provision versioning. A fat-fingered
  // 1 on a pristine object is exactly the cliff STD-016's promotion
  // logic looks for, so "the next look averages it out" does not hold.
  supersededAt: timestamp("superseded_at", { withTimezone: true }),
  supersededBy: text("superseded_by").references(() => authUser.id),
}, (t) => [
  index("object_observation_household_idx").on(t.householdId),
  index("object_observation_series_idx").on(t.registryEntryId, t.measure, t.observedAt),
  index("object_observation_flag_series_idx").on(t.conditionFlagId, t.measure, t.observedAt),
  // W-5: an observation observes SOMETHING - a registry object, a flagged
  // condition, or (both set) a flagged registry object sharing one series.
  check("object_observation_has_subject",
    sql`${t.registryEntryId} IS NOT NULL OR ${t.conditionFlagId} IS NOT NULL`),
]);

// CAND-OUTBOX-01 (substrate week one): THE transactional outbox. Any
// cross-primitive fact travels as an event through here, never as a second
// copy (WK-DEV-007 section 4); field_event_outbox was the seed and its
// field.changed events are the first kind. A row is written in the SAME
// transaction as the state change it announces, so the change and its
// event commit atomically or not at all. The worker drains unprocessed
// rows through a per-kind consumer registry (consumers are idempotent);
// a kind with no registered consumer is left untouched, attempts unspent,
// so a primitive may start emitting before its consumer ships without
// being dead-lettered. processedAt stamps completion; attempts bounds
// retries for kinds that DO have a consumer.
export const eventOutbox = pgTable("event_outbox", {
  id: uuid("id").primaryKey(), // the event_id of the WK-DEV-010 s4 law
  householdId: uuid("household_id").notNull(),
  kind: text("kind").notNull(), // e.g. field.changed; work/decision kinds follow
  payload: jsonb("payload").notNull(), // kind-specific; validated by the consumer
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // WK-DEV-010 section 4, the event law's envelope (0046). Events
  // describe STATE TRANSITIONS, never copies of full records; the
  // payload keeps carrying ids and vocabulary only, which is why s1 is
  // the honest default sensitivity (a writer whose payload ever exceeds
  // that passes the higher label explicitly). provenance names the
  // emitting component; rows predating the law read 'pre_event_law'.
  eventVersion: integer("event_version").notNull().default(1),
  correlationId: uuid("correlation_id"), // ties a chain (a visit, a slice) together
  objectId: uuid("object_id"), // the row whose transition this is, lifted from the payload
  actor: text("actor").references(() => authUser.id), // null = the system's own act
  sensitivity: sensitivityEnum("sensitivity").notNull().default("s1"),
  provenance: text("provenance").notNull().default("pre_event_law"),
}, (t) => [index("event_outbox_unprocessed_idx").on(t.processedAt, t.createdAt)]);

// ---------------------------------------------------------------------------
// The standards store (WK-APP-003 Addendum A1): the fourth top-level shape.
// Global (no household_id), read-mostly, corporate_admin-edited, versioned.
// Internal class per WK-SOP-019: no sensitivity matrix, no vault interaction.
// ---------------------------------------------------------------------------

// The five levels of WK-STD-000 Section 1 — the precedence rule as a type.
// Distinct pg name from the membership "tier" enum above.
export const provisionTierEnum = pgEnum("provision_tier", [
  "floor_1", "floor_2", "process", "method", "preference",
]);

// Emitted by the extraction; "table_row" covers provisions authored as table
// rows in the source documents (Addendum A1 S3 lists rule/callout only —
// flagged to QA-010 v1.4).
export const provisionKindEnum = pgEnum("provision_kind", [
  "rule", "table_row", "callout",
]);

// Provision IDs (STD-006.4.1 = document.section.ordinal) are a public API and
// never renumber (DEV-005 S2), so the natural key is the primary key — the one
// deliberate exception to the uuid-v7 id convention. Retired provisions
// tombstone; text is verbatim from the governing docx, which remains the
// authored source.
export const standardProvision = pgTable("standard_provision", {
  id: text("id").primaryKey(), // provision_id, e.g. "STD-006.4.1"
  document: text("document").notNull(), // "STD-006"
  section: integer("section").notNull(),
  ordinal: integer("ordinal").notNull(),
  text: text("text").notNull(),
  tier: provisionTierEnum("tier").notNull(),
  scope: text("scope").array().notNull(), // room:kitchen, task:laundry, ...
  kind: provisionKindEnum("kind").notNull(),
  // Floors are enforced, not displayed: the close flow refuses to record a
  // floor as adapted-per-Playbook (floor_conflict event instead).
  overridable: boolean("overridable").notNull()
    .generatedAlwaysAs(sql`tier not in ('floor_1', 'floor_2')`),
  version: integer("version").notNull().default(1),
  effectiveDate: date("effective_date").notNull(),
  supersededBy: text("superseded_by"), // provision id of the successor version
  sourceNote: text("source_note"), // USDA/VDH/... — corporate view only
  pilotDefault: boolean("pilot_default").notNull().default(false), // DEV-005 S7
  reviewDate: date("review_date"), // pilot-calibrated defaults: review at pilot close
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("standard_provision_document_idx").on(t.document, t.section),
  index("standard_provision_tier_idx").on(t.tier),
]);

// Small app-wide flags. First use: standards.seed_reviewed=false gates the
// briefing read path until the founder's corrected provision seed loads
// (Addendum A1 S7); DEV-005 S7 configurable pilot defaults land here too.
export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only version history: every write to standard_provision records the
// full prior row here first (same discipline as audit_event — never updated,
// never deleted). A visit record references the version in force on its date.
export const provisionVersion = pgTable("provision_version", {
  id: uuid("id").primaryKey(),
  provisionId: text("provision_id").notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(), // the full provision row as stored
  effectiveDate: date("effective_date").notNull(),
  actorUser: uuid("actor_user"), // null only for the seed load
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("provision_version_provision_version_unique").on(t.provisionId, t.version),
]);

// ---------------------------------------------------------------------------
// Addendum A2 (docs/SPEC_ADDENDUM_A2.md): anticipation feedback (REQ-055),
// repeat-season memory (REQ-054), exclusions (REQ-056). User-id columns are
// text because they reference auth_user.id (Auth.js text ids — the same
// precedent as notification/visit_photo; A2's uuid columns are a
// doc-vs-reality delta, recorded here rather than papered over).
// ---------------------------------------------------------------------------

export const promptOutcomeKindEnum = pgEnum("prompt_outcome_kind", [
  // Four values, not three (A2 finding 2): already_done means the rule was
  // right but LATE (lead time wrong); not_applicable means the rule was
  // WRONG for this household (exclusion candidate). Opposite corrections.
  "acted", "dismissed", "not_applicable", "already_done",
]);

// Session A (roadmap item A, reconciled with the enum above): the shipped
// outcome kinds already capture not_applicable and already_done as one-tap
// answers, so a dismissal reason only needs what's left of the roadmap's
// four: the rule was wrong for this home, or the moment was wrong.
export const promptDismissReasonEnum = pgEnum("prompt_dismiss_reason", [
  "wrong", "bad_timing",
]);

// REQ-055: one row per (prompt, user) answer. Append-only — no update or
// delete path exists anywhere in code. An unanswered prompt is deliberately
// NOT a row: ignore_rate reads fired counts from prompt_pack_item, never
// from here (A2 finding 3 — an ignored rule must not look clean).
export const promptOutcome = pgTable("prompt_outcome", {
  id: uuid("id").primaryKey(),
  householdId: uuid("household_id").notNull(),
  promptId: uuid("prompt_id").notNull(), // the scheduled prompt_pack_item
  ruleId: uuid("rule_id").notNull(), // denormalised: rule health reads without a join
  provisionRef: text("provision_ref"), // methodRef the prompt carried, if any
  userId: text("user_id").notNull().references(() => authUser.id),
  role: text("role").notNull(), // role at answer time, not current role
  outcome: promptOutcomeKindEnum("outcome").notNull(),
  firedAt: timestamp("fired_at", { withTimezone: true }).notNull(), // when the prompt surfaced
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull(),
  targetDate: date("target_date"), // null for event-driven prompts
  leadDays: integer("lead_days"), // answered_at to target_date; null without a target
  note: text("note"), // optional free text, sensitivity s2
  // Session A (item A): did an acted prompt tell the HM something new?
  // Set only when outcome=acted ("Good catch" true / "Already on it" false);
  // null on every other outcome AND on historical acted rows — the
  // informative-rate metric ignores nulls rather than backfilling a guess.
  wasNews: boolean("was_news"),
  // Set only when outcome=dismissed; null means dismissed-without-reason
  // (historical rows) — never coerced.
  dismissReason: promptDismissReasonEnum("dismiss_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("prompt_outcome_prompt_user_unique").on(t.promptId, t.userId),
  index("prompt_outcome_rule_idx").on(t.ruleId, t.answeredAt),
  index("prompt_outcome_household_idx").on(t.householdId, t.answeredAt),
]);

// REQ-054: repeat-season memory. Recall, not a rule family — each row is a
// FACT about this household at a point in its year, attributable to the
// anchor that produced it. Single-household only (cross-household inference
// is policy and out of A2 scope). Versioned via superseded_by, never deleted.
export const seasonObservation = pgTable("season_observation", {
  id: uuid("id").primaryKey(),
  householdId: uuid("household_id").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  seasonMonth: smallint("season_month").notNull(), // 1-12, the matching granularity
  seasonWeek: smallint("season_week"), // 1-53, for anchors needing tighter matching
  anchorKind: text("anchor_kind").notNull(), // registry_entry | field | visit | dot | gesture
  anchorId: uuid("anchor_id").notNull(),
  summary: text("summary").notNull(), // one line, human readable, s2, DEV-005 applies
  fieldRef: text("field_ref"), // the Playbook field if the observation maps to one
  provisionRef: text("provision_ref"),
  recurrence: text("recurrence").notNull(), // annual | seasonal | none
  confidence: text("confidence").notNull(), // observed | inferred
  sourceEventId: uuid("source_event_id"), // the audit_event that produced it
  supersededBy: uuid("superseded_by"), // versioned, never hard-deleted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("season_observation_household_month_idx").on(t.householdId, t.seasonMonth),
]);

// REQ-056: the anticipation exclusion list — what NOT to surface. Enforced
// server-side in the prompt scheduler before anything reaches the queue,
// fail closed. Approval is corporate only, always; ending an exclusion sets
// effective_to (nothing hard-deletes). SAFETY FLOORS BYPASS THIS TABLE
// ENTIRELY — asserted in @wellkept/trigger-engine exclusion tests.
// ADR-006 (G-59, AR's first fix): the audit-identity mapping. An audit row
// must never hold a name or an email for a subject who is not the acting
// user; it holds this table's row id (the token) and resolution is a live
// join at read time. Erasure of a subject DELETES the mapping row: the
// audit row survives untouched (append-only holds) and becomes unlinkable,
// which is the entire mechanism - deletion here is BY DESIGN, the seventh
// documented DELETE exception in erase-household.mjs, not a tombstone
// candidate. A new token is minted per audit event rather than deduped per
// subject: dedupe would itself be a linkage record, and the cost of extra
// rows is nothing at this scale.
export const auditSubjectToken = pgTable("audit_subject_token", {
  ...stamps,
  householdId: uuid("household_id").notNull(),
  kind: text("kind").notNull(), // email | person_ref
  value: text("value").notNull(), // the identifying value; s2, staff-only
}, (t) => [index("audit_subject_token_household_idx").on(t.householdId)]);

export const anticipationExclusion = pgTable("anticipation_exclusion", {
  id: uuid("id").primaryKey(),
  householdId: uuid("household_id").notNull(),
  scope: text("scope").notNull(), // rule | topic | person | field | all
  target: text("target").notNull(), // rule_id, topic tag, person reference, field ref
  reason: text("reason"), // sensitivity s2
  requestedBy: text("requested_by").notNull(), // client | house_manager | corporate
  approvedBy: text("approved_by").notNull().references(() => authUser.id), // corporate only, always
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }), // null = indefinite
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("anticipation_exclusion_household_idx").on(t.householdId)]);

// WK-DEV-007 section 3: the shadow log. What the anticipation engine WOULD
// have surfaced, and nothing else: signal, confidence, evidence, proposed
// authority class, and the inputs hash that makes the evaluation
// replayable. No HOM notification, no client output, no task creation
// originates here; the only doors out are the founder's per-trigger
// promotion flags and the A0 cap, both enforced in code
// (surfacesBeyondShadow). Visible to founder, CFO, and the developer only.
// The founder's weekly scoring (true signal / noise / unknowable) lives on
// the row, whole-or-absent like every resolution in this schema; per-
// trigger precision accumulates from it, and promotion is earned on that
// evidence. One row per DISTINCT input state per trigger per household
// (the unique index): determinism is proven in the engine suite, so an
// identical re-evaluation adds nothing but scoring noise.
export const shadowScoreEnum = pgEnum("shadow_score", ["true_signal", "noise", "unknowable"]);

export const shadowLog = pgTable("shadow_log", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  triggerKey: text("trigger_key").notNull(),
  signal: text("signal").notNull(), // s2: derived from household content, staff-only
  confidence: integer("confidence_pct").notNull(), // 0..100, integer per the money-in-cents discipline
  evidence: jsonb("evidence").notNull(), // string[]; s2, same rule as signal
  proposedClass: text("proposed_class").notNull(),
  inputsHash: text("inputs_hash").notNull(),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull(),
  score: shadowScoreEnum("score"),
  scoredBy: text("scored_by").references(() => authUser.id),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
}, (t) => [
  index("shadow_log_household_idx").on(t.householdId),
  index("shadow_log_trigger_idx").on(t.triggerKey, t.evaluatedAt),
  uniqueIndex("shadow_log_distinct_evaluation").on(t.triggerKey, t.householdId, t.inputsHash),
  check("shadow_log_confidence_bounded", sql`${t.confidence} >= 0 AND ${t.confidence} <= 100`),
  check("shadow_log_class_known", sql`${t.proposedClass} IN ('A0','A1','A2','A3','A4','A5')`),
  // The house resolution pattern: a score is whole or absent, never half.
  check("shadow_log_score_is_whole",
    sql`(${t.score} IS NULL AND ${t.scoredBy} IS NULL AND ${t.scoredAt} IS NULL) OR (${t.score} IS NOT NULL AND ${t.scoredBy} IS NOT NULL AND ${t.scoredAt} IS NOT NULL)`),
]);

// RFC-PRIM-01 build 1 (WK-DEV-007 section 4 definition of done): the
// WorkItem primitive. Any meaningful unit of NEW household work: vendor
// work, follow-ups, Runways, internal chores. The four proven fragments
// (deferral, paused_decision, condition_flag, prompt_pack_item) stay as
// they are; the RFC's standing rule is that no fifth fragment is ever
// added - anything new is a work_item. Kinds are the Handoff's own
// purpose line, a section 8 proposed default; rhythm work stays with the
// anticipation engine. Staff-only by default (s2): client-visible work
// remains the deferral's job.
export const workItemStatusEnum = pgEnum("work_item_status", ["open", "blocked", "done", "abandoned"]);

export const workItem = pgTable("work_item", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  title: text("title").notNull(), // the work, in words; s2
  detail: text("detail").notNull().default(""), // s2
  kind: text("kind").notNull(), // vendor | followup | runway | internal
  source: text("source").notNull(), // hm_capture | corporate | system
  ownerId: text("owner_id").references(() => authUser.id), // null = unassigned
  sensitivity: sensitivityEnum("sensitivity").notNull().default("s2"),
  dueDate: date("due_date"), // both null = backlog, deliberately legal
  windowCondition: text("window_condition"),
  dependsOn: jsonb("depends_on"), // work_item ids; app-checked, never a hard FK web
  status: workItemStatusEnum("status").notNull().default("open"),
  blockedReason: text("blocked_reason"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by").references(() => authUser.id),
}, (t) => [
  index("work_item_household_idx").on(t.householdId, t.status),
  check("work_item_kind_known",
    sql`${t.kind} IN ('vendor','followup','runway','internal')`),
  check("work_item_source_known",
    sql`${t.source} IN ('hm_capture','corporate','system')`),
  // The house rules, structural: a block carries its reason, and a
  // resolution is whole or absent in BOTH directions (a terminal status
  // demands the full triple; a live one forbids any of it).
  check("work_item_block_is_reasoned",
    sql`${t.status} <> 'blocked' OR ${t.blockedReason} IS NOT NULL`),
  check("work_item_resolution_is_whole",
    sql`(${t.status} IN ('done','abandoned') AND ${t.resolution} IS NOT NULL AND ${t.resolvedAt} IS NOT NULL AND ${t.resolvedBy} IS NOT NULL) OR (${t.status} NOT IN ('done','abandoned') AND ${t.resolution} IS NULL AND ${t.resolvedAt} IS NULL AND ${t.resolvedBy} IS NULL)`),
]);

// RFC-PRIM-01 build 2: the AttentionRecord primitive. A REASON a person
// needs to notice or act: it informs, never executes (the single-consent
// rule and the A0 cap stand above it; nothing here fires an action).
// Sources are the computed surfaces that used to recompute per request;
// the sweep writes them once and notification becomes delivery. One
// record per source EVER (the full unique index): a source whose
// attention was resolved does not nag daily; re-raising is a policy
// decision for later, deliberately not a default.
export const attentionUrgencyEnum = pgEnum("attention_urgency", ["fyi", "soon", "now"]);
export const attentionStatusEnum = pgEnum("attention_status", ["open", "resolved"]);

export const attentionRecord = pgTable("attention_record", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  reason: text("reason").notNull(), // why noticing is needed, in words; s2
  sourceKind: text("source_kind").notNull(),
  sourceId: uuid("source_id"), // the row it points at; null for system notices
  audience: text("audience").notNull(),
  urgency: attentionUrgencyEnum("urgency").notNull().default("soon"),
  deadline: date("deadline"),
  sensitivity: sensitivityEnum("sensitivity").notNull().default("s2"),
  deliveredVia: text("delivered_via"), // null until delivered: briefing | digest | push
  // WK-DEV-009 section 6 (0048): the Notification Firewall's decision.
  // "Event exists" never maps to "push notification": every record is
  // ROUTED to one of the five destinations by the deterministic policy
  // in @wellkept/trigger-engine (destinationFor), and the conservative
  // v1 rule set never produces immediate_interrupt or
  // next_transition_prompt: what counts as interrupt-worthy is safety
  // policy, a founder rule set, not an engineering default (the capture
  // router's posture). The vocabulary carries all five so the founder's
  // rules need no migration when they arrive.
  destination: text("destination").notNull().default("previsit_brief"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: text("acknowledged_by").references(() => authUser.id),
  status: attentionStatusEnum("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by").references(() => authUser.id),
}, (t) => [
  index("attention_record_household_idx").on(t.householdId, t.status),
  uniqueIndex("attention_record_one_per_source").on(t.sourceKind, t.sourceId),
  check("attention_record_source_known",
    sql`${t.sourceKind} IN ('work_item','deferral','paused_decision','condition_flag','reconciliation','system')`),
  check("attention_record_audience_known",
    sql`${t.audience} IN ('hom','corporate','founder')`),
  check("attention_record_destination_known",
    sql`${t.destination} IN ('immediate_interrupt','next_transition_prompt','previsit_brief','end_of_visit_review','corporate_queue')`),
  // Acknowledgment is a whole pair; resolution is the house triple, whole
  // or absent in both directions.
  check("attention_record_ack_is_whole",
    sql`(${t.acknowledgedAt} IS NULL AND ${t.acknowledgedBy} IS NULL) OR (${t.acknowledgedAt} IS NOT NULL AND ${t.acknowledgedBy} IS NOT NULL)`),
  check("attention_record_resolution_is_whole",
    sql`(${t.status} = 'resolved' AND ${t.resolution} IS NOT NULL AND ${t.resolvedAt} IS NOT NULL AND ${t.resolvedBy} IS NOT NULL) OR (${t.status} <> 'resolved' AND ${t.resolution} IS NULL AND ${t.resolvedAt} IS NULL AND ${t.resolvedBy} IS NULL)`),
]);

// RFC-PRIM-01 build 3: the DecisionRecord primitive, where the shadow
// engine's promotion path will terminate. A GENUINE CHOICE routed to an
// authorized person: recommendation, alternatives, evidence, the
// authority rule it would execute under, outcome, decider, time, expiry.
// The single-consent rule is structural here: one row is one choice with
// one decider, the service layer accepts exactly one decision per call,
// and no batch path exists by design. The client audience is DELIBERATELY
// absent until the client freeze lifts (WK-DEV-007 section 0); routing a
// choice to the household is a later, founder-gated addition. A decision
// is decided OR expires, never both, and an outcome is the house triple.
export const decisionOutcomeEnum = pgEnum("decision_outcome", ["accepted", "declined"]);

export const decisionRecord = pgTable("decision_record", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  question: text("question").notNull(), // the choice, in words; s2
  recommendation: text("recommendation").notNull(),
  alternatives: jsonb("alternatives").notNull(), // string[]
  evidence: jsonb("evidence").notNull(), // string[] provenance lines
  authorityClass: text("authority_class").notNull(),
  audience: text("audience").notNull(),
  workItemId: uuid("work_item_id").references(() => workItem.id),
  attentionRecordId: uuid("attention_record_id").references(() => attentionRecord.id),
  routedBy: text("routed_by").notNull().references(() => authUser.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  outcome: decisionOutcomeEnum("outcome"),
  outcomeNote: text("outcome_note"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: text("decided_by").references(() => authUser.id),
  expiredAt: timestamp("expired_at", { withTimezone: true }),
}, (t) => [
  index("decision_record_household_idx").on(t.householdId),
  check("decision_record_class_known",
    sql`${t.authorityClass} IN ('A0','A1','A2','A3','A4','A5')`),
  check("decision_record_audience_known",
    sql`${t.audience} IN ('hom','corporate','founder')`),
  check("decision_record_outcome_is_whole",
    sql`(${t.outcome} IS NOT NULL AND ${t.decidedAt} IS NOT NULL AND ${t.decidedBy} IS NOT NULL) OR (${t.outcome} IS NULL AND ${t.decidedAt} IS NULL AND ${t.decidedBy} IS NULL)`),
  check("decision_record_decided_xor_expired",
    sql`NOT (${t.outcome} IS NOT NULL AND ${t.expiredAt} IS NOT NULL)`),
]);

// WK-DEV-009 v1.1 section 8, the Tier D half: "Tell Well Kept", the
// universal escape hatch. The HOM captures the unexpected in their own
// words and NEVER needs the database taxonomy; classification is the
// system's job. Until the Tier M gate (section 12) opens, the router is
// a HUMAN: every artifact lands in the corporate queue and a person
// files it (a work item, or a reasoned dismissal), so the promise
// ("say it once, we handle the filing") holds from day one with AI
// replacing the human router later, not the promise. NO automatic
// keyword or severity routing ships in v1: a severity vocabulary is a
// safety taxonomy, and no engineer picks the safety list (the
// stranger-mode lesson); a founder-set rule set is the later knob.
// kind admits the section 10 spec's four capture modes, but only 'text'
// is writable today: voice is gated by the voice ruling (HOM-initiated
// dictation only, transcribe-then-purge, Tier M), photo and scan wait
// on their capture surfaces. The action refuses the other three; the
// CHECK carrying them is the spec's shape, not a shipped feature.
export const captureArtifact = pgTable("capture_artifact", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  kind: text("kind").notNull().default("text"),
  content: text("content").notNull(), // the HOM's words, verbatim; s2
  capturedBy: text("captured_by").notNull().references(() => authUser.id),
  visitCommandId: uuid("visit_command_id"), // the visit it arose from, where one applies
  // Tier M stub: nothing extracts until the section 12 gate entry
  // exists; 'none' is the only value anything writes today.
  extractionStatus: text("extraction_status").notNull().default("none"),
  status: text("status").notNull().default("captured"),
  disposition: text("disposition"), // where it was filed, or why dismissed
  workItemId: uuid("work_item_id").references(() => workItem.id), // set when filing created one
  filedAt: timestamp("filed_at", { withTimezone: true }),
  filedBy: text("filed_by").references(() => authUser.id),
}, (t) => [
  index("capture_artifact_household_idx").on(t.householdId, t.status),
  check("capture_artifact_kind_known",
    sql`${t.kind} IN ('text','voice','photo','scan')`),
  check("capture_artifact_extraction_known",
    sql`${t.extractionStatus} IN ('none','pending','extracted')`),
  check("capture_artifact_status_known",
    sql`${t.status} IN ('captured','filed','dismissed')`),
  // The house rule, structural: a terminal state carries the whole
  // filing triple and a live one carries none of it, both directions.
  check("capture_artifact_filing_is_whole",
    sql`(${t.status} IN ('filed','dismissed') AND ${t.disposition} IS NOT NULL AND ${t.filedAt} IS NOT NULL AND ${t.filedBy} IS NOT NULL) OR (${t.status} = 'captured' AND ${t.disposition} IS NULL AND ${t.filedAt} IS NULL AND ${t.filedBy} IS NULL)`),
  // A created work item is a product of FILING, never of capture.
  check("capture_artifact_work_item_is_filed",
    sql`${t.workItemId} IS NULL OR ${t.status} = 'filed'`),
]);

// WK-DEV-009 v1.1 section 2.1: the Visit Brief Snapshot, a section 10
// substrate object. Every brief COMPOSED for a staff member is persisted
// as sent, so what the HOM was shown is always reconstructable; the
// record is append-only BY CODE (no update action exists anywhere) and
// deduped by content: the unique index makes re-showing an unchanged
// brief a no-op insert, so the table holds every DISTINCT brief without
// per-open noise (engineering choice, reported as a proposal). v1
// snapshots the mobile briefing route, the canonical composed brief; the
// web /visit brief joins when the Cockpit perfection pass unifies
// composition. On erasure the payload blanks and the skeleton keeps
// (that a brief was shown, when, to whom, under which projection); the
// content hash stays, the audit-row value-hash precedent.
export const visitBriefSnapshot = pgTable("visit_brief_snapshot", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  briefedUser: text("briefed_user").notNull().references(() => authUser.id),
  role: text("role").notNull(),
  strangerMode: boolean("stranger_mode").notNull().default(false),
  contentHash: text("content_hash").notNull(), // sha256 of the payload as sent
  payload: jsonb("payload").notNull(), // the brief, verbatim; s2
}, (t) => [
  index("visit_brief_snapshot_household_idx").on(t.householdId, t.createdAt),
  // The AJ option 2 field roles, the only projections a brief composes for.
  check("visit_brief_snapshot_role_known",
    sql`${t.role} IN ('house_manager','backup_hm','corporate_admin')`),
  uniqueIndex("visit_brief_snapshot_distinct_content")
    .on(t.householdId, t.briefedUser, t.strangerMode, t.contentHash),
]);

// WL Gate 1 opener (WK-DEV-008 section 4 / WK-DEV-010 section 3): the
// TaskDefinition, reusable work semantics ACROSS households (global: no
// household_id, so no member data ever lives here; how a task manifests
// in one household is the Household Task Profile, a later Gate 1
// object). WL Gate 0 is blocked founder-side on the canonical Task
// Inventory (v1.3 locate-or-reconstruct), so every definition created
// now is PROVISIONAL BY STRUCTURE: the CHECK below makes it impossible
// for a row to claim non-provisional standing without carrying the
// canonical Inventory id the founder's resolution will assign. No
// evidence row binds permanently to an id that may renumber; the future
// Inventory loader flips provisional off by writing the canonical id in
// the same statement, and nothing else can. Categories are deliberately
// absent: the Inventory owns the taxonomy, and inventing one now is the
// collision the provisional posture exists to avoid. Tombstone, never
// delete (the provision posture for global semantics).
export const taskDefinition = pgTable("task_definition", {
  ...stamps,
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  provisional: boolean("provisional").notNull().default(true),
  canonicalTaskId: text("canonical_task_id"), // the Task Inventory's id, once the founder's ruling lands
  createdBy: text("created_by").notNull().references(() => authUser.id),
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("task_definition_name_unique").on(t.name),
  // Provisional standing is structural: leaving it requires the
  // canonical id, and a canonical id on a provisional row is the
  // half-flipped state, refused in both directions.
  check("task_definition_provisional_xor_canonical",
    sql`(${t.provisional} = true AND ${t.canonicalTaskId} IS NULL) OR (${t.provisional} = false AND ${t.canonicalTaskId} IS NOT NULL)`),
]);

// WL Gate 1 object 2 (WK-DEV-010 section 3): the Household Task
// Profile, how a reusable task manifests in ONE household. The
// boundaries hold by construction: semantics live on task_definition
// (global), date/context instances are Work Requirements (next object),
// and DURATIONS ARE ABSENT on purpose: estimates belong to the Estimate
// Snapshot object, so no duration-typed column enters here and the D7
// wall stays wide. cadence is the household's rhythm in words (the
// registry's cadence posture; a structured cadence vocabulary is a
// taxonomy the founder owns); notes are how THIS household wants the
// task done, s2. One profile per task per household, held by the unique
// index. Erasure follows the registry posture: free text blanks,
// skeleton tombstones.
export const householdTaskProfile = pgTable("household_task_profile", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  taskDefinitionId: uuid("task_definition_id").notNull().references(() => taskDefinition.id),
  active: boolean("active").notNull().default(true),
  cadence: text("cadence"), // the household's rhythm, in words
  notes: text("notes").notNull().default(""), // how this household wants it done; s2
  configuredBy: text("configured_by").notNull().references(() => authUser.id),
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }),
}, (t) => [
  index("household_task_profile_household_idx").on(t.householdId),
  uniqueIndex("household_task_profile_one_per_task").on(t.householdId, t.taskDefinitionId),
]);

// WL Gate 1 object 3 (WK-DEV-010 section 3): the Work Requirement, a
// date/context-specific INSTANCE of a Household Task Profile that can
// be scheduled, blocked, completed, verified. The boundary with
// work_item, honored rather than duplicated (the Gate 0 shared-engine
// rule): work_item is AD-HOC captured work (vendor jobs, follow-ups,
// chores, the Tell Well Kept filings); a work_requirement is PLANNED
// recurring work instantiated from a profile, the forecasting layer's
// unit, carrying the requirement lifecycle of WK-DEV-009 section 10.
// The status vocabulary admits that full lifecycle so Gate 3's
// generator arrives without a migration; the v1 service exercises the
// manual subset (create, schedule, start, complete, verify, defer,
// reopen) and generation stays Gate 3's. The timing is the W-5
// structural sentence: a date or a stated context, never neither.
// Completion and verification are whole-or-absent pairs; verification
// requires completion (a verified row is a completed row someone
// checked). Estimates never live here: the Estimate Snapshot object
// references a requirement, not the reverse, so no duration column
// enters and the D7 wall stays wide.
export const workRequirement = pgTable("work_requirement", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  taskProfileId: uuid("task_profile_id").notNull().references(() => householdTaskProfile.id),
  dueOn: date("due_on"),
  contextWindow: text("context_window"), // the stated context, in words; s2
  status: text("status").notNull().default("generated"),
  createdBy: text("created_by").notNull().references(() => authUser.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedBy: text("completed_by").references(() => authUser.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by").references(() => authUser.id),
}, (t) => [
  index("work_requirement_household_idx").on(t.householdId, t.status),
  check("work_requirement_has_timing",
    sql`${t.dueOn} IS NOT NULL OR ${t.contextWindow} IS NOT NULL`),
  check("work_requirement_status_known",
    sql`${t.status} IN ('generated','activated','ready','scheduled','started','completed','verified','reopened','deferred')`),
  // Completion is a whole pair carried exactly by the completed states;
  // verification is a whole pair carried exactly by verified, which is
  // therefore always also completed. Both directions structural.
  check("work_requirement_completion_is_whole",
    sql`(${t.status} IN ('completed','verified') AND ${t.completedAt} IS NOT NULL AND ${t.completedBy} IS NOT NULL) OR (${t.status} NOT IN ('completed','verified') AND ${t.completedAt} IS NULL AND ${t.completedBy} IS NULL)`),
  check("work_requirement_verification_is_whole",
    sql`(${t.status} = 'verified' AND ${t.verifiedAt} IS NOT NULL AND ${t.verifiedBy} IS NOT NULL) OR (${t.status} <> 'verified' AND ${t.verifiedAt} IS NULL AND ${t.verifiedBy} IS NULL)`),
]);

// WL Gate 1 object 4 (WK-DEV-010 section 3): the Estimate Snapshot.
// APPEND-ONLY BY CODE: a new estimate is a new row and the latest is
// current; a Task Occurrence records what actually happened and NEVER
// overwrites a snapshot, which is the whole reason this object exists
// as history rather than a column on the requirement. Two disciplines,
// structural where the database can hold them:
//  - "Unknown duration never silently becomes zero" (WL Gate 2's
//    conservative fallback, stored honestly from day one): NULL is
//    unknown, and ZERO IS REFUSED as a stored claim by the CHECK.
//  - The estimate HIERARCHY's vocabulary (which class of source an
//    estimate came from) is deliberately absent: Gate 2 adopts it
//    verbatim from the forecasting brief, and inventing a level list
//    now is the provisional-taxonomy collision again. basis is free
//    text naming the source in words until that adoption lands.
// Estimates are corporate planning data behind the D7 staffing wall:
// no client route ever carries a duration, and the client-duration
// guard's census now includes this column.
export const estimateSnapshot = pgTable("estimate_snapshot", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  workRequirementId: uuid("work_requirement_id").notNull().references(() => workRequirement.id),
  estimatedMinutes: integer("estimated_minutes"), // NULL = unknown, never zero
  basis: text("basis").notNull(), // where the estimate came from, in words; s2
  estimatedBy: text("estimated_by").notNull().references(() => authUser.id),
}, (t) => [
  index("estimate_snapshot_requirement_idx").on(t.workRequirementId, t.createdAt),
  check("estimate_snapshot_zero_is_not_unknown",
    sql`${t.estimatedMinutes} IS NULL OR ${t.estimatedMinutes} > 0`),
]);

// WL Gate 1 object 5 (WK-DEV-010 section 2's boundary sentence): the
// Task Occurrence records WHAT ACTUALLY HAPPENED for a requirement and
// never overwrites an estimate snapshot; this table references the
// requirement and writes nothing anywhere else, so the never-overwrite
// rule is held by construction, not by discipline. Append-only by
// code: a reopened requirement done again is a new occurrence row.
//
// PERFORMED_BY IS DELIBERATELY ABSENT. WK-DEV-008 section 1 binds the
// no-HOM-speed-coefficient guardrail "at the schema level": the
// forecasting layer learns from household, task, and configuration
// history, never from individual HOM speed, and the way a schema holds
// that is by not storing who performed the work on the learning
// record at all. recorded_by is write provenance (every write stamps
// provenance), not performance data; staff time attribution lives in
// time_entry, which is audit and payroll-adjacent record keeping, not
// estimator input.
//
// The outcome vocabulary is the directive's own two modes (WK-DEV-009
// section 6 [D]): the known-normal rule's one-gesture "as expected",
// and exception mode, which asks only for the variance reason in
// words. The richer variance-CODE taxonomy the Gate 1 list names is
// deliberately deferred to verbatim adoption from the forecasting
// brief (the estimate-hierarchy precedent); inventing codes here would
// be choosing a taxonomy. An exception carries its reason whole or is
// refused; an as-expected occurrence carries none, so "done as
// expected" stays one gesture.
// actual_minutes: NULL is the honest unknown, zero refused (the
// estimate_snapshot posture); v1 entry is corporate-side or derived,
// never a field capture obligation (WK-DEV-008 section 3's ruling).
export const taskOccurrence = pgTable("task_occurrence", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  workRequirementId: uuid("work_requirement_id").notNull().references(() => workRequirement.id),
  occurredOn: date("occurred_on").notNull(),
  outcome: text("outcome").notNull(), // as_expected | exception
  actualMinutes: integer("actual_minutes"), // NULL = unknown, never zero
  varianceNote: text("variance_note"), // the variance reason, in words; s2
  recordedBy: text("recorded_by").notNull().references(() => authUser.id),
}, (t) => [
  index("task_occurrence_requirement_idx").on(t.workRequirementId, t.occurredOn),
  check("task_occurrence_outcome_known",
    sql`${t.outcome} IN ('as_expected','exception')`),
  check("task_occurrence_zero_is_not_unknown",
    sql`${t.actualMinutes} IS NULL OR ${t.actualMinutes} > 0`),
  // Whole or absent, both directions: an exception without its reason
  // is refused, and an as-expected row carries no reason, so the
  // one-gesture confirmation never grows a text field.
  check("task_occurrence_variance_is_whole",
    sql`(${t.outcome} = 'exception' AND ${t.varianceNote} IS NOT NULL) OR (${t.outcome} <> 'exception' AND ${t.varianceNote} IS NULL)`),
]);

// WL Gate 1 object 6 (WK-DEV-008 section 3, the ruling adopted
// whole): time segments are the STORAGE model for how visit time
// divides, never a field-capture obligation. The nine kinds are the
// brief's own taxonomy, adopted verbatim, not invented here.
//
// MANUAL PER-SEGMENT TIMING IS UNREPRESENTABLE, the 0052 pattern
// (make the bad state impossible, not discouraged):
//  - the source vocabulary carries only the three derivations the
//    spine already captures (arrival/departure taps, close-flow step
//    timestamps, travel inferred between visits) plus the ruling's
//    one sanctioned exception, the HOM's OPTIONAL after-the-fact
//    refinement; no in-the-field manual value exists to claim;
//  - every row names its evidence: derived_from is the visit command
//    (or evidence pointer) the segment derives from, never NULL;
//  - a derived row is a system row and carries NO person; a
//    refinement row is a person's act and requires its author. Whole
//    or absent, both directions by CHECK. The visit's HOM is joined
//    through the command and time_entry when attribution is needed,
//    the covenant events' no-person posture.
//  - the window is ordered (a zero-length segment is refused; it is
//    not a measurement), and the DURATION IS COMPUTED FROM THE
//    WINDOW, never stored: no minutes column exists, so segment
//    minutes can never drift from segment bounds and nothing new
//    enters the client-duration census.
// v1 writes only derived_taps (one active segment per applied visit,
// in the visit's own transaction); derived_close_flow and
// derived_travel are named in the vocabulary so their sweeps arrive
// without a migration, and hom_refinement waits for the optional
// refinement surface, likewise migration-free.
export const timeSegment = pgTable("time_segment", {
  ...stamps,
  householdId: uuid("household_id").notNull().references(() => household.id),
  kind: text("kind").notNull(),
  source: text("source").notNull(),
  derivedFrom: text("derived_from").notNull(), // the evidence pointer (visit command id)
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  recordedBy: text("recorded_by").references(() => authUser.id), // refinement author only
}, (t) => [
  index("time_segment_household_idx").on(t.householdId, t.startedAt),
  // One derived segment per (evidence, kind, source): a re-derivation
  // is a no-op, never a duplicate. Refinement rows are excluded, since
  // a HOM may legitimately subdivide one visit into several segments
  // of the same kind.
  uniqueIndex("time_segment_derived_once")
    .on(t.derivedFrom, t.kind, t.source)
    .where(sql`source <> 'hom_refinement'`),
  check("time_segment_kind_known",
    sql`${t.kind} IN ('access','setup','active','movement','dwell','waiting','remote','documentation','travel')`),
  check("time_segment_source_known",
    sql`${t.source} IN ('derived_taps','derived_close_flow','derived_travel','hom_refinement')`),
  check("time_segment_window_ordered",
    sql`${t.endedAt} > ${t.startedAt}`),
  check("time_segment_person_is_whole",
    sql`(${t.source} = 'hom_refinement' AND ${t.recordedBy} IS NOT NULL) OR (${t.source} <> 'hom_refinement' AND ${t.recordedBy} IS NULL)`),
]);
