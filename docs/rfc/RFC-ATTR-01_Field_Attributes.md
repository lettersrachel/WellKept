---
status: living
---
# RFC-ATTR-01: field attributes, defined once

28 August 2026. The coordinated field-attribute schema RFC required by
Implementation Handoff Gate 2, item 2, written against the schema that exists.

**It serves two callers.** Gate 2 item 2 asks for provenance and knowing
state, source versus derived, derivation expression, confidence, materiality,
consequence class, lifecycle and staleness, and judgment-free schema
constraints, "defined once in a schema RFC", to close risk R9, schema
fragmentation. WK-OPS-002 v1.1 names a September schema RFC as its
reconciliation event without saying field attributes. **They are the same
document by circumstance rather than by statement**: there is room for exactly
one field-attribute RFC, it was unwritten, and two documents for one
reconciliation is how a September deliverable becomes two. This is the one.

**Status: proposed defaults, the RFC-PRIM-01 posture.** Under WK-DEV-006
section 8 the founder has 48 hours from delivery to redirect any verdict,
after which they stand. Two items below are marked FOUNDER TAXONOMY and are
not proposed at all, because inventing them here would be the thing this
repository refuses to do.

**Nothing in this RFC is a migration.** No column is added, altered or
dropped by it. Section 6 is the migration ORDER, and each of its steps is its
own session under the one-migration-per-session rule.

---

## 1. Why now, stated as a measurement rather than a worry

R9 is not a risk in this repository. It is a description of what has already
happened, and the number is bigger than the one that has been quoted.

**Survey method**, so the count can be recomputed rather than believed: every
column in `packages/schema/src/tables.ts` whose name matches
`provenance|source|derived|confidence|basis`, read individually, grouped by
the QUESTION it answers rather than by its name.

**Ten distinct mechanisms answer "where did this value come from".**

| Mechanism | Shape |
|---|---|
| `playbook_field.provenance` + `provenance_date` + `provenance_actor` | a real pgEnum: `asked, observed, verified_by_touch, client_written, unconfirmed`. The oldest and the best of them |
| `preference_rule.provenance` | free `text`, three classes by convention, app writes only `explicit` |
| `time_segment.source` + `derived_from` | text vocabulary plus a NOT NULL evidence pointer |
| `registry_entry.derivation_source` + `derived_year` | text, nullable, CHECK conditioned on presence |
| `time_entry.source` | text, `visit_close | manual` |
| `work_item.source` | text, `hm_capture | corporate | system` |
| `event_outbox.provenance` | text, defaulting to `pre_event_law` for legacy rows |
| `season_observation.source_event_id` | a uuid pointing at the `audit_event` that produced it |
| `estimate_snapshot.basis` + `estimated_by` | prose, required |
| `attention_record.source_kind` + `source_id` | a kind string plus a nullable row pointer |

**Four mechanisms answer "how much do we trust it", in three incompatible
types.**

| Mechanism | Type | Scale |
|---|---|---|
| `season_observation.confidence` | text | two values, `observed | inferred` |
| `shadow_log.confidence_pct` | integer | 0 to 100 |
| `preference_rule.confidence` | text | **none. The scale was deliberately left uninvented** |
| `registry_entry.install_confidence` | text | undeclared |

**Plus one convention with no column at all**: NULL means unknown, load-bearing
in `estimate_snapshot.estimated_minutes` and `task_occurrence.actual_minutes`,
where zero is refused three deep precisely so that unknown cannot be recorded
as none.

**Ten and four, not five.** The figure of five has been quoted twice in this
repository's own documents this week, including by the session writing this
one. It was a remembered count sitting next to the thing it counted, which is
the failure the conventions section already names. **State the unit too:**
these are MECHANISMS, not columns. The column count is higher, because six of
the ten mechanisms use two columns each.

**What that costs today, concretely.** A reader asking "is this value observed
or inferred, and how sure are we" must know which table she is in before she
knows which vocabulary answers her, whether the answer is an enum or free text,
whether unknown is NULL or a value, and whether a confidence of `2` means two
percent, the second of five levels, or nothing at all. Nothing in the system
can answer that question generically, so nothing generic can be built on it:
not a staleness sweep, not a "what do we actually know about this household"
surface, not the anticipation engine's evidence rail.

---

## 2. Shape: the eight attributes, defined once

Each attribute below is defined once, with its type, its vocabulary, whether
it is required, and what a database can hold structurally.

### 2.1 Knowing state

**The question:** what IS our epistemic relationship to this value.

**PROPOSED, and it is the existing `provenance` enum promoted rather than
replaced**, because it is already right and already carries production data:

`asked` · `observed` · `verified_by_touch` · `client_written` · `unconfirmed`

**Required, NOT NULL, defaulting to `unconfirmed`.** The default matters: an
unstated knowing state is `unconfirmed`, never `observed`. The safe direction
is the one that claims less.

**Renamed in use, not in the column.** "Provenance" in this system has come to
mean two different things (who wrote a row, and how we know a value), and the
second is what this attribute is. The column keeps its name; the RFC's
vocabulary for talking about it is KNOWING STATE, so that "provenance" can be
reserved for section 2.2.

### 2.2 Source versus derived

**The question:** did a person put this here, or did the system compute it.

**PROPOSED, a two-value column, NOT NULL:** `source` · `derived`.

Two values and not three. The temptation is a third for "system-observed"
and it should be refused: a value the system observed is `derived`, and the
thing that distinguishes it is its derivation expression (2.3), not its
class.

**With one structural rule, which is the point of separating this from 2.1:**

> **A `derived` value carries a derivation expression and an evidence pointer.
> A `source` value carries neither. Whole or absent, both directions, by
> CHECK.**

That is `time_segment`'s existing shape (`derived_from` NOT NULL, a derived
row personless and a refinement row carrying its author, CHECK-enforced in
both directions) generalized. It is the strongest of the ten mechanisms and it
is the one to copy.

### 2.3 Derivation expression

**The question:** by what rule was this derived, so a later reader can
recompute it or contest it.

**PROPOSED: a text expression naming the RULE, plus a typed evidence
pointer.** Not a formula language. Not an executable expression. Prose naming
the rule, of the form `visit interval, arrival to departure` or
`installed_at year, granularity year`, beside a pointer to the row it came
from.

**Explicitly refused: an executable derivation DSL.** It would be the third
system in this repository to invent a small language, it would need its own
evaluator and its own tests, and nothing today needs to recompute a derivation
automatically. If that changes, this is where it goes, and it goes here as an
amendment with a named consumer, not speculatively.

### 2.4 Confidence

**The question:** how much do we trust the value, given its knowing state.

**PROPOSED: `integer` 0 to 100, nullable, and NULL means unknown.** The
integer-percent discipline already exists in `shadow_log.confidence_pct` and
matches the money-in-cents convention: one type, no floats, no rounding
argument.

**Three consequences worth stating because each kills an existing shape:**

- **`observed | inferred` is not confidence; it is knowing state**
  (`season_observation.confidence`). It migrates to 2.1, not here.
- **Confidence is only meaningful on a non-`asked`, non-`verified_by_touch`
  value.** A fact verified by touch does not carry 85. **PROPOSED CHECK:
  confidence is NULL where knowing state is `verified_by_touch` or
  `client_written`.**
- **NULL is the honest unknown and zero is refused**, the `estimate_snapshot`
  rule applied here: zero confidence is a claim, and it is almost never the
  claim anyone means.

**`preference_rule.confidence` gets its scale from this section**, which is
what it was waiting for. The column was shipped deliberately without one.

### 2.5 Materiality

**FOUNDER TAXONOMY. Not proposed here.**

Materiality asks how much it matters if this value is wrong. That is a
judgment about the service, not about data, and every plausible vocabulary
encodes a view about which household facts are important. The
estimate-hierarchy precedent applies: the column arrives with the founder's
words in it, or it does not arrive.

**What IS proposed is its shape:** a text column drawn from a fixed
vocabulary, nullable, with NULL meaning unassessed rather than immaterial.
When the vocabulary lands it becomes a CHECK.

### 2.6 Consequence class

**FOUNDER TAXONOMY. Not proposed here, and this one is load-bearing enough to
say why twice.**

Consequence class asks what happens downstream if this value is wrong: a
missed prompt, a wrong client-facing sentence, a safety failure. **A
consequence vocabulary is a safety taxonomy**, and this repository has already
ruled once that a severity vocabulary is a founder knob rather than an
engineering default (the capture-router decision: no automatic keyword or
severity routing, because the rule set is hers).

Same shape as 2.5: text from a fixed vocabulary, nullable, NULL meaning
unassessed.

### 2.7 Lifecycle and staleness

**The question:** when does this value stop being trustworthy without anyone
touching it.

**PROPOSED, and it is deliberately the smallest thing that works:**

- **`review_by date`**, nullable. A surfacing cue that TAGS and never
  TRIGGERS. This is `preference_rule.review_by` exactly, including its rule,
  and that rule is the important half: a date passing marks a row for a person
  to look at, and never fires an action, creates a prompt, or changes a value.
- **NO `expires_at`, and no automatic invalidation.** A value does not become
  false on a date. The distinction is the same one the deferral and
  paused-decision work already settled: an arrived timing marks a card, a
  person resolves it.

**What is NOT proposed and is named so it is not read as an omission:** a
half-life or decay model. WK-APP-005's knowledge half-life is a real future
thing, it is gated in the work queue, and it belongs on top of this attribute
rather than inside it.

### 2.8 Judgment-free schema constraints

**The question:** which of the above a DATABASE can hold, so the rules survive
a session that has not read this document.

**PROPOSED, the five that are mechanical:**

1. Knowing state NOT NULL, CHECK against the enum. Already true of
   `playbook_field`.
2. Source-versus-derived NOT NULL, CHECK against the two values.
3. **Derived implies derivation expression AND evidence pointer; source
   implies neither. CHECK, both directions.**
4. **Confidence NULL where knowing state is `verified_by_touch` or
   `client_written`; confidence between 1 and 100 where present.** Zero
   refused.
5. Materiality and consequence class CHECK against their vocabularies, added
   when the vocabularies land, not before.

**What a database cannot hold, stated in the same place, because a list of
constraints reads as completeness:** whether the knowing state is TRUE.
Nothing stops a person recording `verified_by_touch` for a value she read off
a form. That is the free-text residue one layer down, and it is the same
residue the copy guard and the payload-shape guard both concede.

---

## 3. Where each existing mechanism migrates

The reconciliation table. **Every row is a proposal**, and the two marked
FOUNDER are held.

### 3.1 The ten provenance-shaped mechanisms

| Existing | Migrates onto | Note |
|---|---|---|
| `playbook_field.provenance/_date/_actor` | **2.1 knowing state**, unchanged | It IS the standard. The enum is promoted, not replaced, and no data moves |
| `preference_rule.provenance` | **2.2 source-vs-derived**, plus 2.1 | Its three classes split: `explicit` is `source` with knowing state `asked` or `client_written`; the other two are `derived` and gain the 2.3 pair they lack today |
| `time_segment.source` + `derived_from` | **2.2 and 2.3**, as the reference implementation | Its CHECK is the model for constraint 3. `derived_from` becomes the evidence pointer with no change of meaning |
| `registry_entry.derivation_source` + `derived_year` | **2.2 and 2.3** | `derived_year` is a derived VALUE, not an attribute; it stays a column and gains the attributes beside it |
| `time_entry.source` | **2.2** | `visit_close` is `derived`, `manual` is `source`. A clean two-value mapping |
| `work_item.source` | **stays as it is. NOT an attribute** | `hm_capture / corporate / system` names WHO raised the item, which is authorship, not epistemics. Named here so a future pass does not migrate it by name-matching |
| `event_outbox.provenance` | **stays as it is. NOT an attribute** | The s4 envelope's provenance names the emitting SITE. Same word, different question. Renaming it is not worth a migration on an append-only table |
| `season_observation.source_event_id` | **2.3 evidence pointer** | Already exactly that, and typed better than most: a uuid, not a string |
| `estimate_snapshot.basis` + `estimated_by` | **2.3 derivation expression** | `basis` is already prose naming the rule, which is what 2.3 asks for. `estimated_by` is write provenance and stays |
| `attention_record.source_kind` + `source_id` | **2.3 evidence pointer** | The kind plus row pointer is the shape 2.3 wants; it needs no change beyond being named as one |

**Two of ten do not migrate**, and that is a finding rather than tidiness:
`work_item.source` and `event_outbox.provenance` use the vocabulary of this RFC
for a different question. **Name-matching would have migrated both**, which is
the specific way a reconciliation makes things worse.

### 3.2 The four confidence mechanisms and the one convention

| Existing | Migrates onto | Note |
|---|---|---|
| `season_observation.confidence` (`observed | inferred`) | **2.1 knowing state**, NOT 2.4 | It is the clearest instance of the confusion this RFC exists to end: a knowing state stored in a column called confidence |
| `shadow_log.confidence_pct` (int 0..100) | **2.4**, unchanged | It is the proposed standard already |
| `preference_rule.confidence` (text, no scale) | **2.4**, gaining the scale it was shipped without | Deliberately left open in 0057 for this document |
| `registry_entry.install_confidence` (text) | **2.4** | Needs a value mapping, since its current strings are undeclared. **The 22 unassessed rows stay NULL**: the G-66 refused-backfill rule holds, and inventing a confidence for a row nobody looked at is exactly the claim it forbids |
| NULL-is-unknown on minutes columns | **stays a convention** | It is a rule about a VALUE column, not an attribute. 2.4 adopts the same posture, which is why they read alike |

---

## 4. Producer, per column

Required by the G-85 rule, stated here because this RFC will become
migrations.

**Every attribute column proposed above has NO PRODUCER YET except where an
existing column is being kept.** The attributes are written by whatever
surface writes the value they describe, which means each migration in section
6 lands with its writing surface in the same session or it does not land.

**This is the rule that makes this RFC safe to implement incrementally**, and
it is the one 0058 broke: ten columns, four CHECK constraints, a
granularity-aware render, and nothing writing any of it.

---

## 5. What this RFC does not do

- **It does not add an attributes table.** A side table keyed by
  `(table, row, column)` would be generic and would make every read a join and
  every constraint impossible. The attributes live beside the values they
  describe, as columns, which is why constraint 3 can be a CHECK at all.
- **It does not retrofit every existing column.** Section 6 orders the ones
  that have a consumer. A column nothing reads gets its attributes when
  something reads it.
- **It does not define materiality or consequence class**, which are 2.5 and
  2.6 and are the founder's.
- **It does not touch the client projection.** Attributes are staff-side
  metadata; a knowing state or a confidence reaching a member is a separate
  decision nobody has made.

---

## 6. Order, if adopted

Each step is one migration and one session. The order is by consumer, not by
tidiness: nothing moves until something reads it.

1. **The vocabulary module and the guard.** No migration. A single source for
   the two proposed vocabularies plus a test asserting every attribute column
   in the schema resolves against them, computed from the schema with a count
   floor. This is the step that stops an eleventh mechanism appearing while
   the rest is in progress, and it is the only one with real urgency.
2. **`season_observation.confidence` to knowing state.** The smallest real
   migration, one column, a clean value map, and it proves the pattern.
3. **`preference_rule.confidence` gains the 2.4 scale**, and its provenance
   splits per 3.1. Its writer already exists.
4. **`registry_entry.install_confidence` to 2.4**, NULLs preserved.
5. **New attribute columns on the next primitive that needs them**, which is
   the first Gate 2 estimator object, and never as a speculative batch.

**Step 1 is worth doing even if every other step is deferred.** Ten mechanisms
became ten because nothing was watching; the guard is what makes the number
stop growing while the founder decides about 2.5 and 2.6.

---

## 7. The two questions this RFC needs answered

1. **Materiality (2.5) and consequence class (2.6): the vocabularies.** Held,
   not proposed. Everything else can proceed without them.
2. **Whether WK-OPS-002 v1.1's September schema RFC is this document.** Written
   here as if it is, on the founder's reading that they are the same by
   circumstance. If A213 or the v1.1 text names something else, this RFC still
   stands as Gate 2 item 2 and that other document is a separate thing, which
   would be worth knowing before September rather than after.

---

## Amendment 1 · 4 September 2026, applying the founder rulings of 3 September (Ruling 2, PR #282)

Source of authority: `docs/FOUNDER_RULINGS_2026-09-03_PR282_Q0b.md`,
frozen, Ruling 2. RFC-001 (the build package's substrate RFC) is
withdrawn as a document; its frozen copy is
`docs/intake/2026-09-03-build-package/RFC-001_Schema_Substrate.md`. This
RFC survives as the substrate RFC because it has migrations and
production data behind it. What RFC-001 carried that the sixty-two
migrations do not already provide is absorbed here, per the Q-0 drift
list, and nowhere else.

### A1.1 The two held vocabularies are SIGNED OFF

Sections 2.5 and 2.6 held their vocabularies for the founder. The
3 September review is the signature, verbatim:

- **Materiality (2.5):** `safety_access`, `money_legal`, `convenience`.
  Hard-stop classes map only to the first two. The 2.5 shape stands
  (text from the fixed vocabulary, nullable, NULL meaning unassessed;
  a CHECK when the column lands).
- **Consequence class (2.6):** `editorial`, `behavioral`,
  `high_consequence`, the same three the training doctrine uses for
  change propagation (WK-TRN-009 loop), so one enum serves the
  household record and the HOM development layer. Same shape as 2.5.

Section 7 question 1 is thereby CLOSED. Promoting the two vocabularies
out of "deliberately unexported" in `packages/schema/src/field-attributes.ts`
is a code change and is a queue item, not part of this documents-only
amendment.

### A1.2 The knowing-state mapping (RFC-001's five onto the 2.1 promoted list)

The knowing-state vocabulary IS the 2.1 promoted list:
`asked` · `observed` · `verified_by_touch` · `client_written` ·
`unconfirmed`. RFC-001's five map onto it as follows. Two RFC-001 rules
are preserved in the mapping and bind every row of it: **no state may
record a system inference as fact, and there is no `assumed`.**

| RFC-001 state | Maps to | Why |
|---|---|---|
| `confirmed` (by the household) | `asked` or `client_written` | The promoted list already splits household confirmation by HOW it arrived: told to a person, or written by the member. The split carries more information; collapsing it would lose the distinction 2.1 keeps. |
| `observed` (by the HOM) | `observed` | Identical. |
| `expected` (system-inferred) | never recorded as a knowing state | An inference is offered, never recorded as fact (RFC-001's own rule, preserved). A system inference lives as a SUGGESTION (the shadow/attention rail) until an authorized human confirms it individually, at which point the row carries the real state that confirmation produced (`asked`, `observed`, ...). Recording `expected` on a field would be recording the inference as a fact about the field, which both documents refuse. |
| `estimated` (lookup or derivation) | the 2.2 `derived` class, knowing state `unconfirmed` | Estimation is a statement about HOW the value was produced (2.2/2.3, with its expression beside it), not a sixth epistemic relationship. The knowing state stays `unconfirmed` until a person confirms; 2.4 confidence carries the strength. |
| `unknown` | `unconfirmed` | 2.1's default already claims the least. |

There is no `assumed` in either vocabulary and none is added.

### A1.3 The RFC-001 consumers and attributes, dispositioned against the drift list

Ruling 2 §4: added here only where the sixty-two migrations do not
already provide them. Reconciliation objects are CONSUMERS of the
outbox, never field attributes. Each "absent" lands as its own queue
item with a single migration, one per session, under the guards
manifest; the queue items are in the re-cut `docs/BUILD_QUEUE.md`.

| Item | Disposition |
|---|---|
| Domain-event catalog with correlation and causation ids | **Partly provided by migration 0046**, remainder **LANDED at Q-3b, migration 0063** (4 September 2026): `causation_id` with the composite same-household self-FK, and the eleven RFC-001 §3a families verbatim in `packages/schema/src/event-catalog.ts` as a forward namespace (the live s4 kinds stay deliberately outside it). This row is CLOSED. |
| `expected_event` with `reconciliation_status` (`matched`, `missing_expected`, `unexpected`, `changed`, `conflicting`, `stale`, `cannot_determine`) and `candidate_decision_refs[]` | **Absent; new migration required.** Nothing in the tree holds an expectation pattern or a reconciliation status. The six launch patterns come from the intake BENCHMARK_ADOPTION §2. |
| `changeset` with safe-automatic and review-required sets | **Absent; new migration required.** The nearest existing mechanism (the outbox itself) records what happened, not what a source change invalidates. |
| `fallback_plan` (`preferred`, `approved_substitute`, `established_backup`, `vetted_bench`, `ask`) | **Absent; new migration required.** `preference_rule` (0057) is adjacent (household operating facts in words) and is NOT this: the five-value vocabulary on repetitive operational choices is structured and evaluated, not prose. The build extends beside 0057 rather than overloading it. |
| `capture_artifact` states (`captured`, `processing`, `proposed`, `confirmed`, `routed`, `failed`, `needs_review`) | **Partly provided by migration 0044** (`capture_artifact` exists with kind, extraction status `none`/`pending`/`extracted`, and status `captured`/`filed`/`dismissed`, filing whole-or-absent). Remaining: the pipeline states, source identity and authority class, and the quarantine result; the mapping of `filed`/`dismissed` onto `routed`/`needs_review` is that session's stated design question, not silently renamed. One migration. |
| `validity_class` (`stable`, `review_periodic`, `life_stage_bounded`, `seasonal`, `event_specific`, `temporary`, `reuse_requires_review`, `superseded`) | **Absent; new migration required.** Joins this RFC as attribute 2.7's vocabulary (2.7 named lifecycle and staleness and held the vocabulary open; RFC-001's eight values fill it and are adopted with the ruling). |
| `ownership_trace` (`conceive`, `plan`, `execute`, a set on registry items and commitments) | **Absent; new migration required.** Feeds M-27; the measurable definition of load transferred. |
| `latest_safe_start` (derived date) | **Absent; new migration required. Shape RULED, Part C §2.4 (4 September 2026):** a materialized value stamped with its derivation, recomputed by the worker on outbox events, read-only to every actor, never hand-edited, with a corporate-admin recompute action that logs. The repository holds two derived-value precedents (stored-with-stamp: `registry_entry.derived_year` beside `derivation_source`; computed-never-stored: flag promotion, `time_segment` duration); the ruled shape matches the stored-with-stamp precedent, so precedent and ruling agree and the open question this row previously carried is CLOSED. Lands at Q-12 as that session's single migration. |
| `dueness` (`not_due`, `approaching`, `due`, `overdue`, `condition_triggered`, `unknown`) | **Absent; new migration required, GATED**: ships only after the close flow captures the condition inputs (intake BENCHMARK_ADOPTION §3). Until then recurring work runs on doc-cited intervals with a `launch-calibrated` comment. |

### A1.4 The judgment-free guard extension (Ruling 2 §5)

The CI pattern list is extended, where not already present in the guard
set, to: ranking constructs over HOMs; stress, emotion and health
inference; and inference from social content into household truth or
authority. What already stands: Ruling 1 bars per-person analytics and
ranking, the section 29 adoption bars sensitive inference from
household demographics, and `capacity-utilization` refuses by role in
code; but NO schema-introspecting guard enforces any of it today. The
guard is a code change and therefore a queue item (single session, no
migration), not part of this amendment.

### A1.5 What this amendment does not do

No column, table, enum or guard changes in this amendment; it is the
paper that authorizes them, each as its own queue item and migration.
Section 7 question 2 (whether WK-OPS-002 v1.1's September RFC is this
document) remains open and is unaffected.
