---
status: living
---
# The section 32 release-blocking list against the guard set

27 August 2026. The Backstage Intelligence spec v2 is Tier C; this is a
CHECKLIST review, not a plan to build tests. Three verdicts per risk:
**COVERED**, **UNCOVERED**, and **PASSES FOR THE WRONG REASON**, which is
the category worth the time because it is the one that produces false
assurance.

Counted by hand, 27 August: the list carries **26 risks**. The guard set
is 17 rows in the CLAUDE.md table over 15 guard files plus the `sizes`
CHECK, with 26 e2e journeys and the package suites beside it.

## The floor, applied before anything else

Two blind spots are already written in the guard table's own
not-covered column, and they decide a large fraction of this list before
any individual mapping:

1. **Free text a person writes.** No guard reads meaning.
2. **What a permitted key CONTAINS**, as opposed to which keys are
   present.

**Any risk that reduces to either is UNCOVERED regardless of which guard
appears to address it.** That is not pessimism; it is the reason the
third category exists at all.

A second distinction this review keeps separate, because collapsing it
is how a checklist lies: **covered by a GUARD** (computed, derives its
own scope, fails on a new instance) versus **covered by a JOURNEY**
(one worked example, proves the path it walks and nothing about the path
beside it). Both are real coverage. Only the first generalizes.

And a third state the spec's binary has no room for: **NOT YET
APPLICABLE**, where the surface the risk names does not exist. Those are
listed as UNCOVERED with the reason attached, because "no vendor
projection leaks" is true today for a reason that will stop being true.

---

## PASSES FOR THE WRONG REASON (6)

The ones worth the review.

### 1. Client projection: client responses cannot contain prohibited S2, S3 or internal keys

**What appears to cover it:** `assertClientPayloadSafe`,
`assertNoProvisionRows`, `assertNoAnticipationRows`, and
`client-payload-shape.test.ts`. Four mechanisms, all green.

**Why that is the wrong reason.** They check that no row is LABELLED s2
or s3, that no known-bad SHAPE appears, and that no UNDECLARED KEY
appears. The risk says content. **A genuinely s2 fact typed into an s1
`playbook_field.value` passes all four**, because the row really is
labelled s1 and `value` really is a declared, permitted key. The label
is trusted and the label can be wrong about its own contents.

This is the floor's second blind spot in its purest form, and it is
already written in the guard table. The test name and the guard names
sound like the same claim and are not.

### 2. Presentation suppression: no human-value runtime changes remain silent

**What appears to cover it:** `success-visibility.test.ts` and
`refusal-visibility.test.ts`. Two guards, both computed, both proven red.

**Why that is the wrong reason.** They cover an ACTION confirming and a
REFUSAL rendering. Neither covers a SUPPRESSION being announced, and
those are different events. **G-81 is exactly this risk and was found by
a person, not by either guard**: a client email the system decided not
to send surfaced only in a log nobody opens, while `success-visibility`
stayed green throughout, because the action it watches did complete.

Partly closed since, by the G-81 wiring that raises an attention record
for the corporate queue. The guard that appears to cover the risk still
does not.

### 3. Observability privacy: no raw restricted household content in logs, errors, replay or URLs

**What appears to cover it:** `telemetry-discipline.test.ts`.

**Why that is the wrong reason**, and the guard says so itself: its
not-covered column reads "free text a developer writes into a message;
telemetry channels other than Sentry and console". So it covers two
channels and a set of identifier SHAPES. The risk names four surfaces,
of which **replay and URLs are unguarded**.

URLs are the live one. `recorded()` and `refuse()` put a message into a
redirect parameter, and the standing rule that a message names WHAT
happened and never a VALUE is prose, enforced by nobody. A future author
interpolating a field value into a confirmation would produce a URL
carrying household content, and every guard would stay green.

### 4. Notification duplication: one Situation cannot produce duplicated member asks across channels

**What appears to cover it:** the SITUATIONS work (0056) and its journey,
which proves bundled noticing arrives as ONE card and that resolving the
grouping never closes the noticing inside it.

**Why that is the wrong reason.** That journey proves bundling on the
FIELD BRIEF, which is a staff surface. The risk is about **member** asks
across channels, and the channels members actually have are the client
report email and the weekly digest. **Situations do not reach either.**
A reader seeing the situations journey green concludes duplication is
handled; it is handled on a surface no member sees.

### 5. Equivalent input paths: alternate paths do not lose essential function, authority checks, provenance or error recovery

**What appears to cover it:** the capture journey (text, on `/visit`),
the contextual-entry journey (scan, `/context/[id]`), and photo upload.
Each path is individually journey-proven, including its authority gate.

**Why that is the wrong reason.** The risk is about EQUIVALENCE BETWEEN
paths, and nothing compares them. Each journey proves its own path in
isolation, so a path that quietly lost provenance or an authority check
relative to its sibling would still show green. Testing three things
separately is not testing that they agree, and the green set reads as
though it were.

### 6. Universal ease baseline: complete a representative member workflow without enabling any accessibility or simplified mode

**Why it passes for the wrong reason:** **no accessibility or simplified
mode exists**, so the condition is vacuously satisfied. Nothing is being
verified; there is nothing yet to fail.

Recorded because of what happens next: it stops being vacuous the moment
a simplified mode ships, and **nothing will re-check it at that point.**
A risk that is trivially satisfied today and silently violated later is
worse than one that is openly uncovered, because the checklist already
has a tick against it. The same applies to the no-diagnosis gate below.

---

## COVERED (7)

### 7. Permissions: generated contract matrix and deny branches for material actions

The strongest item on the list. `permissions.test.ts` holds the full
role-by-sensitivity matrix at **100% enforced coverage or the build
fails**, mirrored independently by `permissions.verified.mjs`. Deny
branches are journey-proven in four places: the client walled out of
staff surfaces, tenant isolation at the page layer, the tester journey,
and the board's Ruling 1 refusal for a corporate_ops seat.

### 8. Offline HOM: full visit capture and close in airplane mode, ordered sync, conflict handling

`airplane.spec.ts` covers offline capture and drain, an offline condition
flag, and a close flow surviving a reload. The `@wellkept/offline-queue`
suite covers ordering as a contract, head-of-line blocking, the
dead-letter cap, operator retry and discard, and bounded backoff. Both
directions, unit and live.

### 9. Client correction: correction with source conflict creates reconciliation, not blind overwrite

Structural rather than tested-into-place: a client edit is a PROPOSAL
(`client_edit`), and `reviewEdit` is a corporate act. There is no path
by which a member's correction overwrites a stored value directly. The
intake journey proves capture and correction with both writes audited as
hashes.

### 10. Access expiry and offboarding: expired or revoked access fails immediately

`getPrincipal` resolves assignments PER REQUEST, so a revoked role fails
on the next request by construction rather than by session bookkeeping.
The G-68 journey proves assign and revoke with the audit trail agreeing,
and G-69 made the revocation row name its subject. Provider-side revoke
is not applicable: no providers exist.

### 11. Release rollback: a consequential flag can be held, rolled back or killed without an app-store release

`app_setting.feature_flags` with declared fallbacks; `feature-flags.test.ts`
proves malformed rows resolve to the declared fallback rather than
flipping. `client_weekly_digest` ships dark and is the worked example.
No app store is involved: the surface is web.

### 12. Backup continuity: a backup HOM receives a sufficient scoped BriefSnapshot

Stranger mode (0039) plus `visit_brief_snapshot` (0045), where the
stranger projection is persisted as DISTINCT evidence from the ordinary
one, so what a backup was shown is reconstructable. The training
household seeds a `backup_hm` stranger case.

### 13. Quiet hours, the suppression half

`clampOutOfQuietHours` is applied at draft time in the engine and in the
registry sweep, so a prompt cannot be scheduled into quiet hours. The
override half is UNCOVERED and appears below.

---

## UNCOVERED (13)

### Not yet applicable, because the surface does not exist (6)

Listed rather than ticked, because each is true today for a reason that
expires.

- **Vendor and professional projection: only PurposePack-scoped data
  renders.** No vendor surface. TrustCredential is ABSENT by decision
  (RFC-PRIM-01 §9) and WK-DEV-010 keeps vendor links
  internal-simulation-only until a pen test covers them.
- **AI containment: prompt injection, cross-household exfiltration,
  permission elevation, unauthorized action.** No AI exists. The shadow
  engine is deterministic trigger rules, which is not this risk.
- **Physical access: a digital grant cannot imply home-entry authority.**
  No physical-access concept and no vendors.
- **Training drift: a workflow version change marks affected training
  changed-since-training.** TrainingState is stubbed by name in the seed
  header and not built.
- **Temporary versus stable: Runway or Zone temporary state cannot
  masquerade as a durable Household Record fact.** Neither concept
  exists. The nearest built analogue is `task_definition`'s provisional
  flag, which IS structurally enforced by CHECK, and is the pattern to
  copy when Runway and Zone arrive.
- **No diagnosis gate.** Adopted as an invariant today and violated by
  nothing, because no accommodation flags exist. Same vacuous-satisfaction
  shape as risk 6.

### Uncovered and applicable now (7)

- **Accessibility: keyboard, screen reader, zoom and reflow, errors,
  focus, reduced motion.** Nothing. No axe, no a11y assertions, no
  keyboard-path test anywhere in the e2e suite, verified by search. This
  is the largest single gap on the list and the only one with no partial
  credit at all.
- **AI confirmation: no path batch-confirms multiple AI-created facts.**
  Adopted as prose in CLAUDE.md today; no check. Recorded with the trap:
  a naive test looking for a batch-confirm gesture WOULD find
  `confirmRemainingAsExpected` and either fail wrongly or be allowlisted
  into accepting it. That gesture is legitimate because it covers the
  HOM's own planned work.
- **Decision staleness: changed basis versions supersede a decision
  before execution.** `decision_record` (0043) carries no reference to
  the version of its basis; confirmed by reading the table. Nothing can
  detect a superseded basis, so nothing does.
- **Quiet hours, the override half:** urgent override requires a reason.
  Nothing overrides, because the firewall's v1 policy routes nothing to
  `immediate_interrupt`. The vocabulary exists; the path does not.
- **Waiting: external wait resurfaces on timeout and cannot disappear
  because the sending action completed.** Half-covered by example: the
  deferral and paused-decision revisit mechanism plus the attention sweep
  resurface internal waits on timing. The second clause is the G-88
  shape and has no mechanism.
- **False closure: provider complete does not close an unresolved
  outcome.** The PRINCIPLE is proven in one place (resolving a situation
  closes the grouping, never the noticing) and enforced in another
  (`work_requirement` verify only ever checks completed work). The
  provider case does not exist.
- **Low-capacity context: interrupted, one-handed or low-attention use.**
  Partly covered: the close flow survives a reload and resumes, proven in
  the airplane spec, which is the interrupted case and the
  repeated-entry case. **Hidden state is uncovered and there is a live
  instance**: G-86's due-today bucket renders no date, so eight prompts
  spanning five weeks all read as today.

### Covered by example rather than by census (1)

- **Tenant isolation: cross-household read and write must fail.** Real
  coverage: the page-layer journey, the contextual-entry journey's
  cross-tenant refusal, and composite `(household_id, id)` foreign keys
  on `situation`, `visit_photo` and `capture_artifact` that make
  cross-tenant reference UNREPRESENTABLE rather than merely checked.
  What is missing is a CENSUS: nothing derives the set of
  household-scoped queries and asserts each filters. A new read that
  forgot its household filter would be caught by nobody. Listed here
  rather than under COVERED because the spec's phrasing ("and key
  queries") asks for the systematic version.

---

## What this review changes

Nothing is built. Three things are now known that were not:

1. **Accessibility is the one total gap** and needs a decision about
   scope before it needs a test.
2. **Six risks pass for the wrong reason**, and in four of them the thing
   that appears to cover the risk is a guard or journey that this
   repository is otherwise right to trust. That is the failure mode the
   exercise existed to find.
3. **Two risks are vacuously satisfied and will silently stop being so.**
   Those are the ones to re-check on a calendar rather than on a change,
   because no change to the repository will trigger them.
