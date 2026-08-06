---
status: frozen
---

# Founder rulings, 2 August 2026

Recorded by founder direction, Rachel Letters. To be read by every code session
before AR. These are the rulings the 1 August handoff said were missing. They are
now made. Report-and-stop doctrine governs anything here that disagrees with what
a session finds on the ground.

## Ruling 1. Decline-class taxonomy: APPROVED as proposed

The six categories in PLACEHOLDER_DIRECTIONS.md Direction 2a are approved verbatim:
diagnosis; treatment or treatment cycle; prognosis; hospice or palliative status;
care-facility transition; cognitive or physical decline of a named person.

Conditions, per the direction's own text and binding: the taxonomy is recorded in
docs/PROVISIONAL.md with a pilot-calibrated marker; the sweep of existing fields
(2e) is REPORT ONLY and any existing field that would be caught comes back as a
separate ruling; the scope-boundary test in 2c must exist and pass, proving the
proposal route still sells both Concierge services with the exclusion active.
Both guards (2b) are approved with it: the exclusion guard failing closed, and the
forced-decision guard on Sections 1 and 3.

## Ruling 2. Audit identity: 1a commissioned as confirmation; ADR-006 affirmed

Per CODE_IMPACT (newer than the Direction 1 text), ADR-006, tokenise at write
time, already exists and stands on engineering merit, and G-59 already records
two audit-write sites leaking a name and an email into audit_event.detail. So:
Session 1a runs as the SYSTEMATIC survey (there may be more than two sites), not
as discovery; ADR-006 is affirmed by this ruling, with one check, that its text
does not cite the withdrawn REQ-076 as justification, corrected to an
engineering rationale if it does; and G-59's tokenisation of the two known sites
is the first fix AR performs in this area. Any further names 1a finds join G-59's
class. No tables are created; member_circle_entry remains unbuilt pending REQ-077.

## Ruling 3. The provisional-marker regime: ADOPTED

Direction 0 is adopted in full: the counsel-pending marker with date, question id,
and blast-radius line; docs/PROVISIONAL.md as the register; the guard in
guards-manifest.test.ts with build-fail at 90 days (the 90 itself pilot-calibrated),
proven red, green, and against its own inputs with a non-zero count assertion.

Status note: the statutory deletion question (1.1) was ANSWERED 1 August, per
CODE_IMPACT_2026-08-01_DELETION_RULING.md, and its exact scope governs: no code
change required, all four WK-STD-026 rules stand as company policy, REQ-076
withdrawn, REQ-077 replaces it at P2. No session relaxes any of the four on the
strength of that ruling. PROVISIONAL.md seeds with the questions that ARE open:
see PROVISIONAL_seed.md in this package.

## Ruling 4. The Temporal Layer (WK-PLAY-001 Addendum C): YES, first post-pause build

Approved as the first schema work after the pause lifts, with two binding
sequence conditions: it does not begin until AO and AP have run and AQ has
reported; and the decline-class guards (Ruling 1) land BEFORE the Temporal Layer
migration, because the 83 fields include birth years, care transitions and
household-member data that must arrive pre-guarded. The first migration is
additive only: nullable fields, tier-tagged per Addendum B, no behaviour change.
Triggers and sequences follow in their own scoped sessions. The founder's August
paper capture on her own household validates the field list before any schema moves.

## Ruling 5. Member Circle register: SCOPED into WK-PLAY-003 now, paper first

WK-PLAY-003 Addendum A (issued today, in the library at 04_Playbook_PLAY) scopes
the register: recipient fields per the WK-STD-026 may-hold column and nothing
from the may-never-hold column, the pre-decline, and the whole-register decline
per WK-LEG-010 section 25. The pilot runs it on paper through the administrative
alternative. Scope note, per CODE_IMPACT: the 1 August ruling means recipient records MAY
lawfully enter the platform before a deletion path exists; paper-first through
the pilot is the founder's stricter-than-required policy choice, costing nothing
since the pilot is paper-official anyway. The remaining platform blockers are
engineering, a recipient-shaped erasure path (erase-household.mjs is
household-shaped) and the member_circle_entry build under REQ-077 at P2, not
counsel. When those exist, G-56 closes.

## Sequence and the AR gate

Housekeeping first (see SESSION_COMMISSIONING_BRIEF.md), then Direction 0, then
the Direction 4 tier-drift query, then Direction 2 (taxonomy is signed), then 1a
and the ADR, then 3a. AO, then AP, then AQ run read-only alongside. AR begins when
AQ has reported. The founder rulings AR was gated on are the five above.
