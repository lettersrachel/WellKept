/**
 * Direction 2 (PLACEHOLDER_DIRECTIONS.md / OPEN_ITEMS_INSTRUCTIONS.md,
 * 1 August 2026): no trigger rule, cascade or prompt pack may read a field
 * whose presence implies a diagnosis, a treatment, an elder's decline, or
 * similar - WK-STD-016 Section 2 routes decline to the LIFE-EVENT register
 * with the instruction to propose nothing, and this is the durable
 * statement behind that: a class of field, not a list of named Moments
 * (Moments come and go; WK-SVC-002 Addendum B's two - end of treatment,
 * moving a parent into care - are the examples, not the whole set).
 *
 * Scope boundary, stated once so it does not drift: this excludes
 * AUTOMATED SURFACING only - trigger_rule matching and prompt_pack_item
 * emission. It has no opinion on and must never touch a service catalogue
 * or a sales/proposal path. As of 1 August 2026 no such path exists in
 * this codebase (grepped for "Moment" and "proposal protocol" across
 * apps/web/src, packages/trigger-engine/src and services/worker/src: zero
 * matches), so there is nothing else for this module to accidentally
 * reach - the boundary is enforced by this module touching exactly one
 * function (ruleMatches, engine.ts) and nothing else.
 */

// pilot-calibrated: founder-approved 2026-08-01, deliberately narrow and
// deliberately incomplete. The pilot will surface cases this list does not
// cover; it is a category for judging new fields against, not a closed
// enumeration. Human-facing only - nothing in this module matches text
// against these words directly. See DECLINE_CLASS_FIELDS below for the
// actual enforcement surface.
export const DECLINE_CLASS_TAXONOMY = [
  "diagnosis",
  "treatment or treatment cycle",
  "prognosis",
  "hospice or palliative status",
  "care-facility transition",
  "cognitive or physical decline of a named person",
] as const;

/**
 * The actual per-field registry. Matched the same way `ruleMatches`
 * matches everything else in this engine (engine.ts:88-89):
 * case-insensitive substring, because field names are free text and this
 * is the existing identifier pattern for the whole class (ROUND6_FINDINGS_K.md).
 *
 * Direction 2e's report (1 August 2026, read-only per the brief): checked
 * whether any existing field already matches the taxonomy before tagging
 * anything, per the explicit instruction not to tag silently. Three do,
 * all found in the 258-field template (tooling/seed/fernbrook_template_seed.json),
 * none in Section 1 or 3 as the brief's authors guessed - two are in
 * Section 23 ("horizon registries"):
 *
 *   - "Resident-member health horizon" (23): "any serious diagnosis or
 *     disability onset in the household" - matches "diagnosis" directly.
 *   - "Aging-parent horizon" (23): "parents' locations, living situations,
 *     and any early signals" - matches "cognitive or physical decline of a
 *     named person."
 *   - "Other dependents (elder care, special needs)" (3) - matches the
 *     same category.
 *
 * Tagged true here rather than left for a later session: verified (grep,
 * services/worker/src and packages/trigger-engine/src) that zero trigger
 * rules currently bind to any of the three, so this is a zero-live-
 * behavior-change closure of a real gap, not a live policy change. Leaving
 * them untagged would be the actual gap this direction exists to close -
 * these are exactly the fields a future rule-authoring session could bind
 * to without knowing the concern exists.
 */
export const DECLINE_CLASS_FIELDS: readonly string[] = [
  "resident-member health horizon",
  "aging-parent horizon",
  "other dependents (elder care, special needs)",
];

export function fieldIsDeclineClass(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return DECLINE_CLASS_FIELDS.some((f) => lower.includes(f));
}

/**
 * The exclusion set. Empty today, on purpose - nothing has been reviewed
 * and approved to bind a rule to a decline-class field. Each entry is a
 * rule identifier (packKey, the stable identifier per session M) plus the
 * written reason a founder approved binding it anyway, matching the
 * written-reason pattern every other guard's escape hatch already uses.
 *
 * A rule whose packKey is not here, matched against a decline-class field,
 * is a hard error at match time (see ruleMatches in engine.ts) - not a
 * skip, not a silent suppression. The distinction matters: a skip looks
 * identical to "this rule simply didn't fire today," which is exactly the
 * failure mode G-55 named for refusals and this module exists to avoid for
 * triggers.
 */
export interface DeclineClassExclusion {
  packKey: string;
  reason: string;
  approvedBy: string;
  approvedOn: string; // YYYY-MM-DD
}

export const DECLINE_CLASS_EXCLUSIONS: readonly DeclineClassExclusion[] = [];

export function isDeclineClassExcluded(
  packKey: string,
  exclusions: readonly DeclineClassExclusion[] = DECLINE_CLASS_EXCLUSIONS,
): boolean {
  return exclusions.some((e) => e.packKey === packKey);
}

/**
 * The forced-decision guard's baseline (2d/the CI half). The brief asks
 * for "any NEW field added to Section 1 or 3 fails CI until decline_class
 * is set explicitly" - but 23 fields already exist there today (9 in
 * Section 1, 14 in Section 3, per tooling/seed/fernbrook_template_seed.json,
 * checked 1 August 2026), and classifying all twenty as true or false
 * individually is not what Direction 2a's founder sign-off covered - that
 * approved the six-item CATEGORY list, not a field-by-field ruling on
 * every existing Section 1/3 field. Inventing twenty of those mid-session
 * would be exactly the "taxonomy invented mid-session" CLAUDE.md says to
 * stop and ask about, at the individual-field level instead of the
 * category level.
 *
 * So: fields in this snapshot are grandfathered (their absence from
 * DECLINE_CLASS_FIELDS is not itself a CI failure). Anything in Section 1
 * or 3 NOT in this snapshot is new since 1 August 2026 and must be
 * explicitly classified - present in DECLINE_CLASS_FIELDS (true) or in
 * DECLINE_CLASS_FIELDS_CONFIRMED_SAFE below (explicitly considered and
 * ruled not decline-class) - or the guard fails, naming the field, per
 * decline-class-exclusion.test.ts.
 */
export const SECTION_1_3_BASELINE_1AUG2026: readonly string[] = [
  "allergies: every person, every severity (food, medication, environmental, insect)",
  "cadence registry, children [s2]: well-child visit (birthday-adjacent), dental, vision, vaccination/school-form deadlines, sizing check (6 wk pre-season), activity gear and registration windows, passport 5-year marks",
  "cannabis and alcohol: home cultivation or bar/cellar storage secured from minors and visiting children; state legal limits noted where home cultivation applies",
  "child-related rules: screens, snacks, homework, what hm may/may not do",
  "custody schedule (if applicable) [s2]: which weeks/days each child is home (drives visit rhythm and briefing); co-parent handoff logistics (who, where, what travels with the child); information boundary with co-parent (what the hm may confirm: default nothing without direction; neutrality applies doubly); duplicate-gear map across two homes",
  "discipline / redirection method: how parents want behavior handled, and the firm boundary that the hm never disciplines (only gently redirects and reports)",
  "each child: name, age, school and grade, weekly schedule",
  "each child: room rules and boundaries (enter? knock? never?)",
  "each child: what they notice, need, or are proud of (the duvet layer)",
  "firearms in the home: presence, storage method (secured/unsecured; safe, lockbox, or cabinet), ammunition stored separately? critical if unsecured and children (resident or regular visitors) have access",
  "foster / kinship / temporary guardianship [s2]: placement-ready mode (room + age-ranged essentials kit maintained; dignity-first arrival kit: new items, real bag); licensing compliance cadence (locked meds, water-heater temp, detectors, firearms storage, egress per state standards; inspection-ready always); caseworker visit protocol (credentials verified); visitation/exchange logistics under agency rules",
  "foster confidentiality (law, not courtesy) [s3-adjacent]: no photographs of foster children ever; no names/case details in any record beyond first name; media logic default-never; hm discusses placements with no one; trauma-informed notes (snack basket stocked + reachable; never comment on food taken/kept; predictable rhythms)",
  "gift-flagging protocol: an unusual or high-value gift, particularly from a foreign source (2026 federal minimal-value threshold: $525), is flagged for the client's own review; well kept and the hm never assess or advise, only flag and report, the same standard as the do-not-admit register",
  "house rules the hm must never undermine: screens, snacks, chores; whose jobs are the children's own (what is deliberately left undone for them)",
  "household summary paragraph (drafted after intake, client-readable)",
  "information boundaries [s2]: tooth fairy / santa protocols; anything the children do not know; who may be told what",
  "medical alerts and devices (epipen/inhaler/other): locations, expiration check cadence (vt)",
  "medications and controlled substances: secure-storage status (locked cabinet or bag) where controlled substances are present and the hm has regular unsupervised access; companion to the s2 prescription cadence row above, never adding clinical detail",
  "other dependents (elder care, special needs): needs and boundaries",
  "school communication channels: which portal/app/email supply lists and forms arrive through; forwarding or access arrangement for the hm",
  "security clearance, sensitive federal occupation, or multiple, diplomatic, or international-organization passport situation: critical-flag-eligible; client marks that heightened discretion applies without disclosing agency or clearance level",
  "security or legal flags: nda, custody arrangements, restraining orders, do-not-admit list",
  "sizes registry per child: clothing, shoe, uniform sizes, updated at seasonal changeovers (required by back-to-school and gift bundles, wk_02q)",
];

/**
 * Fields in Section 1 or 3 that someone has actually looked at against the
 * taxonomy and ruled are not decline-class - the explicit "false" a bare
 * absence from DECLINE_CLASS_FIELDS cannot represent. Empty today: the
 * three baseline fields above are grandfathered, not yet reviewed, and
 * deliberately not pre-filled here either - reviewing them is its own
 * small task, not a defaulted judgment made in passing while building the
 * guard that would enforce the judgment.
 */
export const DECLINE_CLASS_FIELDS_CONFIRMED_SAFE: readonly string[] = [];

export class DeclineClassViolation extends Error {
  constructor(fieldName: string, packKey: string) {
    super(
      `rule "${packKey}" matched decline-class field "${fieldName}" with no reviewed exclusion entry. `
      + `WK-STD-016 Section 2: decline routes to LIFE-EVENT with the instruction to propose nothing. `
      + `Add a DeclineClassExclusion to packages/trigger-engine/src/decline-class.ts with a written `
      + `reason if this binding is genuinely intended, or fix the rule's bindsToFieldName.`,
    );
    this.name = "DeclineClassViolation";
  }
}
