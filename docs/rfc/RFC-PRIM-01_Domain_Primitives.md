---
status: living
---
# RFC-PRIM-01: the nine primitives against the schema that exists

25 August 2026, opening the substrate window the way the Implementation
Handoff section 5 orders it: one domain RFC before any migration,
reuse named where a table already expresses the concept cleanly, and
new tables only where nothing does. Every claim below is a claim about
packages/schema/src/tables.ts at the head this RFC lands with. Under
WK-DEV-006 section 8, the verdicts are proposed defaults: the founder
has 48 hours from delivery to redirect any of them, after which they
stand and the window's migrations proceed in the order at the end.

## Required field for every primitive from here on: PRODUCER

Added 27 August 2026 (G-85). Every primitive entry states, **per column
it proposes**, what will write it, or records that nothing will yet:

- **Written by:** the surface that writes the column, or
- **NO PRODUCER YET:** the session that will build that surface.

0058 shipped ten columns with no writer, all NULL on every production
row, with a shape assertion, four CHECK constraints and a
granularity-aware render guarding a path no data could reach. Correct,
inert, and indistinguishable from a working feature on a green CI
summary. Its migration header did say "what the capture form writes", in
the future tense, and that read as a design note.

Schema ahead of its writer is a fine thing to do DELIBERATELY. It is not
a fine thing to do by accident, and after the fact the two look
identical. "NO PRODUCER YET" needs no defence; an unanswered field is
what this exists to prevent.

**This cannot become a guard.** A static reader cannot tell which
columns a runtime-assembled insert touches, so detection would be
table-scoped, which is the blindness G-83 is about; and "no writer" is a
valid state, so the guard would fire on every intentional case and be
allowlisted into silence. It stays a sentence a person writes at the
only moment the answer is known.

## 1. Household: EXISTS, the primitive is already the pattern

`household` is the tenant boundary; every scoped table carries
household_id; authorization resolves per (user, household) at query and
action time (session.ts getPrincipal), proven by the tenant-isolation
journey and the payload guards. Status and operating preferences live
on the row (status_tag, membership_terms) and in the knob rows.
**Verdict: reuse, no migration.** The primitive's design rule is
already CI-held; nothing to build.

## 2. EventAuditRecord: EXISTS across three deliberate pieces

`audit_event` (append-only, actor, value hashes, ADR-006 subject
tokens), `event_outbox` (the OUTBOX-01 stream: field.changed, the
covenant kinds), and `provision_versions` for the standards library.
The handoff's correlation ID is the one absent element (CAND-OBS-01,
already assigned to the Phase 1 tail). **Verdict: reuse; the OBS-01
correlation-ID work is the only build, and it is already queued in the
CAND ledger, not here.**

## 3. IncidentException: EXISTS

`incident_report` carries kind, severity, owner-shaped status,
description, resolution; the corporate board's exception queue is the
INC-01 consumer. Gaps against the handoff's rule: containment,
root-cause, corrective-action, and learning-link are prose in
description/resolution rather than fields. **Verdict: reuse; widen
with structured columns only when the exception queue (INC-01, Phase
1/2 boundary) is built and shows the prose failing.** No migration in
this window.

## 4. WorkItem: THE window's real build

Today four tables each hold a fragment of "a meaningful unit of work":
`deferral` (noticed-and-postponed, client-visible), `paused_decision`
(internal research), `condition_flag` (a watched concern),
`prompt_pack_item` (rhythm work the engine surfaces). They already
share the resolution vocabulary and the revisit-trigger CHECK by
convention, which is exactly the duplicate-state risk the primitive
exists to end. **Verdict: build `work_item` as the generalization for
NEW work kinds (vendor work, follow-ups, Runways), with lifecycle
(open, blocked, done, abandoned, whole-or-absent resolution), owner,
source, window, sensitivity, and completion evidence as an event.
DO NOT migrate the four existing tables into it in this window:** they
are proven, guarded, and erasure-mapped; a rewrite buys risk and no
capability. The RFC's rule for them: no FIFTH fragment table is ever
added; anything new is a work_item. Convergence of the four is a
later, evidence-gated decision.

## 5. AttentionRecord: PARTIAL, the notification generalizes

`notification` is the delivery half (owner, read state); the reasons
to notice are scattered (overdue deferrals, promotion candidates,
missing-visit marks, digest attention lines) and computed per surface.
**Verdict: build `attention_record` in the same migration window as
work_item** (owner, audience, urgency, deadline, acknowledgment,
resolution, sensitivity, delivery strategy), with the computed
surfaces WRITING attention records instead of each recomputing, and
notification becoming its delivery mechanism. The single-consent rule
and the A0 cap stand above it: an attention record informs, never
executes.

## 6. DecisionRecord: PARTIAL, adjacent to two proven shapes

`paused_decision` records a decision deliberately not made;
`client_edit` records a proposed change awaiting review; the gesture
gate approves an act. A genuine routed choice with recommendation,
alternatives, evidence, authority rule, and expiry exists nowhere.
**Verdict: build `decision_record` third in the window,** because the
anticipation engine's promotion path (shadow log to SIGNALS to a
suggestion a human confirms) terminates in exactly this shape, and
building it after work_item and attention_record lets a decision
reference both. Authority-class field constrained to the ladder; the
single-consent rule is a CHECK-shaped invariant: no batch decider.

## 7. PreferenceRule: EXISTS in three provenances, one gap

Explicit preference lives in `playbook_field` (provenance vocabulary),
household knobs in `app_setting`, and negative preference in
`anticipation_exclusion`. The handoff's rule that inference never
silently becomes fact is already the shadow doctrine. The gap is
OBSERVED preference as a first-class row with confidence and review
date. **Verdict: defer.** Nothing observes preferences yet; when the
engine's scored signals earn promotion, the promoted trigger's output
is the natural first observed-preference writer, and the table lands
then, evidence in hand.

## 8. IdentityAccessGrant: EXISTS for staff, thin for purpose limits

`household_role_assignment` (role, nda_approved, one-role index),
session/MFA machinery, and the mobile pairing grant express the staff
half. Purpose limitation, expiry, break-glass, and revocation-reason
are absent. **Verdict: defer to the AUTHZ-01 general authority engine
(P1 in the CAND ledger), and record here that AUTHZ-01 subsumes this
primitive rather than duplicating it.** The stranger-mode marker built
tonight is a first purpose-limit; the pattern generalizes there.

## 9. TrustCredential: ABSENT, correctly

Nothing expresses vendor/provider credentials, and nothing may:
records about people who are not clients are gated on REQ-077's
member_circle machinery (a merge-gating rule). **Verdict: blocked by
design; VND-01 stays P1 behind REQ-077.** Building it earlier would
violate the non-client-records gate, not advance the substrate.

## The proposed order for the window's migrations

One migration per session, definition of done per WK-DEV-007 section 4
(zod parity, permission-wrapped service layer, events over the outbox,
matrix/isolation/lifecycle tests, erasure extension, synthetic seed):

1. `work_item` (0041): the generalization, with its lifecycle events
   on the outbox (work_item.opened, .resolved).
2. `attention_record` (0042): the noticing layer, wired to the
   existing computed surfaces.
3. `decision_record` (0043): the choice layer, referencing both.

Deferred with reasons above: PreferenceRule (until observed preference
exists), IdentityAccessGrant (into AUTHZ-01), TrustCredential (behind
REQ-077), IncidentException widening (behind INC-01), correlation IDs
(OBS-01). Household and EventAuditRecord need nothing.
