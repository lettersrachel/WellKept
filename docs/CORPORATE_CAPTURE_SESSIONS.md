# Corporate data capture: Claude Code session briefs

Prepared 25 July 2026. Companion to the corporate capture review.

**How to use this.** Paste one session section into Claude Code, never the whole
file, along with the standing rules below. Each session has a gate that has to
be true before it starts.

**Everything here gates on the deploy.** Migrations 0014 to 0017 have not met
the live database. No session below should start until that session is clean.

---

## Migration numbering, and a correction to the anticipation roadmap

ANTICIPATION_ROADMAP.md allocated migrations 0018 through 0023 to its six items.
That was a mistake on my part. Those items are gated on pilot evidence that does
not exist, several sessions here are gated on nothing but the deploy, and two
documents both reserving 0018 will collide the first time the order differs from
what either predicted.

**Correct rule: migration numbers are allocated at build time, not reserved in
advance.** The next migration to be written takes the next number. Treat both
documents as unordered relative to each other, and ignore the specific numbers
in the anticipation roadmap.

---

## Standing rules for every session

1. Stop and ask rather than choosing a category taxonomy, threshold, or default.
   A blank is a fine deliverable. A plausible default looks like a decision
   somebody made.
2. One migration per session. If it feels like two, the session is too big.
   Report that instead of proceeding.
3. **ADR-004 holds.** Capture hours and costs into the record. Do not compute
   payroll, do not build scheduling, do not build invoicing. Those live in
   QuickBooks and the Jobber stack by decision.
4. Every session here adds a data category, which triggers the standing repo
   rule: update `legal/README.md` and the privacy notice collection table in the
   same PR.
5. **Staff data is not household data.** The privacy notice is client-facing and
   does not cover employees. Anything capturing House Manager information needs
   the staff-facing disclosure, which is gap G-13 and is not yet written. See the
   hard gate on session 5.
6. No em dashes, no AI jargon, plain prose, WRI-style plain language in anything
   client-facing.
7. Payload guards on any new client-facing route. Audit rows before secured
   values leave the server.
8. Never echo `DATABASE_URL`, `WK_KMS_KEY`, `AUTH_SECRET`, or the contents of
   `.neon-connection`. Never run the erasure tool with `--commit`.

## Where Claude Code helps, and where it should stop

**Good at:** the schema, wiring a new field through three projections without
leaking it into the wrong role view, the derived metric calculations, finding
every call site affected when a computed number changes, migrations, tests.

**Should not attempt:** deciding what time categories exist, setting any
threshold, designing the satisfaction mechanism, choosing what to record about an
employee, or writing the taxonomy for a turnover reason. All of those are yours.

---

# Tier 1. Before the first household

These three capture windows close. Built afterward, they cannot recover the
pilot months that ran without them, and the pilot's entire output is evidence.

## Session 1. Categorized time capture

> **BUILT 2026-07-27** (migration 0020), gate met the same day the deploy
> ran clean. Founder decisions recorded: categories **delivery, travel,
> intake, admin, training** (the suggested list, adopted); entry is
> **after the fact** for the pilot (no live clock until a second House
> Manager exists — a clock has to survive offline sync gaps). A visit's
> delivery hours derive automatically: the applied `visit.submit` command
> writes a `delivery` time entry in the same transaction, so entries
> survive offline sync with no field-client changes. Other categories are
> logged after the fact on the visit surface or the drill-in. ADR-004
> held: hours in, no pay out.

**Gate:** deploy clean.

**Why first.** Per-household unit economics, the 108-household arithmetic, and
the true gross margin all block on this one table. Visit hours today are a single
entered number, so delivery, travel, intake and admin are indistinguishable, and
the most important figure in the business model is uncomputable from the system
that holds the data.

**Decisions to supply:** the category list. Suggested starting point is delivery,
travel, intake, admin, training. Also whether time is clock-based, entered after
the fact, or both, remembering the field client is offline-first and a clock has
to survive a sync gap.

**Scope.** A `time_entry` table keyed to household, House Manager, category,
start, end, and source. Visit hours become derived from entries rather than
entered directly. Time entries sync from the field client offline.

**Out of scope.** Overtime calculation, pay rates, anything resembling payroll,
and any location capture. Hours in, not paychecks out.

**Done when:** a visit's hours are computed from categorized entries, entries
survive an offline sync, and travel time is separable from delivery time for any
household over any date range.

## Session 2. Non-labor cost capture

> **BUILT 2026-07-27** (migration 0021, separate from session 1's 0020 per
> standing rule 2). Founder decisions recorded: categories **supplies,
> materials, mileage, other**; **mileage is entered** (a miles field on
> mileage rows), never derived from travel time. Receipt photos: the
> schema links a `visit_photo` row (`receipt_photo_id`) so a receipt gets
> the same retention purge and hold semantics as every other photo; no
> upload UI yet - add it when the first real receipt needs capturing.
> QuickBooks remains the book of record.

**Gate:** deploy clean. Pairs naturally with session 1, separate migration.

**Why.** Your own growth model flagged that the 62 to 67% labor margin overstates
true gross margin because supplies, travel and materials are excluded. Nothing
captures them.

**Decisions to supply:** the cost categories, and whether mileage is derived from
travel time entries or entered separately.

**Scope.** A `cost_entry` table with household attribution, category, amount,
date, and who recorded it. Receipt photo optional and, if included, subject to the
same retention rules as visit photos.

**Out of scope.** Reimbursement workflow, expense approval, accounting
integration. QuickBooks remains the book of record for money.

**Done when:** any household's non-labor cost is queryable for a period.

## Session 3. Household commercial attributes

> **BUILT 2026-07-27** (migration 0022), ahead of its gate (first household
> has not signed; the point was to have it ready BEFORE). Founder decisions
> recorded: referral taxonomy is the six-value list — client_referral,
> professional_referral, personal_network, community, press_or_search,
> other (+ optional note); tier names REUSE the shipped tier enum
> (essential / family_ops / concierge — same reconciliation pattern as
> anticipation session A), and price is recorded per membership event, so
> no price list was needed up front. The done-when is enforced in the
> action: a cancellation REFUSES (visibly, per G-29) without a reason and
> an initiator. Both surfaces live on the corporate drill-in's Commercial
> record card.

**Gate:** before the first household signs, which is a tighter gate than the
deploy.

**Why.** Referral is almost certainly your dominant channel and the lender
narrative wants LTV to CAC, of which you currently have neither side. Cohort
retention needs membership state events. You will remember how household one
found you; you will not remember for household twenty.

**Decisions to supply:** the referral source taxonomy, and the membership tier
names and prices.

**Scope.** Referral source on the household record. A `membership_event` table
recording start, tier, price, pause, resume, and cancellation, each with a date,
a reason where applicable, and who initiated it.

**Out of scope.** Billing. QuickBooks bills. This records that a state changed,
not that money moved.

**Done when:** a household's commercial history is reconstructable from events,
and cancellations carry a reason and an initiator.

---

# Tier 2. The payoff, and then the workforce

## Session 4. Per-household unit economics

**Gate:** sessions 1 to 3 shipped, plus enough real data to be worth reading.
This is a read surface, not new capture.

**Why.** This is the number that says whether the business works, and it is the
reason tier 1 exists.

**Scope.** Extend `/oversight/economics` with per-household hours delivered
against membership price, true gross margin including non-labor cost, and
delivery hours separated from travel and intake. Intake hours should be
attributable to a household as a one-time cost so payback period is computable.

**Out of scope.** Forecasting, projections, anything that extrapolates. Show what
happened.

**Done when:** you can answer, for any household, what it cost to serve this
month and what it cost to onboard.

## Session 5. House Manager as an entity

**HARD GATE: the G-13 staff disclosure must be written and acknowledged by the
House Manager before this session runs.**

That gate is not procedural tidiness. The system already keeps an append-only
record of every staff action, every secured reveal, and hours. This session
deepens that considerably. If a person first learns what is recorded about them
during a performance conversation, you have both a trust problem and an
employment problem, and neither is fixable afterward.

**Decisions to supply:** what is captured, what is disclosed, and the retention
period for each. Also whether certifications and training completion feed
earned-latitude progression automatically or advisory only.

**Scope.** Hire date and tenure, certifications with expiry dates, training
completion records, availability and maximum weekly hours, and an expiry alerting
surface for corporate.

**Explicitly out of scope, and do not build these even if asked in passing.**
Performance scoring, productivity ranking, comparative leaderboards, location or
geofence tracking, and any surface that ranks staff against each other. Those are
surveillance-shaped, they need a different conversation than a schema change, and
some of them would change the character of the product.

**Done when:** an expiring certification surfaces to corporate before it expires.

## Session 6. Assignment history and continuity

**Gate:** session 5 shipped, and a second House Manager exists.

**Why.** Continuity of care, the share of visits delivered by a household's
primary House Manager, measures precisely what the client is buying. A household
drifting downward on it is churning, and nothing would currently tell you.

**Scope.** A primary House Manager relationship per household with full change
history, and a continuity percentage over a trailing window on the fleet board.

**Done when:** a household's primary changes and the history records both the
change and its date.

## Session 7. Turnover events

**Gate:** session 5 shipped. Raise with counsel before building.

**Why.** In this business the House Manager is the product, replacement cost
includes re-earning a household's trust, and turnover is the leading indicator of
client churn. Nothing records it.

**The caution.** Reason codes and voluntary versus involuntary flags are
sensitive employment records with discrimination and wrongful-termination
implications. This is the one session here where the schema is trivial and the
policy is not.

**Decisions to supply:** the reason taxonomy, who can see it, and the retention
period. All three after counsel.

**Scope.** A turnover event with date, voluntary or involuntary, reason code, and
tenure at exit. Retention metrics on the corporate dashboard.

---

# Tier 3. Product intelligence

## Session 8. Client satisfaction capture

**Gate:** at least one household served for sixty days.

**Why.** There is no satisfaction capture of any kind today. Quality is measured
entirely by the absence of incidents, which is the same failure as measuring the
anticipation engine by act rate alone: you see only what went wrong, never what
went right or what nearly went wrong quietly.

**This is a product design problem, not a schema problem.** The mechanism matters
far more than the table. A five-star prompt after every visit is wrong for a
premium household service and will be ignored. Design it against a real client's
reaction rather than in advance of one, which is why the gate is sixty days
rather than the deploy.

**Decisions to supply:** the mechanism, the cadence, and the question. All three
after watching one household for two months.

## Session 9. Declined and out-of-scope requests

**Gate:** the client request pipeline exists, which is itself unbuilt.

**Why.** What a client asked for and did not get is your pricing and roadmap
data, and it is free to collect once requests exist as objects.

**Scope.** A declined or out-of-scope disposition on a request, with a reason.
Small.

---

## Suggested order

1. Sessions 1 and 2, in one sitting, immediately after the deploy is clean.
2. Session 3 before the first household signs.
3. Write the G-13 staff disclosure. It is a page, it is not code, and it blocks
   session 5.
4. Session 4 once tier 1 has produced a month of data.
5. Sessions 5, 6 and 7 as the second House Manager approaches.
6. Sessions 8 and 9 when the pilot tells you what they should look like.

## What is deliberately absent

Scheduling, rostering, payroll, dispatch and billing. All outside the boundary
under ADR-004, all better bought than built, and the workforce management tool
that eventually covers them is a purchase decision rather than a session. The
seam between that tool and this record is the thing ADR-004 never costed, and it
becomes expensive somewhere around fifteen to twenty households rather than
at 108.

---

# Repo verification addendum (2026-07-26, in-repo)

Checked against main at commit 8b666a7 before committing this file.

- **Session 1's premise is accurate.** Visit hours are captured as a single
  uncategorized start/end interval (`packages/close-flow/src/index.ts` —
  `captureHours({startedAt, endedAt})`). Delivery, travel, intake, and admin
  are indistinguishable in the record today, exactly as stated.
- **Session 9's gate is accurate.** No request-object pipeline exists in the
  schema; the only `requested_by` column belongs to anticipation exclusions.
- **The migration-numbering correction is adopted.** ANTICIPATION_ROADMAP.md
  did reserve 0018–0023; it now carries a correction note pointing here.
  Numbers are allocated at build time, next number to the next migration
  written, regardless of which document's session builds first.
- **Standing rules 4, 7, and 8 restate existing repo law** (PR checklist:
  legal/README + privacy-notice update in the same PR as any new data
  category; payload guards; audit-before-reveal; secret and erasure rules).
  No conflict.
- **Gate status at commit time: the deploy is NOT clean.** DEPLOY §4 check 5
  is under active investigation. Nothing in this file starts until the
  deploy session reports clean.
- **Open sequencing question for the founder, recorded not decided:** two
  queues now claim "immediately after the deploy is clean" — this file's
  sessions 1–2 (categorized time + non-labor cost) and
  ANTICIPATION_SESSIONS.md sessions A–B. Sessions 1–2 additionally block on
  founder decisions (category lists, clock model) per their own briefs;
  sessions A–B do not. Whichever runs first takes the next migration number.
