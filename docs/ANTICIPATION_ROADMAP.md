---
status: living
---
# Anticipation engine: what has to change

Prepared 25 July 2026. Design spec, not a build order. The build handover
lives in [ANTICIPATION_SESSIONS.md](ANTICIPATION_SESSIONS.md) — one gated
session brief per item; paste one section into Claude Code, never the file.

> **Do not build any of this yet.** Migrations 0014 to 0017 have not met the
> live database. Nothing below is worth starting before the deploy session
> completes, and most of it is worth starting only at a specific pilot
> milestone named in the sequencing section at the end. Two items are the
> exception, and the reason they are exceptions is timing rather than
> importance: they change what gets recorded, so they have to exist before
> data starts accumulating or the pilot's evidence is worth less than it
> looks.

Six items, keyed to the six gaps. Table names follow existing convention;
column names are suggestions. Migration numbers assume 0017 lands first.

> **Numbering correction (2026-07-26, per
> [CORPORATE_CAPTURE_SESSIONS.md](CORPORATE_CAPTURE_SESSIONS.md)):** the
> specific migration numbers below (0018–0023) are void. Migration numbers
> are allocated at build time, not reserved in advance — the next migration
> written takes the next number, whichever document's session builds first.
> Read the numbers below as item labels only.

---

## A. Separate "you told me something" from "I already knew"

**The problem.** Act rate collapses four outcomes into one number, and a rule
that reminds people to do what they were already going to do scores as well as
a rule that catches something. Retirement decisions are currently made on a
metric that cannot see the difference.

**Schema.** `prompt_outcome` gains two columns:

- `was_news boolean null` set only when the outcome is acted
- `dismiss_reason text null` constrained to `not_applicable`, `wrong`,
  `bad_timing`, `already_done`

**Capture.** The existing acted/dismissed control becomes two taps rather than
one. On acted: "Good catch" or "Already on it." On dismissed: the four
reasons. Nothing free-text, because free text will not be filled in from a
driveway.

**The consequential change.** Add `informative_rate` to rule health, defined
as acted-and-news over fired, and make it the retirement metric. Act rate
stays as a display number; it stops being the thing that retires rules. Extend
the `rule_health` app_setting knob:

    {"actRateFloor":0.25,"informativeRateFloor":0.15,
     "minHouseholds":3,"minUsers":2}

**Migration 0018.** Small. Two columns, one derived metric, one UI control.

---

## B. Link incidents back to the engine

**The problem.** Act rate can only evaluate prompts that fired. The prompt that
should have fired and did not is invisible, and it is the failure that loses
clients. The incident register is the only place a miss becomes observable,
and today the two subsystems do not touch.

**Schema.** `incident_report` gains three columns, populated at resolution
rather than creation, because at creation nobody knows yet:

- `preventable_by_prompt` constrained to `fired_and_ignored`, `fired_too_late`,
  `no_prompt_existed`, `not_preventable`, `unclear`
- `related_rule_id` nullable FK to the rule library
- `related_prompt_id` nullable FK to the fired prompt, where one exists

**Surface.** A Misses panel beside `/oversight/triggers`, listing incidents
marked `no_prompt_existed` grouped by what the incident was about. That list is
the rule library's backlog, and it is the only false-negative stream the
business will ever get.

**Do not automate the judgment.** Whoever resolves the incident answers the
question. An inferred link would manufacture a metric out of a guess.

**Migration 0019.** Three columns, one resolution-form field, one read-only
panel.

---

## C. Budget the whole briefing, not each rule

**The problem.** Rule health retires rules individually. Fatigue is caused by
the total. Thirty rules each firing at a healthy rate produce an unreadable
briefing and every one of them passes its own test, so the wallpaper failure
arrives with every indicator green.

**Schema and settings.** New app_setting knob:

    {"perBriefing":7,"floorsExempt":true}

Rules need a rank for truncation. If the library has no priority concept, add
`priority smallint` defaulting to a middle value; safety floors sort above
everything and are exempt from the budget entirely.

**The subtlety that matters.** A prompt that was generated but truncated must
be recorded as `suppressed_by_budget` and must not enter the act-rate
denominator. Counting unshown prompts as unacted would let the budget quietly
destroy the health metrics of the rules it truncates, which would then retire
them for being crowded out rather than for being wrong.

**Metric.** Average prompts per briefing over a trailing thirty days, on the
`/oversight/triggers` header. If that number drifts up while act rate holds
flat, the engine is degrading in a way per-rule health will never report.

**Migration 0020.** One column, one setting, one suppression state, one
number on a page.

---

## D. Give record fields an age, and let rules react to it

**The problem.** A field captured at intake eighteen months ago fires with the
same confidence as one confirmed last week. Household operations change
constantly, so the engine will eventually assert a stale fact to a client with
total confidence. That is worse than saying nothing, because it demonstrates
the record is not current, which is the premise the whole service rests on.

**Schema.** A `field_confirmation` table rather than 258 columns (258 is a
retired figure per WK-PLAY-001, corrected 1 August 2026; the authored count
is 218 fields across 25 section slots, 0 to 24. The point below, one row per
field rather than a wide table, is unaffected by the correction):

    household_id, field_key, confirmed_at, confirmed_by, source

where source is one of `intake`, `visit`, `client_edit`, `staff_edit`,
`seeded`. Write a row whenever a field is touched or explicitly confirmed.

Rules gain `max_input_age_days smallint null`. When a rule's input field is
older than that, the rule does one of two things depending on a new
`stale_behavior` column: suppress, or convert into a confirmation prompt.

**New prompt kind.** `confirmation`, rendering as a question rather than an
instruction. "Is Acme still your HVAC vendor?" The answer writes a
`field_confirmation` row, which means the engine repairs its own inputs as a
side effect of running. This is the part that compounds.

**Safety floors.** Never suppressed by staleness. They fire and carry a
staleness note, because a stale safety input is a reason to check, not a
reason to go quiet.

**Migration 0021.** The largest of the six. New table, two rule columns, a new
prompt kind, and a per-household staleness view.

---

## E. Let the engine see outside the record

**The problem.** The engine knows only what is in the record. Several of the
highest-value anticipations in household operations are triggered by things a
record cannot contain.

**Schema.** An `external_signal` table:

    source, signal_kind, payload jsonb, effective_from, effective_to,
    geography, fetched_at

Rules gain an optional `signal_kind` predicate so a rule can require both a
record condition and a live signal.

**Start with weather and nothing else.** The National Weather Service alerts
API is free, needs no key, and is queried by zone, so no household data leaves
the system. A freeze warning crossed with the record's outdoor spigot and
irrigation fields probably outperforms a meaningful share of the seeded
library on its own. Prove the pattern on one source before adding a second.

**Two cheap follow-ons once the pattern works.** CPSC recall data crossed with
the appliance registry. And warranty expiry, which is not external at all, just
a date already in the registry that nothing currently watches.

**Related, and independent of signals.** Repeat-season recall assumes an annual
cycle. Much of home operations runs on intervals or conditions instead. Give
reminders a `cycle_kind` of `annual`, `interval` or `conditional`, with
`interval_days` for the middle case. Without this, anything on a four-month
cycle is either invisible to recall or wrong three times a year.

**Migration 0022.** One table, one rule predicate, one worker job, two
reminder columns.

---

## F. Make a new household's first month less thin

**The problem.** Repeat-season memory produces nothing for twelve months, so
anticipation quality tracks tenure. The households deciding in month three
whether this is worth the money get the most generic version of the thing they
are paying for.

**Two mechanisms, and the second matters more.**

*Archetype seeding.* A `record_archetype` table keyed on house attributes
(decade built, heating type, roof material, lot characteristics) carrying
likely fields and their typical cycles. On household creation, seed matching
fields with `source='seeded'` in `field_confirmation`.

*The provenance rule that makes this safe.* A seeded field is a hypothesis, not
a fact. It must never be shown to a client as part of their record, and rules
reading a seeded field should produce confirmation prompts rather than
instructions until the field is confirmed by a human. This is why D comes
before F: without field-level provenance, archetype seeding pollutes the record
with plausible fiction and the engine loses the one property it is selling.

*Intake depth.* The other half of the cold-start answer is not software. A
richer intake substitutes knowledge for history, which is the same conclusion
the intake gap reaches from the other direction.

**Also worth adding here.** An intake completeness score per household, so the
engine knows how much it does not know and can be quieter on a thin record
rather than confidently wrong.

**Migration 0023.** New table, a seeding step on household creation, a
completeness score.

---

## Schema summary

| Item | Migration | Size | Prerequisite |
|---|---|---|---|
| A. News vs known | 0018 | small | none |
| B. Incident back-link | 0019 | small | none |
| C. Briefing budget | 0020 | small | A, for a clean denominator |
| D. Field age and confirmation | 0021 | large | none |
| E. External signals | 0022 | medium | none |
| F. Cold start | 0023 | medium | D, for provenance |

---

## Sequencing against the pilot, not against the calendar

**Before the first household, and only after the deploy session is clean:**
A and B. Both change what gets recorded rather than what gets shown. Built
later, they cannot recover the pilot months that ran without them, and the
pilot's whole output is evidence.

**Also fine before the pilot, because it is independent:** the weather half of
E. It touches no household data and it will teach you more about whether
signal-driven rules earn their place than any amount of design will.

**After roughly three households, or the first time a briefing feels long:** C.
Building a budget before there is enough volume to observe fatigue means
guessing the number, and the number is the whole feature.

**Once intake exists as a real process:** D, then F. D is the largest item here
and it is worth doing properly rather than early, and F is unsafe without it.

**Never, without evidence:** any expansion of the rule library itself. The
library grows from the Misses panel in B and from SPEC CANDIDATE entries in the
friction log. New rules invented at a desk are how the library gets to thirty
rules that each pass their own health check.

---

## What this deliberately does not address

Anticipation is invisible when it works, because the client never experiences
the problem that did not happen. Making averted problems legible in the client
view without manufacturing anxiety is a product and copy problem, not a schema
one, and it should be designed against a real client's reaction rather than in
advance of one.

Promising anticipation also creates an implied duty that a reactive service
does not carry. That is a conversation for whoever writes the insurance, and it
belongs in the same engagement as the other open questions rather than in a
migration.

---

## Repo addendum (2026-07-25 — verification against shipped code; NOTHING built, per this document's own header)

Two reconciliations for whoever builds this, so the migrations extend rather
than duplicate:

1. **Item A vs the existing `prompt_outcome_kind` enum.** The shipped enum
   (A2 finding 2) already carries `not_applicable` and `already_done` as
   first-class OUTCOMES — half of A's proposed `dismiss_reason` taxonomy
   exists at the outcome level. A's true delta is: `was_news` on acted,
   the two genuinely new dismiss reasons (`wrong`, `bad_timing`), and
   `informative_rate` as the retirement metric. Migration 0018 should
   reconcile the two taxonomies explicitly (either fold outcomes into
   dismiss reasons or keep outcomes and add reasons only for `dismissed`),
   not ship both in parallel.

2. **Item E's CPSC follow-on is half-shipped.** A standalone weekly CPSC
   job already exists (PR #4: SaferProducts feed x appliance registry,
   MAY-match notifications, deduped once-ever). E's version routes it
   through `external_signal` — that is a REFACTOR of a live job, not a
   new build, and the existing dedupe-by-notification-kind behavior must
   survive it.

Also true at time of writing: the sequencing section's gate ("only after
the deploy session is clean") is not yet met — migrations 0014-0017 have
not run against production. Items A and B become buildable the day the
deploy session reports clean, and per the sequencing they should land
before the first real household's data starts accumulating.
