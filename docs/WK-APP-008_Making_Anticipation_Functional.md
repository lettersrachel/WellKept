---
status: living
---

**SUPERSEDED IN PART BY SESSION AQ, 1 August 2026.  **This specification was written before its author had read the repository, and three of its premises were wrong. The delta channel and the appliance horizon are already built. Part 1's relational tables (person, pet, system, policy, document, vehicle) do not match the running architecture, which is field-based: playbook_field for sections 1 to 24, registry_entry with typed kinds including dates, appliance, subscription and horizon, and no per-entity tables at all. The temporal layer belongs in registry_entry kinds and playbook_field, not in a new relational sub-model. Membership history is NOT destroyed as Part 1.4 claims: membership_event exists and is append-only. household.tier is a denormalised cache that is written at creation and never updated on tier_change, which is a staleness defect and a smaller problem than the one this document asserted. Gap register entries G-56 and G-57 already cover the Member Circle and the temporal layer. Read AQ's report before acting on any part of this.

**WELL KEPT HOME OPERATIONS MANAGEMENT LLC  |  APPLICATION SPECIFICATION**

**WK-APP-008  Making Anticipation Functional**

*Implementation instructions for the anticipation engine across all three tier profiles and all three role portals. 1 August 2026. Extends WK-APP-002. Depends on WK-APP-001, WK-APP-003, WK-APP-007, WK-STD-016, WK-PLAY-003 and WK-STD-026.*

WK-APP-002 catalogues what should fire. This document specifies what has to exist for it to fire at all, in what order it must be built, and how identical logic produces three different behaviours at Essential, Family Operations and Concierge and three different views for client, House Manager and corporate.

**The single most important statement in this document: the engine has two channels and only one of them currently has a substrate. CORRECTED 1 August 2026 by session AQ, which read the repository. The delta channel works today and is already corporate-editable in-app, so the Phase 4 acceptance criterion below is ALREADY MET. The horizon channel is not dead: registry_entry carries installedAt, lifespanMonths, maintenanceIntervalMonths and lastServicedAt as live columns, and registry-sweep.ts already computes replacement dates for the appliance and system class. It has no substrate for people, documents, policies, vehicles, schools or activities, because those fields do not exist. Part 1 is therefore a precondition for the PERSON and DOCUMENT horizons only, not for the channel as a whole.**

# **Part 1.  The data model**

## **1.1  Date fields. The horizon substrate.**

Add to WK-PLAY-003. Every field is a DATE or a DATE plus an interval, never a derived age or a free-text year, because the engine computes forward from the date and any pre-computation goes stale the moment it is written. Sensitivity per the WK-APP-003 matrix.

| **Field** | **Section** | **Type** | **Sens.** | **What it powers** |
| --- | --- | --- | --- | --- |
| person.birth_date | 1 / 2 / 3 | date | S1 | Learner permit at 15, driver at 16, the eighteenth, graduation, the last one home, the adult's own milestone. WK-STD-016 Section 4 channel 1 names this as the worked example. Replaces the existing age field, which cannot generate a horizon. |
| pet.birth_year | 4 | integer year | S1 | A pet at the end. Senior-care horizon. Age alone decays. |
| pet.chip_registry, pet.chip_updated | 4 | text, date | S2 | A chip registered to an old address does nothing. |
| system.installed_on | 10 / 11 | date | S1 | Water heater 8 to 12 years, HVAC 15 to 20, detectors 10, roof by material. WK-STD-016 Section 6. |
| system.expected_life_years | 10 / 11 | integer | S1 | Editable per unit; defaults from a lookup table by system type. |
| system.serial, system.model, system.warranty_start, system.warranty_years | 10 / 11 | text, text, date, int | S2 | Warranty and insurance claims, recall checking. Nothing currently supports a recall. |
| policy.type, policy.number, policy.renews_on | 6 / 9 | enum, text, date | S3 | Home, auto, umbrella, life, flood. Number is vault-only. |
| document.type, document.expires_on | 2 / 3 | enum, date | S3 | Passport, visa, status. Nine-month and six-month lead times respectively. |
| vehicle.registration_expires, vehicle.inspection_due | 6 / 7 | date, date | S2 | Virginia levies personal property tax and requires annual inspection. |
| school.calendar_source, school.term_dates | 3 | url or text, date[] | S1 | The highest-frequency household disruption and entirely predictable. |
| activity.season_start, activity.season_end | 3 | date, date | S1 | Gear, fees, snack rotation, end-of-season gifts. |
| marriage.date | 2 | date | S1 | Anniversary, and the ritual restored. |
| stored_value.expires_on | 10 | date | S2 | Gift cards, prepaid accounts, class packages, subscriptions. |
| maintenance_cycle.member, .type, .last_done, .interval_months | 2 / 3 / 4 | fk, enum, date, int | S2 | Dental, medical, vision, grooming, vehicle, renewals. Date, provider and member only. Never clinical detail, per WK-STD-016 Section 6. |
| tradition.status, tradition.lapsed_noticed_on | 2 / 19 | enum, date | S1 | A ritual restored is priced in WK-SVC-002 Addendum B and is unfireable today. The record captures standing traditions and has nowhere to note one STOPPED. |
| household.tenure_start, household.purchase_or_refi_window | 6 | date, enum | S2 | Upgrade prediction. WK-QA-017 and the affordability analysis: capacity to pay is set more by when they bought than by what they earn. |

**Migration note. person.age and pet.age are DROPPED, not retained alongside. Two sources for one fact is how the $28 wage rate survived three documents. Where a birth date is unknown, store NULL and let WK-APP-007 ask for it at the right moment; do not back-fill from age.**

## **1.2  The Member Circle**

A named register, not a field. WK-SVC-007 is specified to depend on it and it does not exist. One intake question only: who are the people you would want help showing up for. Six to twelve entries. Anything more is intrusive and produces a list the member does not use.

member_circle_entry

  id, household_id, display_name, relationship, sensitivity default 'S2',

  dietary_facts text[], observance_facts text[], declined boolean default false,

  created_at, created_by, deleted_at, deletion_reason

## **1.3  Recipient records**

These are records about people who are not clients, have not consented, and cannot see what is held. WK-STD-026 governs them absolutely.

| **Rule** | **Implementation** |
| --- | --- |
| Two-column may-hold and may-never-hold | May hold: name, relationship to the member, date of the occasion, dietary and observance facts, what was sent and when. May never hold: health detail beyond the fact of a diagnosis, financial detail, address beyond a delivery address, anything about character or circumstance. |
| Twenty-four month retention | A scheduled job hard-deletes any recipient record with no activity for 24 months. Not a soft flag. |
| Deletion on request | REQ-076 WITHDRAWN 1 August 2026, and this row is void. HARD BLOCKER NO LONGER APPLIES. Note the correction: REQ-071 is a composite privacy requirement whose deletion clause covers a CLIENT household at membership end and does not reach non-client records at all. The requirement did not exist until now. Until it is built there is no lawful way to remove a recipient record, so no recipient record may be created. |
| Never marketable | Recipient rows carry a non-marketable constraint and are excluded from every export, report and analytics view by default, not by convention. |
| Occasion sensitivity | A death, diagnosis, separation or job loss stores the FACT and the DATE only. Free-text notes on those occasion types are rejected at the API, not discouraged in the UI. |

## **1.4  Membership as effective-dated rows**

Stated separately because it must be decided before the household model is written and cannot be retrofitted. If tier is a mutable column on household, the expansion history is destroyed on first upgrade.

membership

  id, household_id, tier, weekly_rate, effective_from, effective_to NULL,

  founding_member boolean, rate_locked_until date, minimum_term_ends date

membership_event   -- append only, never updated

  id, household_id, membership_id, event_type, occurred_on,

  from_tier, to_tier, weekly_delta, reason_code, actor_id

event_type is the fixed set already defined on the Lead Register Events tab: signed, tier_change, pause_start, pause_end, cancellation, move, hm_change, reactivation. MRR at any date becomes a query. Expansion, contraction, churn and net revenue retention all derive from membership_event without a separate reporting table.

# **Part 2.  The two channels**

## **2.1  Delta channel. Works today.**

WK-APP-002's principle holds: triggers attach to fields, not to vigilance, and a field changing is itself the event. Implementation is a database-level change feed rather than application code scattered through the write paths.

| **Step** | **Behaviour** |
| --- | --- |
| 1. Capture | The close flow is the sensor, per WK-APP-001 2.2. The House Manager answers changes-noticed at every visit close. Structured answers route to field edits; unstructured answers become dots. |
| 2. Promote | Corporate's weekly pass asks one question of each dot: is this a field change in disguise? Promotion writes the field edit with provenance and the original dot text retained. |
| 3. Emit | Every field write emits field_changed(household_id, field_path, old, new, actor, at). This is the ONLY event the rule set subscribes to. No rule reads the field table directly. |
| 4. Match | Rules are rows, not code. A rule row holds field_path or threshold, a predicate, a cascade id, and a tier map. Adding a trigger is a data change reviewed by corporate, not a deploy. |
| 5. Suppress | Every candidate passes the suppression layer in Part 3 before it can surface. No exceptions, including tier full. |
| 6. Cascade | The cascade emits work items filtered by tier per Part 4 and rendered by role per Part 5. |

## **2.2  Horizon channel. Live for appliances, unpowered for people.**

Pre-computed from dates. CORRECTED 1 August 2026: registry-sweep.ts already does this for registry_entry kinds appliance and horizon. What follows is the EXTENSION of an existing mechanism to the classes that have no fields yet, not a new build. Read the sweep before writing anything.

nightly:

  for each household:

    for each dated fact (birth_date, installed_on, renews_on, expires_on,

                         season_start, term_dates, last_done + interval):

      due_on   = base_date + interval

      surface_on = due_on - lead_time(rule)

      if today >= surface_on and not already_open(rule, household, cycle):

          open horizon_item(rule, household, due_on, cycle_key)

cycle_key makes a horizon idempotent. A water heater at year eleven opens once per cycle, not every night. An annual inspection carries the year in the key.

| **Horizon class** | **Lead time** | **Source** |
| --- | --- | --- |
| Replacement, major system | 12 months | WK-STD-016 Section 6. A water heater is a planning conversation, not an emergency. |
| Replacement, minor (detectors, extinguishers, batteries) | 1 month | Annual cycles. |
| Statutory expiry (passport, visa) | 9 months passport, 6 months visa | WK-QA-015. |
| Statutory expiry (registration, inspection) | 2 months | Virginia cycles. |
| Policy renewal | 2 months | Time to shop it. |
| Child milestone (permit, driver, the eighteenth) | 3 months | Enough to prepare, not so much it is forgotten. |
| School term and activity season | 6 weeks | Gear, fees, schedule re-map. |
| Maintenance cycle | 1 month | Per member and pet. |
| Stored value expiry | 2 months | Use it or lose it. |

# **Part 3.  Suppression. Build this first.**

**WK-QA-015 is explicit: the suppression layer is built BEFORE sequences, not after, because it causes harm if wrong. A trigger that fires correctly in the week of a funeral is worse than a trigger that never fires at all.**

| **Suppression state** | **Set by** | **Effect** |
| --- | --- | --- |
| LIFE_EVENT active | Corporate, or House Manager escalation. WK-STD-016 Section 2 names the canonical tag as LIFE-EVENT, matching the WK-APP-003 status tag. Earlier drafts called it the bereavement register; do not reintroduce that name. | ALL proposals, gestures with a spend, upsell prompts and Moment offers are withheld at every tier including Concierge. Safety and statutory horizons still surface to the House Manager only, never to the client. Absorb friction quietly. |
| Field-level decline | Client, via WK-PLAY-003 Section 0 | The field is a CONFIRMED FACT of declining, not a blank. It is never re-asked at review, and no rule reading it may fire. |
| Category decline | Client, via the returned WK-LEG-010 Record Preview | The whole section is off. Section 25 in particular may be declined without affecting anything else. |
| Escalate-only | Corporate | Candidates queue to corporate and never reach the client or the House Manager briefing. |
| Pre-decline | Client standing instruction | Recorded before a trigger ever fires, so the first surfacing is already suppressed. This is the case a naive implementation misses. |

**Order of evaluation is fixed: pre-decline, then category decline, then field decline, then LIFE_EVENT, then escalate-only, then tier. A candidate that fails any gate is logged as suppressed with the gate that stopped it. Suppressed candidates are never silently dropped, because the suppression log is how pruning in Part 8 is measured.**

# **Part 4.  The three tier profiles**

WK-APP-002 defines the tier map as E:log, F:act, C:full. Those three words must be implemented as three distinct code paths with defined side effects, or the tier column becomes decorative.

|  | **LOG  (Essential)** | **ACT  (Family Operations)** | **FULL  (Concierge)** |
| --- | --- | --- | --- |
| Playbook write | Yes | Yes | Yes |
| Provenance and date stamped | Yes | Yes | Yes |
| Surfaces in pre-visit briefing | No | Yes | Yes |
| House Manager adjusts service within existing scope | No | Yes | Yes |
| Horizon item created | Only if statutory or safety | Yes | Yes |
| Gesture window opened against budget | No | No | Yes |
| Proposal drafted and routed through the proposal protocol | No | No | Yes |
| Corporate queue entry | No | Only on exception | Yes |
| Appears in the quarterly review digest | Yes | Yes | Yes |

**Two rules that prevent the tiers collapsing into each other.**

Safety and statutory always escalate to ACT regardless of tier. An expired smoke detector, a lapsed inspection, an out-of-date CPR certification under WK-STD-022 Section 1: an Essential household is not served a lower safety standard, only a smaller service.

A LOG entry is not invisible. It accumulates and appears in the quarterly review, which is where the upgrade conversation belongs under WK-LEG-008. An Essential household that generates thirty logged family cascades a quarter is the clearest upgrade signal the system can produce, and it is exactly the mechanism WK-QA-017 says the tier-mix assumption currently lacks.

Profile emphasis, per WK-APP-002 Section 4. Same library, different centre of gravity. Essential, the dual-income young family: home-and-rhythm triggers dominate. Family Operations: activity and school cascades run at full depth. Concierge, the estate and executive household: everything runs full, plus staff-coordination triggers that exist at no other tier. Emphasis is implemented as rule ordering and briefing prominence, never as a second rule set.

# **Part 5.  The three role portals**

WK-APP-003's principle is load-bearing: there are not three Playbooks. There is one model and each interface is a permission-filtered projection. Sensitivity times role is the only splitter.

|  | **Client portal** | **House Manager portal** | **Corporate portal** |
| --- | --- | --- | --- |
| S1 fields | Visible | Visible | Visible |
| S2 fields | Hidden | Visible | Visible |
| S3 fields | Hidden | In-context at point of use, every access logged | Visible, fully audited |
| Horizon items | Only those the household should act on, phrased as information not upsell | All, in the pre-visit briefing, ordered by due date | All, plus the suppression log and the fire rate per rule |
| Delta candidates | None | Those passing tier ACT or FULL | All, including suppressed, with the gate that stopped each |
| Moments | Only after a proposal has cleared the protocol | Notified when a Moment is proposed so the visit reflects it | The proposal queue, and the two that may never be auto-surfaced |
| Member Circle | Full read and write, and may decline entirely | Read only, and only what is needed to execute a package | Full, audited, subject to the 24-month deletion job |
| Own access log | THE HIGHEST-VALUE UNBUILT FEATURE. A client-facing view of who opened their record and when. It converts a promise into evidence. CORRECTION (AQ, 2026-08-05, per the G-53 finding): audit rows are reliable evidence of confirmed disclosure only from 30 July 2026 onward; rows dated 29 July or earlier record an access ATTEMPT, and repeated rows may cover one real exposure. Any client-facing render MUST carry a 30 July date floor or an on-screen caveat for earlier rows. The prior sentence here claiming the row is written before any secured value is released was the optimistic pre-G-53 description and is superseded. | n/a | Full audit, date-floored |

**S3 is a vault, not a field. Codes and credentials are never rendered in the document body. They are revealed at the point of use, the audit row is written BEFORE the value leaves the server, and the release is refused if the row cannot be written. That ordering is a standing rule and is not negotiable for performance.**

# **Part 6.  Moments**

Eighteen priced services in WK-SVC-002 Addendum B. They divide three ways and the division must be enforced in the rule table, not left to judgement.

| **Class** | **Moments** | **Engine behaviour** |
| --- | --- | --- |
| Surfaceable today | The adult's own milestone, graduation, first birthday in a new city | Fire from the important-dates registry, grade, and the Section 23 posting-end horizon. Tier FULL only, and only through the proposal protocol. |
| Blocked on Part 1 | The eighteenth, the last one home, a pet at the end, federal retirement | Each needs a birth or service date that does not exist. Rules may be written now and left inactive with a dependency on the field. |
| NEVER auto-surfaced | The end of treatment, moving a parent into care | Hard exclusion in the rule table with a comment pointing at WK-STD-016 Section 2. Both depend on decline, which the record deliberately does not hold and which routes to LIFE_EVENT with the instruction to propose nothing. They reach a House Manager by noticing and are offered only after the household raises the subject. A future contributor must be unable to enable these without deliberately removing the exclusion. |
| Blocked on a missing field | A ritual restored | Needs tradition.status and tradition.lapsed_noticed_on. Priced today and unfireable. |

# **Part 7.  Showing Up**

Sequenced strictly. Each step is a blocker for the next.

| **Order** | **Step** | **Gate** |
| --- | --- | --- |
| 1 | Member Circle register, G-56 (the deletion blocker was withdrawn 1 Aug 2026) | Hard blocker. No recipient record may be created before deletion exists. WK-STD-026 and REQ-076. |
| 2 | member_circle_entry, and the one intake question | The register WK-SVC-007 depends on. |
| 3 | Recipient occasion records with the may-hold and may-never-hold constraint enforced at the API | Free text rejected on death, diagnosis, separation and job loss occasion types. |
| 4 | The anniversary prompt | The single most valuable item in WK-SVC-007. Eleven months after a death, and at each subsequent anniversary until the member says stop. For a pregnancy loss, the due date is prompted as well as the loss date. |
| 5 | Dietary and observance facts against the recipient | The compounding asset: the second package is correct without asking. |
| 6 | Sent-log | Prevents sending the same thing twice. |

Disclosure is now handled. WK-LEG-010 section 25 was added on 1 August 2026 and a member may decline the entire register without affecting any other part of their record. The implementation must honour that decline as a pre-decline under Part 3, before any prompt is generated.

# **Part 8.  Volume control**

WK-STD-016 Section 7: a system that fires forty things a week trains a House Manager to skim, which is how a water heater at year eleven gets missed alongside a reminder to rotate the couch cushions.

| **Control** | **Rule** |
| --- | --- |
| Per-visit cap | No more than seven surfaced items in a pre-visit briefing. Overflow ranks by due date and safety class and defers, it does not drop. |
| Every flag carries a revisit trigger | Set at the moment of flagging. A date or a condition. The API rejects a flag without one. |
| Re-observe, not re-remind | A flagged condition is re-observed at each visit rather than only at its revisit date, because a flag records a rate of change as much as a state. |
| Promote on acceleration | Anything degrading faster than its flag assumed is promoted rather than left to its original timing. |
| Annual pruning | Four questions per rule at the annual review. Rules that fire often and are dismissed often are retired. The suppression log and the dismissal rate are the evidence. |
| Fire-rate telemetry | Per rule: fired, surfaced, actioned, dismissed, suppressed and by which gate. Without this, pruning is opinion. |

# **Part 9.  Governance. Non-negotiable per pull request.**

| **Requirement** | **Applies to** |
| --- | --- |
| Payload guards on every new client-facing route | All of Part 5. |
| The audit row is written before any secured value leaves the server, and the release fails if the row cannot be written | All S3 access. |
| Any commit adding a data category updates legal/README.md AND the privacy notice collection table in the SAME pull request | Every table in Part 1. member_circle_entry and recipient records are each a new data category, as is lead. |
| A lead who never signs is a person who is not a client | WK-STD-026 applies to the CRM in Part 1.5, not only to Showing Up. Same retention, same deletion, same non-marketable constraint. |
| Kelly Stover is the designated second key custodian | ADR-005. |
| Sensitivity is a property of the field in the one model, never of the interface | Changing a field's sensitivity changes every portal at once. No interface holds its own copy of the truth. |

# **Part 10.  Build order and acceptance**

| **Phase** | **Contents** | **Done when** |
| --- | --- | --- |
| 0. Decide | Membership as effective-dated rows. Cannot be retrofitted. | The household table has no tier column. |
| 1. Substrate | Part 1.1 date fields in WK-PLAY-003 and WK-PLAY-002 together. Drop age. | A birth date entered in the workbook reaches the schema and no age field remains anywhere. |
| 2. Deletion | REQ-076. | A recipient record and a lost lead can each be hard-deleted on request, and the deletion is itself audited. |
| 3. Suppression | Part 3, all six states, in the fixed evaluation order. | A LIFE_EVENT household receives zero proposals at Concierge, and a pre-declined category never generates a first surfacing. |
| 4. Delta channel | Part 2.1, rules as rows. | A new trigger can be added by corporate as a data change with no deploy. |
| 5. Horizon channel | Part 2.2 nightly job. | A water heater installed 11 years ago surfaces once, 12 months before due, and does not surface again that cycle. |
| 6. Tier paths | Part 4, three distinct side-effect sets. | The same field change at Essential writes only to the Playbook, at Family Operations reaches the briefing, and at Concierge opens a gesture window. |
| 7. Portals | Part 5. | A single field's sensitivity change alters all three portals with no second edit. |
| 8. Moments | Part 6, with the two hard exclusions. | The two excluded Moments cannot be enabled without removing an explicit exclusion. |
| 9. Showing Up | Part 7, in order. | A declined section 25 produces no prompt of any kind. |
| 10. Client access log | Part 5, the client's own view. | A household can see who opened their record and when. Ships ONLY with the 30 July 2026 date floor or the on-screen caveat for earlier rows (AQ correction 4); without one of the two, this view tells a household something untrue about who saw what, and it does not ship. |

**Phases 0 through 2 are prerequisites for everything else and none of them is a feature. Phase 10 is the smallest item on the list and the one most likely to persuade a hesitant household, because it is the only place the company's central promise becomes checkable by the person it was made to.**

*WK-APP-008, issued 1 August 2026. Owner: Rachel Letters, CEO. Companions: WK-APP-001 to 007, WK-STD-016, WK-STD-026, WK-PLAY-003, WK-QA-015. Recorded in WK-SOP-000 v3.1.*