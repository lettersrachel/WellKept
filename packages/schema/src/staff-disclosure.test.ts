import { test } from "vitest";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Session X (W5_FOLLOWON): the G-13 surface guard. The approved staff
 * disclosure drifted twice in a week (object observations, then condition
 * flags), both caught by a reviewer noticing. A person will SIGN this
 * document; a HOM signing a disclosure that does not list every
 * surface recording them is a substantive problem, and it is the gate the
 * founder set before hiring. Same move as the child-data guard, applied
 * to staff attribution.
 *
 * Mechanism, per the inputs doctrine: the guard COMPUTES the
 * staff-attributed surface set from tables.ts (never trusts a hand-kept
 * list), then requires every detected table to be either DISCLOSED (its
 * phrase appears in the approved text) or ALLOWLISTED with a written
 * reason. The approved text is never edited here: known gaps live in the
 * allowlist naming the founder's pending line, so the guard is green
 * against the approved text while the drift stays on the record.
 *
 * Found by this guard's own determine-first survey (2026-07-28), beyond
 * the already-reported condition_flag drift: assignment history
 * (household_role_assignment) and photo-upload attribution (visit_photo)
 * are also unnamed in the approved text. Both are allowlisted below with
 * that reason; the founder's next revision collapses the allowlist.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const tablesSrc = readFileSync(path.join(here, "tables.ts"), "utf8");
// Whitespace-normalized: prose wraps lines mid-phrase, and the guard fired
// on exactly that on its own first run ("editing household\n information").
const disclosure = readFileSync(
  path.join(here, "../../../docs/legal/staff-records-disclosure.md"), "utf8")
  .replace(/\s+/g, " ");

/** Session AA: each disclosed surface maps to a STABLE ANCHOR in the
 * approved text (an HTML comment, invisible in the rendered document a
 * person signs), never to prose. The first version keyed on phrases and
 * that was the packName lesson in a new place: the founder's imminent
 * revision would have broken nineteen mappings on wording alone, and a
 * guard that fails nineteen times on a legitimate edit is a guard people
 * learn to bypass. The wording is now freely editable; the anchors are
 * the contract, and adding one is a founder-approved structural change
 * (this set approved 2026-07-28). Generic action-log coverage remains an
 * invalid mapping target for a new surface: allowlist-with-reason is the
 * hatch, so vacuous coverage cannot satisfy the guard. */
const DISCLOSED: Record<string, string> = {
  audit_event: "action-log",
  time_entry: "hours-costs",
  cost_entry: "hours-costs",
  visit: "written-work",
  stranger_test: "written-work",
  dot: "written-work",
  object_observation: "written-work",
  prompt_outcome: "prompt-judgment",
  incident_report: "incident-involvement",
  auth_session: "signin-device",
  auth_account: "signin-device",
  device_pairing: "signin-device",
  push_subscription: "signin-device",
  notification: "signin-device",
  user_totp: "signin-device",
  user_backup_code: "signin-device",
  membership_event: "action-log",
  household: "action-log",
  client_edit: "action-log",
};

// The escape hatch, per the standing pattern: a written reason, reviewed.
const ALLOWLIST: Record<string, string> = {
  commitment_ledger_item:
    "Q-6-2, 2026-09-05: four columns attribute to a named staff member (accountable_owner, " +
    "recorded_by, member_decision_resolved_by, closed_by). ACCOUNTABLE OWNERSHIP is the " +
    "sharpest of them and is not the same attribution as written work: it says a named person " +
    "is answerable for an outcome, which is exactly the sort of line a person should read " +
    "before signing. Recorded as a FOUNDER LINE CANDIDATE FOR THE COUNSEL REVIEW HAPPENING " +
    "NOW rather than for a later revision, because G-13 was reclassified on 5 September 2026 " +
    "as a HIRING PRECONDITION on the 25 September agenda, and this is the third staff-attributed " +
    "table to ship under that rule after time_entry and object_observation. No HOM exists to be " +
    "attributed today, so nothing is recorded about anyone who has not been told; the debt is " +
    "against the disclosure, not against a person",
  decision_right:
    "Q-6-1, 2026-09-04: confirmed_by attributes the person who confirmed a Decision Right, " +
    "and the surface shipped after the disclosure was approved. The attribution is of a " +
    "CONFIRMATION rather than of work, which may want its own line rather than the " +
    "written-work item; a founder line candidate for the next revision either way",
  condition_flag:
    "drift reported 2026-07-28 (W-5): the internal-observations item covers the category " +
    "by plain reading but the examples do not name flags; founder adds 'condition flags " +
    "you raise' at the next revision of the approved text",
  household_role_assignment:
    "found by this guard's survey 2026-07-28: assignment history is recorded per staff " +
    "member and the approved text does not name it; founder line candidate for the next revision",
  visit_photo:
    "found by this guard's survey 2026-07-28: uploaded_by attributes each photo and the " +
    "approved text does not name photo attribution; founder line candidate for the next revision",
  anticipation_exclusion:
    "approved_by is a corporate-role action covered by the action log's generic clause; " +
    "whether it deserves a named line is a founder decision, not a drift",
  provision_version:
    "actor_user records corporate standards-library edits, same posture as exclusion " +
    "approval: generic action-log coverage, named line is a founder decision",
  deferral:
    "W-6, 2026-07-28: decided_by attributes each deliberate deferral; the surface shipped " +
    "after the disclosure was approved, so it joins the founder line candidates for the " +
    "next revision (the written-work item is the natural home)",
  paused_decision:
    "W-7/AD, 2026-07-28: paused_by and resolved_by attribute each paused decision; the " +
    "surface shipped after the disclosure was approved and is internal research about the " +
    "household, so it joins the founder line candidates for the next revision (the " +
    "internal-observations item is the natural home)",
  changeset:
    "Q-12b-2, 2026-09-05: three staff columns, recorded_by, classified_by and applied_by. The last two are sharper than write provenance and are named as such: classifying a change as safe to act on without asking, and then acting on it, are JUDGMENTS attributable to a person, closer to commitment_ledger_item's accountable owner than to a task_occurrence recorder. FOUNDER LINE CANDIDATE for the counsel review now running rather than for a later revision. The effect rows carry no person at all, deliberately (the time_segment posture), so the propagation itself attributes to nobody",
  expected_event:
    "Q-12b-1, 2026-09-05: recorded_by is write provenance and is the ONLY staff column on " +
    "this table. The sweep that reconciles the row writes no person at all (the time_segment " +
    "posture), so what is attributed is the recording of an expectation and never the meeting " +
    "or missing of one: a miss is a fact about a vendor or a provider, not about a HOM. " +
    "Generic action-log coverage; a named line is a founder decision, not a drift. Flagged " +
    "with the same standing as commitment_ledger_item: this is the FOURTH staff-attributed " +
    "table to ship since G-13 was reclassified as a hiring precondition, and no HOM exists " +
    "to be attributed today, so the debt is against the disclosure rather than against a " +
    "person",
  estimate_snapshot:
    "WL Gate 1, 2026-08-25: estimated_by records which corporate user recorded a planning " +
    "estimate; corporate planning data behind the D7 staffing wall, never evaluative of " +
    "the estimator (Ruling 1 untouched); generic action-log coverage; a named line is a " +
    "founder decision, not a drift",
  task_occurrence:
    "WL Gate 1, 2026-08-25: recorded_by is write provenance only; performed_by is " +
    "deliberately absent from this table (WK-DEV-008 section 1's schema-level " +
    "no-HOM-speed-coefficient guardrail), so the record attributes the writing of the " +
    "actuals, never the performing of the work; generic action-log coverage; a named " +
    "line is a founder decision, not a drift",
  time_segment:
    "WL Gate 1, 2026-08-25: recorded_by exists ONLY on a hom_refinement row (the " +
    "CHECK refuses it on every derived source), attributing a HOM's own optional " +
    "after-the-fact subdivision; derived segments carry no person by CHECK, the " +
    "covenant events' no-person posture, and attribution joins through time_entry " +
    "under the approved G-13 item; the surface waits on the refinement UI, so no row " +
    "can carry it yet",
  app_setting_version:
    "v5 intake ruling section 3, 2026-08-25: set_by attributes a corporate " +
    "CONFIGURATION change (who set a knob, and why, in the reason column), the " +
    "provision_versions class exactly, which is already allowlisted as " +
    "corporate-generic; no member or field data rides the row, and the write path " +
    "refuses without an attributed identity by design",
  work_requirement:
    "WL Gate 1, 2026-08-25: created_by, completed_by, and verified_by attribute planned " +
    "work instances (the written-work item's territory); shipped after the disclosure " +
    "was approved; founder line candidate for the next revision",
  household_task_profile:
    "WL Gate 1, 2026-08-25: configured_by records which corporate user set how a task " +
    "manifests in a household; a corporate configuration act, generic action-log " +
    "coverage; a named line is a founder decision, not a drift",
  task_definition:
    "WL Gate 1, 2026-08-25: created_by records which corporate user authored a global " +
    "task definition (reusable semantics, no member data), the provision_versions " +
    "posture: generic action-log coverage; a named line is a founder decision, not a drift",
  event_outbox:
    "WK-DEV-010 s4, 2026-08-25: the event-law envelope's actor column mirrors the actor " +
    "the same transaction's audit row already records (every emitting site writes both), " +
    "so this is the action log's own attribution restated on the transient delivery row; " +
    "generic action-log coverage, the exclusion-approval posture",
  visit_brief_snapshot:
    "WK-DEV-009 s2.1, 2026-08-25: briefed_user records which staff member each brief was " +
    "composed for, evidence of what was shown rather than judgment about the person; " +
    "shipped after the disclosure was approved; founder line candidate for the next revision",
  capture_artifact:
    "WK-DEV-009 s8, 2026-08-25: captured_by attributes the HOM's own free-text capture " +
    "and filed_by the corporate router's filing; shipped after the disclosure was " +
    "approved (the internal-observations clause's territory, the condition_flag class); " +
    "founder line candidate for the next revision",
  decision_record:
    "RFC-PRIM-01 build 3, 2026-08-25: routed_by and decided_by attribute who routed and " +
    "who chose; shipped after the disclosure was approved (the action-log clause's " +
    "territory); founder line candidate for the next revision",
  attention_record:
    "RFC-PRIM-01 build 2, 2026-08-25: acknowledged_by and resolved_by attribute who " +
    "noticed and who answered; shipped after the disclosure was approved (the action-log " +
    "clause's territory); founder line candidate for the next revision",
  situation:
    "WK-DEV-009 s10, 2026-08-25: created_by and resolved_by attribute a corporate " +
    "user's bundling of related noticing (a grouping act over records already " +
    "disclosed or excused, never new observation of a person); the action-log " +
    "clause's territory, the attention_record posture; founder line candidate for " +
    "the next revision",
  preference_rule:
    "WK-DEV-007 s4, 2026-08-25: recorded_by and retired_by attribute which corporate " +
    "user recorded or pruned a household operating preference; a corporate " +
    "configuration act about the household, never about the staff member (the " +
    "household_task_profile configured_by posture): generic action-log coverage; a " +
    "named line is a founder decision, not a drift",
  work_item:
    "RFC-PRIM-01, 2026-08-25: owner_id and resolved_by attribute tracked work; the " +
    "surface shipped after the disclosure was approved (the written-work item is the " +
    "natural home); founder line candidate for the next revision",
  shadow_log:
    "WK-DEV-007 s3, 2026-08-24: scored_by attributes the founder's weekly scoring of " +
    "engine output, a corporate-role action the action log's generic clause covers (the " +
    "exclusion-approval posture); the engine rows themselves carry no staff attribution. " +
    "Whether scoring deserves a named line is a founder decision, not a drift",
};

/** Detect staff-attributed tables from the schema source itself. A column
 * is attribution when it references auth_user, is the audit actor, or is
 * one of the known FK-less staff uuid columns. */
function detectStaffSurfaces(): string[] {
  const out: string[] = [];
  const blocks = tablesSrc.split(/export const \w+ = pgTable\("(\w+)"/);
  for (let i = 1; i < blocks.length; i += 2) {
    const table = blocks[i]!;
    const body = (blocks[i + 1] ?? "").split("pgTable")[0]!;
    if (table === "auth_user") continue; // the person, not an attribution
    // FK-less staff columns are listed by NAME because several attribution
    // columns carry auth_user ids as plain text/uuid without a reference
    // (reported_by's own comment says so). The first census missed
    // visit_photo, household, and incident_report for exactly that reason;
    // the count floor below is what catches the next such miss.
    const attributed = body.includes("authUser.id")
      || body.includes('"actor_user"')
      || /\b(heard_by|reviewed_by|covered_by|hm_user|uploaded_by|consent_recorded_by|reported_by|resolved_by)\b/.test(body);
    if (attributed) out.push(table);
  }
  return out;
}

test("every staff-attributed surface is named in the disclosure or excused in writing (G-13)", () => {
  const detected = detectStaffSurfaces();
  // The inputs case (round seven doctrine): a surface list that is present
  // but empty, or implausibly small, means the DETECTION broke, not that
  // the schema went quiet. The guard must fail on its own bad input.
  assert.ok(detected.length >= 20,
    `staff-surface detection returned ${detected.length} tables; the schema carries at ` +
    `least 15. The detection regex is broken, which would let every future surface pass unseen.`);
  const problems: string[] = [];
  for (const table of detected) {
    if (table in ALLOWLIST) {
      if (ALLOWLIST[table]!.trim().length <= 10) problems.push(`${table}: allowlist entry needs a real written reason`);
      continue;
    }
    const anchor = DISCLOSED[table];
    if (!anchor) {
      problems.push(`${table}: staff-attributed but neither disclosed nor excused - a person ` +
        `will sign this document; add the anchor mapping (and the founder's disclosure line) ` +
        `or an allowlist entry with a written reason`);
      continue;
    }
    if (!disclosure.includes(`<!-- surface-anchor: ${anchor} -->`)) {
      problems.push(`${table}: anchor "${anchor}" is not in the disclosure - the anchor comment ` +
        `was removed or renamed. Anchors are the contract (AA); restore it or re-map with ` +
        `founder approval.`);
    }
  }
  assert.deepEqual(problems, [], `G-13 surface guard:\n  ${problems.join("\n  ")}`);
});

test("the disclosure the guard reads is the signable document, not a stub", () => {
  // Anchors are the structural contract (AA); the prose is freely editable.
  const anchors = new Set([...disclosure.matchAll(/<!-- surface-anchor: ([a-z-]+) -->/g)].map((m) => m[1]));
  const needed = new Set(Object.values(DISCLOSED));
  for (const a of needed) {
    assert.ok(anchors.has(a), `disclosure is missing anchor "${a}"`);
  }
  assert.ok(disclosure.includes("Acknowledgment"),
    "the disclosure lost its signature block; this guard exists because a person signs it");
});

/**
 * G-13's SCOPE, stated in the document counsel reads and asserted here so
 * it cannot go stale (founder instruction, 5 September 2026: "four tables
 * and rising is what counsel needs to see").
 *
 * THE NUMBER SHE WAS GIVEN WAS THE WRONG UNIT and this assertion is what
 * corrected it. "The fourth staff-attributed table to ship since G-13
 * became a hiring precondition" counts arrivals since 5 September; what
 * the disclosure has to COVER is every staff-attributed table in the
 * schema, and that is a different and much larger number. Both sentences
 * are true and only one answers the question.
 *
 * The three numbers live in the disclosure as a note to counsel and are
 * checked against the computed census here, so nobody has to remember to
 * update them: a new staff-attributed table fails this test until the
 * note is corrected, which is the only way a count in prose stays true.
 */
test("the disclosure's scope note matches the computed census, so counsel reads a live number", () => {
  const detected = detectStaffSurfaces();
  const allowlisted = detected.filter((t) => t in ALLOWLIST);
  const disclosed = detected.filter((t) => !(t in ALLOWLIST));
  const say = (n: number, what: string) =>
    assert.ok(disclosure.includes(`${n} ${what}`),
      `the disclosure's scope note does not say "${n} ${what}". The census computes ` +
      `${detected.length} staff-attributed tables, ${disclosed.length} named in the text and ` +
      `${allowlisted.length} awaiting a line. Correct the note in ` +
      `docs/legal/staff-records-disclosure.md; a count in prose is only true while something checks it.`);
  say(detected.length, "staff-attributed tables");
  say(disclosed.length, "are covered by the numbered items");
  say(allowlisted.length, "are not yet named");
});
