# Anticipation roadmap: Claude Code session briefs

Companion to ANTICIPATION_ROADMAP.md. That file is the design. This one is how
the work gets handed over.

**How to use it.** Paste one session section into Claude Code. Never the whole
file. Each section is self-contained and each has a gate at the top that has to
be true before the session starts.

**Why the gates exist.** Claude Code will cheerfully build all six of these
tonight, competently, and that would be the wrong outcome. Four of the six are
sequenced against evidence the pilot has not produced yet, and building them
early means guessing the numbers that are the entire feature. The gate is the
part that a capable assistant cannot supply for you.

---

## Where Claude Code genuinely helps, and where it does not

**It is good at:** the schema work and migrations, wiring a new column through
the projection and payload guards without leaking it into the wrong role view,
extending the health metric calculations, adding a new prompt kind to the
render path, writing the tests, and finding every call site that has to change
when a denominator changes. That last one is the underrated case. Item C
changes what counts as a fired prompt, and the risk is not writing the budget,
it is missing one of the places that reads the old count.

**It is not good at, and should be told not to try:**

- Picking any threshold. The informative rate floor, the per-briefing budget,
  the max input age per rule. Each is a policy decision, and a plausible
  default is worse than a blank because it looks decided.
- Writing rules for the library. New rules come from the Misses panel and from
  SPEC CANDIDATE entries in the friction log, not from a model's sense of what
  households need.
- Inferring the incident back-link. If it can be inferred it is a guess, and a
  guess in that column produces a false-negative stream made of fiction.
- Writing archetype content. What is typically true of a 1920s Falls Church
  house is domain knowledge you have and a model will confabulate.
- Deciding that a gate has been met.

**Standing rules for every session below.** Worth pasting along with the
section:

1. Stop and ask rather than choosing a threshold, a taxonomy value, or a
   default. A blank is a fine deliverable.
2. One migration per session. If the work seems to need two, that is the signal
   the session is too big; report it instead.
3. No feature work outside the section's scope, even if an adjacent gap is
   obvious while you are in the file. Note it and move on.
4. Never run the erasure tool with `--commit`.
5. Never echo `DATABASE_URL`, `WK_KMS_KEY`, `AUTH_SECRET`, or the contents of
   `.neon-connection`.
6. Do not run the full turbo suite while a dev server is up.
7. Any commit that adds or changes a data category updates `legal/README.md`
   and the privacy notice's collection table in the same PR. Sessions A, B, D
   and F all trigger this.

---

## Session A. News versus known

**Gate:** the deploy session is complete and phase 2 was clean.

**Why it is first:** it changes what gets recorded. Built after the pilot
starts, it cannot recover the months that ran without it.

**Decisions to supply before starting:**
- The dismiss reason list, in the words a House Manager would use. The spec
  suggests not applicable, wrong, bad timing, already done. Yours to confirm.
- The two acted labels. "Good catch" and "Already on it" are placeholders.
- The informative rate floor. Leave it blank if you would rather set it after
  seeing real numbers; the metric can exist before the threshold does.

**Scope:** `prompt_outcome` gains `was_news` and `dismiss_reason`. The
acted/dismissed control becomes two taps. `informative_rate` joins rule health
as a computed metric and becomes the retirement input, with act rate demoted to
display. Extend the `rule_health` app_setting knob. Migration 0018.

**Out of scope:** changing any existing rule, backfilling `was_news` for
historical outcomes (leave it null and let the metric ignore nulls).

**Done when:** a prompt can be resolved with a reason from the field client
offline, the value survives sync, and `/oversight/triggers` shows both rates
side by side with the retirement flag keyed to the new one.

---

## Session B. Incident back-link

**Gate:** same as A. Can share a session with A if both stay small, but
separate migrations.

**Why it is early:** the false-negative stream is the only one the business
will ever get, and incidents logged before this exists will not carry the
field.

**Decisions to supply before starting:**
- Whether the question is required at resolution or skippable. Required
  produces better data and more friction on a form someone fills in while
  annoyed.

**Scope:** `incident_report` gains `preventable_by_prompt`, `related_rule_id`,
`related_prompt_id`, populated at resolution rather than creation. A Misses
panel beside `/oversight/triggers` listing `no_prompt_existed` incidents.
Migration 0019.

**Out of scope:** inferring any link, suggesting a likely rule, or scoring
incidents. The person resolving answers the question or leaves it blank.

**Done when:** resolving an incident asks the question, and the Misses panel
lists what the engine did not catch.

---

## Session C. Briefing budget

**Gate:** at least three households live, or a real briefing that felt long.
Not before. The number is the feature and it cannot be guessed.

**Decisions to supply:** the per-briefing budget.

**Scope:** the `prompt_budget` app_setting, a `priority` rank on rules, safety
floors exempt and sorted above everything, a `suppressed_by_budget` state, and
average prompts per briefing over thirty days on the triggers page. Migration
0020.

**The thing to be careful about, and worth pasting verbatim into the session:**
a prompt suppressed by the budget must not enter the act-rate or
informative-rate denominator. Find every place that counts a fired prompt and
confirm each one excludes suppressed prompts. Getting this wrong means the
budget quietly destroys the health scores of the rules it crowds out, and they
get retired for being crowded rather than for being wrong.

**Done when:** a briefing tops out at the budget, floors always appear, and
suppressed prompts are visible in oversight but absent from health denominators.

---

## Session D. Field age and confirmation prompts

**Gate:** intake exists as a real process, so there is something to age.

**Why it is worth doing properly rather than early:** it is the largest of the
six and everything in F depends on its provenance model.

**Decisions to supply:**
- Which fields carry a max input age at all, and what it is for each. Most
  fields do not need one. Vendors, appliances, occupancy and health-relevant
  fields do.
- The default `stale_behavior`: suppress, or convert to a confirmation prompt.

**Scope:** a `field_confirmation` table, `max_input_age_days` and
`stale_behavior` on rules, a `confirmation` prompt kind that renders as a
question and whose answer writes a confirmation row, a per-household staleness
view. Safety floors never suppressed by staleness; they fire carrying a
staleness note. Migration 0021.

**Out of scope:** backfilling confirmation dates for existing fields with
anything other than the audit log's real timestamps. Inventing a date is worse
than having none.

**Done when:** answering a confirmation prompt updates the field's age, and a
rule reading a stale input behaves per its configured setting.

---

## Session E. External signals, weather only

**Gate:** none, beyond the deploy. Independent of the pilot, touches no
household data. Reasonable to do while waiting.

**Decisions to supply:** the NWS zone for the service area.

**Scope:** an `external_signal` table, a worker job polling the National
Weather Service alerts API (free, no key, queried by zone so nothing leaves),
an optional `signal_kind` predicate on rules, and one seeded rule crossing a
freeze warning with the record's outdoor spigot and irrigation fields.

**Out of scope this session:** CPSC recalls, warranty expiry, and every other
source. Prove the pattern on one before adding a second.

**Separately, and small enough to fold in:** reminders gain `cycle_kind` of
annual, interval or conditional, with `interval_days`. Repeat-season recall
currently assumes an annual cycle, so anything on a four-month interval is
either invisible or wrong three times a year.

**Done when:** an active alert in the zone changes what appears in a briefing,
and the rule stops firing when the alert expires.

---

## Session F. Cold start

**Gate:** session D shipped, plus three or more households with enough history
to say what is actually typical.

**Why the gate is hard:** archetype seeding without field-level provenance
fills the record with plausible fiction, which destroys the property the record
is sold on.

**Decisions to supply:** the archetype content itself. This is the session
where the useful division of labour is sharpest: you write what is typically
true of the house types you serve, Claude Code builds the table, the seeding
step and the provenance handling.

**Scope:** a `record_archetype` table, seeding on household creation writing
`source='seeded'` confirmations, a rule that seeded fields never appear in the
client view and produce confirmation prompts rather than instructions until a
human confirms them, and an intake completeness score so the engine can be
quieter on a thin record. Migration 0023.

**Done when:** a new household starts with hypotheses that are visibly
hypotheses, and confirming one promotes it to a fact.

---

## The other half of the answer

Feature sessions are the smaller share of what Claude Code is useful for here.
These are recurring, none is a migration, and several are already obligations
that currently depend on somebody remembering.

**Keep the legal drafts honest.** Standing rule 7 above exists because the
drafts silently stopped describing the product once before. A session that
reads the schema, compares it against the privacy notice's collection table and
`legal/README.md`, and reports drift is worth running before any counsel
conversation and after any batch of merges.

**Run the weekly drift check.** The parallel pilot protocol's `db:dump` plus
`wk_import.py --against` step, including deleting the dump afterward, which the
protocol notes only happens if the diff succeeds.

**Keep SPEC_AUDIT current.** It is the document that makes the package
survivable by an adversarial reader, and it decays with every merge. Comparing
the requirement table against what is actually in the tree is exactly the kind
of tedious cross-reference to hand over.

**Pre-PR review against the repo's own laws.** No em dashes, no AI-sounding
jargon, plain prose, payload guards on any new client-facing route, an audit row
before any secured value leaves the server, WRI-style plain language in the
client-facing copy. A checklist a session can apply is more reliable than
noticing.

**Re-run the security probe and the floor-bypass assertion** after anything
touching exclusions, floors, or the projection layer.

**Prepare the counsel packet.** Assembling the seven attachments, confirming
each bracket is still open or now answered, and flagging anything the schema
does that the drafts do not mention.


---

## Repo note (2026-07-25 — committed alongside the roadmap; nothing built)

The two reconciliations in ANTICIPATION_ROADMAP.md's repo addendum apply to
these sessions: Session A's dismiss taxonomy must reconcile with the shipped
`prompt_outcome_kind` enum (not duplicate it), and any post-E CPSC work is a
refactor of the live weekly job (PR #4), whose dedupe-by-notification-kind
behavior must survive. The recurring sessions in "The other half of the
answer" are runnable today — the legal-drift check in particular belongs
before the counsel engagement.
