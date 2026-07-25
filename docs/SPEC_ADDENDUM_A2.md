# Addendum A2: anticipation feedback, repeat-season memory, exclusions

Prepared 25 July 2026. Scope: REQ-054 (existing, not built), plus REQ-055 and
REQ-056 (new). Written to the conventions the repo already enforces: DEV-004 S2
snake_case singular table names, DEV-005 no em dashes, nothing hard-deletes,
server-side enforcement over interface convention.

## Why this addendum exists

The engine fires and nothing tells it whether it was right. There is no record
of whether a prompt was acted on, so there is no act rate per rule, no evidence
for the retirement path that /oversight/triggers already exposes, and no signal
when a rule starts producing noise. The failure mode of an anticipation system
is not silence. It is firing slightly too often until the briefing becomes
wallpaper, which happens quietly and is not recoverable after the fact.

At pilot scale every prompt outcome can be read by hand. At 108 households it
cannot. The feedback loop is cheap to build now and expensive to retrofit onto
rules that have already ossified.

## SPEC_AUDIT table rows

| REQ | P | Status |
|---|---|---|
| 054 repeat-season memory | P1 | not built; specified in A2 |
| 055 prompt outcome capture and rule health | P1 | not built; specified in A2 |
| 056 anticipation exclusion list | P1 | not built; specified in A2. Dependency of 054 |

---

## Part 1. REQ-055, prompt outcome capture

### Table: `prompt_outcome`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| household_id | uuid not null | fk household |
| prompt_id | uuid not null | the scheduled prompt instance |
| rule_id | uuid not null | denormalised so rule health reads without a join |
| provision_ref | text null | methodRef the prompt carried, if any |
| user_id | uuid not null | who answered |
| role | text not null | role at answer time, not current role |
| outcome | prompt_outcome_kind not null | enum below |
| fired_at | timestamptz not null | when the prompt surfaced |
| answered_at | timestamptz not null | |
| target_date | date null | the prompt's own target, null for event-driven prompts |
| lead_days | integer null | answered_at to target_date; null where target_date is null |
| note | text null | optional free text, sensitivity s2 |
| created_at | timestamptz not null default now() | |

Constraints: `unique (prompt_id, user_id)`. Append-only, no update path, no
delete path. Indexes on `(rule_id, answered_at)` and `(household_id, answered_at)`.

### Enum: `prompt_outcome_kind`

`acted` · `dismissed` · `not_applicable` · `already_done`

Four values, not three. `already_done` and `not_applicable` look similar in the
interface and imply opposite corrections. Already done means the rule was right
and late, so the lead time is wrong. Not applicable means the rule was wrong for
this household, so it belongs in an exclusion. Collapsing them loses the signal
that makes the rest of this useful.

### Write path

Answered at the close of the briefing and at the close of visit. Answering must
never gate submission. An unanswered prompt is data: it means the prompt was
seen and ignored, which is the strongest noise signal available and is worth
more than most dismissals.

### Derived read: rule health

Surfaced in /oversight/triggers beside the existing enable and disable controls.
Trailing 90 days.

| Field | Source |
|---|---|
| fired_count | the prompt table, NOT prompt_outcome |
| answered_count | prompt_outcome |
| act_rate | acted / answered_count |
| ignore_rate | (fired_count - answered_count) / fired_count |
| not_applicable_rate | not_applicable / answered_count |
| already_done_rate | already_done / answered_count |
| median_lead_days | median of lead_days where outcome = acted and lead_days is not null |
| distinct_households | count |
| distinct_users | count |

Retirement candidate flag fires only when act_rate is below the founder-set
floor AND distinct_households >= 3 AND distinct_users >= 2. Both guards are
required. A fleet rule must not be retired on the evidence of one household or
one House Manager having a bad month.

### Lead-time calibration

`median_lead_days` is the whole point of carrying `target_date`. A rule firing
at T-14 whose median action lands at T-4 has been sitting in the way for ten
days. Calibration is a founder decision informed by the number, not an automatic
adjustment. Rules are policy.

---

## Part 2. REQ-054, repeat-season memory

### What it is, and what it is not

It is recall, not a new rule family. It reports what this household did at this
point last year. It does not assert that anything should happen, it does not
create prompts, and it does not need per-item founder approval, because it is
reporting fact rather than proposing policy.

That distinction is what keeps it inside the governance model. Cross-household
inference would be policy and is explicitly out of A2 scope.

### Table: `season_observation`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| household_id | uuid not null | |
| observed_at | timestamptz not null | when the underlying event happened |
| season_month | smallint not null | 1 to 12, the matching granularity |
| season_week | smallint null | 1 to 53, for anchors that need tighter matching |
| anchor_kind | text not null | registry_entry, field, visit, dot, gesture |
| anchor_id | uuid not null | |
| summary | text not null | one line, human readable, sensitivity s2, DEV-005 applies |
| field_ref | text null | the Playbook field if the observation maps to one |
| provision_ref | text null | |
| recurrence | text not null | annual, seasonal, none |
| confidence | text not null | observed or inferred |
| source_event_id | uuid null | the audit_event that produced it |
| superseded_by | uuid null | versioned, never hard-deleted |
| created_at | timestamptz not null default now() | |

Match on `season_month` by default. `season_week` is available where an anchor
needs it, but month matching is more forgiving and misses less.

### Derivation

An extension of the existing daily registry sweep, not a second sweep. On day D,
select observations for the household where `season_month` equals the current
month and `observed_at` is at least 300 days old, ordered by relevance.

### Surface

A distinct briefing section titled from the household's own language, sitting
after the radar and before dots. It carries recall lines only. Each line is
attributable: it names the anchor it came from so a House Manager can see why it
appeared.

### Guardrails

- Recall is filtered through `anticipation_exclusion` before rendering. A recall
  naming an excluded topic or person does not surface.
- Recall never overrides a floor. Where a recall line and a floor conflict, the
  floor wins and the line is suppressed with a corporate-visible log entry, the
  same disposition STD-022.3.3 received.
- Recall is s2. It must not enter the client payload. Extend the existing
  payload guard to assert `season_observation` rows never serialise into
  client-facing routes.

### Known limitation, stated plainly

Repeat-season memory produces nothing until a household has twelve months of
history. Built during the 2027 pilot, it stays dark until 2028. That is not a
defect and the briefing should say so, or the first House Manager will report it
as broken. It is also the argument for building it in the pilot year: the
feature has to exist before the data it needs starts accumulating.

---

## Part 3. REQ-056, anticipation exclusion list

A dependency of REQ-054, not an optional extra. The system records what to do
and has no way to record what not to do. The worst failure of an anticipation
engine is not silence, it is an insensitive prompt at the wrong moment, and
recall makes that failure more likely by surfacing older material.

### Table: `anticipation_exclusion`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| household_id | uuid not null | |
| scope | text not null | rule, topic, person, field, all |
| target | text not null | rule_id, topic tag, person reference, field ref |
| reason | text null | sensitivity s2 |
| requested_by | text not null | client, house_manager, corporate |
| approved_by | uuid not null | corporate only, always |
| effective_from | timestamptz not null | |
| effective_to | timestamptz null | null means indefinite |
| created_at | timestamptz not null default now() | |

### Enforcement

Server-side, inside the prompt scheduler, before anything is written to the
prompt queue. Fail closed: if the exclusion check errors, suppress the prompt.

**Exclusions never suppress a floor.** Safety floors bypass the exclusion check
entirely. This needs an assertion in the security probe, not a comment in the
code, or someone will eventually exclude their way into a hazard.

---

## Findings, doc versus reality

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | `audit_event.household_id` is NOT NULL, so a fleet-scoped rule retirement has no natural audit home. Same structural issue A1 finding 6 raised | Log enable and disable against the household of record where one exists; otherwise use an append-only pattern like `provision_version`. QA to decide whether audit_event grows a corporate scope |
| 2 | The briefing interface naturally suggests three outcome values; the schema specifies four | Keep four. `already_done` and `not_applicable` imply opposite corrections and collapsing them destroys the calibration signal |
| 3 | Unanswered prompts are the strongest noise signal and are not rows in `prompt_outcome` | Rule health must read `fired_count` from the prompt table. Reading it from outcomes would make an ignored rule look clean |
| 4 | The retirement threshold is policy, not engineering | Founder sets the act-rate floor and the minimum household and user counts. Ship as configuration, not as constants |
| 5 | Repeat-season memory returns nothing for twelve months after a household is onboarded | Accepted. State it in the briefing section so it is not reported as a defect |
| 6 | Recall is fact, so it needs no per-item approval; cross-household inference would be policy | A2 scope is single-household recall only. Fleet inference deferred and out of scope |
| 7 | An exclusion could be used to suppress a safety floor | Floors bypass the exclusion check. Assert in the security probe alongside the existing 67 |
| 8 | `lead_days` requires `target_date`, which is null for event-driven prompts | Nullable. Rule health reports median lead only where present, and states the sample size |
| 9 | `season_observation.summary` is generated text | DEV-005 applies. No em dashes in generated summaries |
| 10 | `prompt_outcome.note` and `season_observation.summary` can carry household detail | Both are s2. Extend the payload guard to assert neither table serialises into client routes, in the same pattern as `assertNoProvisionRows` |
| 11 | Growth: roughly one `season_observation` row per meaningful event per household per year | Small. No partitioning required before 2032 |
| 12 | Rule health is a fleet read; the corporate console is currently pilot-scale | Ships inside /oversight/triggers as it stands. Revisit with REQ-075 |

## What is founder policy and what is engineering

Founder: the act-rate floor and retirement thresholds, whether a calibrated lead
time is adopted, any exclusion approval, and whether a recall line is appropriate
to surface at all.

Engineering: the schemas above, the enforcement points, the guards, and the
probe assertions.

The engine should get better under control rather than drift. Nothing in A2
changes a rule automatically. It produces evidence, and the evidence goes to a
person.
