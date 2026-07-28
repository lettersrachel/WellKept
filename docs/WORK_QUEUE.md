# Work queue

Updated 27 July 2026. Supersedes the open-item lists in
`ANTICIPATION_SESSIONS.md`, `CORPORATE_CAPTURE_SESSIONS.md`,
`POST_DEPLOY_SESSIONS.md` and `POST_DEPLOY_SESSIONS_2.md`. Those four remain in
`docs/` as the detailed briefs; **this file is the index of what is open.** Paste
a single session's detail, not this file.

Standing rules live in `CLAUDE.md` and load automatically. Do not restate them
in a session prompt.

---

## State

Production serves `19b8410`. 25 migrations (0000 to 0024). The 14-point smoke
checklist passed 14/14 on 27 July. Gap register at G-49.

**Nothing has a real household yet.** Every gate below that says "pilot" or
"first household" is genuinely closed, not deferred.

---

## Open now: no gate but the deploy

### W-1. Observation series write posture

`object_observation` is insert-only with no correction path. The reasoning was
that the next look corrects a bad one and the series absorbs noise. That holds
for averaging and fails for what the series is actually for: STD-016 asks for
promotion of anything degrading faster than its flag assumed, so the derivation
is looking for a cliff, and one fat-fingered `1` on a pristine object is exactly
a cliff.

The audit trail records events, which stay true. An observation is a claim about
the world, which can be wrong.

**Do:** supersede rather than delete. Keep the row, mark it superseded with who
corrected it and when, exclude superseded rows from any derivation. Same shape
as `provision_versions`.

**Why now:** nothing yet computes rate of change from the series, so no
derivation depends on the current posture. That stops being true with the first
consumer.

### W-2. Health denominator dedup for recurring maintenance prompts

The derived maintenance prompt rolls forward every cycle. An appliance nobody
services re-fires forever, and each firing enters the act-rate and
informative-rate denominators for its rule. One delinquent household could drag
a sound rule toward retirement-candidate.

A2's three-household minimum guards this at fleet scale and does not guard it
during a small pilot.

**Do:** confirm whether repeat firings on the same household against the same
object are deduplicated in the health denominators, the way the threshold family
dedupes at 14 days. Report before changing anything.

**ANSWERED 2026-07-28 (read-only, nothing changed).** They are NOT
deduplicated: `ruleHealthByRule` (oversight/triggers/page.tsx) counts every
non-suppressed `prompt_pack_item` in the trailing 90 days once toward
`fired` — a monthly-interval unserviced appliance adds three denominator
entries per household per window, and each cycle is a distinct occurrence
so the deterministic sweep id does not collapse them. Three mitigations
stand between that and a wrong retirement: the flag keys ONLY to
`informativeRateFloor`, which is deliberately unset (no rule can be
flagged today); `minHouseholds >= 3` and `minUsers >= 2` guard the flag —
but both count from ANSWERS, so they do not stop one delinquent
household's repeat firings from sagging the DISPLAYED informative rate,
which is exactly the pilot-scale exposure this item predicted. Disposition
when a fix is wanted: dedupe `fired` per (rule, household, registry entry)
within the window for the derived families only — but that is a change to
founder-visible metrics and waits for the founder to see real numbers
first, per the informative-floor precedent.

### W-3. Cascade-shape read, before accepting G-47's framing

Tier gating as the documents describe it is about what happens **when a trigger
fires**: Essential logs, Family Operations acts, Concierge runs the full
cascade. That is a property of the cascade step, not of a provision. How to fold
a towel does not vary by tier; what a grade change produces does.

If that is right, `membership_tier_gate` on 1,146 provisions is an expensive
place to express a concept belonging to a much smaller number of cascade steps,
and G-47's authoring burden mostly evaporates.

**Do:** read the cascade step shape and report whether the gate belongs there
instead. One hour. Do not build.

**ANSWERED 2026-07-28 (read-only, nothing built): the hypothesis is
right, and the migration cost is zero.** The cascade step is
`definition.items[]` on `trigger_rule` — `{text, offsetDays, methodRef}`
(engine.ts:31-36), emitted per-item by run.ts. Tier gating as the
documents describe it ("Essential logs, Family Operations acts, Concierge
runs the full cascade") is a property of WHICH ITEMS a household
receives, so the gate belongs as an optional per-item field
(`tierGate?`) in the definition JSON — no schema migration, since
`definition` is jsonb; the engine filters items against the household's
tier at emission (household.tier is already on the row the runner
holds). The authoring burden collapses from 1,146 provision gates to a
handful of pack items across three seeded cascades plus the sweep
families. `standard_provision.membership_tier_gate` then stays for the
rare provision that genuinely does not apply below a tier — likely none,
per "how to fold a towel does not vary by tier" — and G-47's loader
update-set fix rides along whenever that column is next touched. G-47's
trigger unchanged; when it trips, build the per-item gate, not the
per-provision authoring project.

### W-4. Two small ones

- **`sizes` registry kind defaults to s1.** Filing a rule that a future write
  surface will set s2 does not change today's default. Children's sizes are
  child data; fix the default, which is the safer place.
- **The condition scale has no documented direction.** Two House Managers
  reading "3 of 5" oppositely is the calibration failure the Stranger Test
  exists to surface. Document it at the point of entry, in the form label, not
  only in a doc.

---

## Open, unanswered from the standards and triggers review

`STANDARDS_TRIGGERS_GAP_REVIEW.md` has not been dispositioned. `object_observation`
supplies the series these depend on; none of them is built.

### W-5. Flags (the largest single gap)

STD-016 §5: every sentinel check produces a flag; every flag carries a revisit
trigger, a date or a condition, set at the moment of flagging; flagged
conditions are re-observed at every visit, not only on their date; anything
degrading faster than its flag assumed is promoted.

No flag entity exists. Nothing enforces a revisit. Nothing promotes. The series
built in migration 0023 currently has no consumer, and this is the consumer.

**Gate:** before a House Manager starts noticing things, or the pilot's first
months of observations have nowhere to live.

### W-6. Deliberate deferral

"Report what was noticed and deliberately left, with the reason and the intended
timing." Distinct from a dot: a dot is an observation, this is a recorded
decision not to act, and it is meant to reach the client. Probably the most
client-visible item in either review. Small.

### W-7. Paused decisions

Research done and then paused, logged with its own revisit trigger so it is not
lost to time. Small, and it pairs with W-5's revisit mechanism.

### W-8. Pruning questions 2 and 3

- **Trigger overlap detection.** Two rules firing on one event should be merged;
  nothing surfaces the pair.
- **Consequence weighting.** Density should track consequence, not completeness.
  Stronger than the `priority` rank proposed for the briefing budget: a rule
  firing twice a year that catches a failing water heater outranks a frequent
  low-stakes one regardless of act rate.
- Also confirm **rule retirement is versioned and attributed** the way
  `provision_versions` is, since the standard requires a later reader to see
  what was pruned and why.

---

## Gated, with briefs already written

| Item | Brief | Gate |
|---|---|---|
| Anticipation C (briefing budget) | ANTICIPATION_SESSIONS | 3 households, or a briefing that felt long |
| Anticipation D (field age) | ANTICIPATION_SESSIONS | intake exists as a process |
| Anticipation E (external signals) | ANTICIPATION_SESSIONS | none; school and activity calendars first, ahead of weather |
| Anticipation F (cold start) | ANTICIPATION_SESSIONS | D shipped, 3+ households |
| Capture 4 (unit economics) | CORPORATE_CAPTURE_SESSIONS | ~1 month of time and cost data |
| Capture 5 (HM entity) | CORPORATE_CAPTURE_SESSIONS | **G-13 approved and acknowledged** |
| Capture 6, 7 (continuity, turnover) | CORPORATE_CAPTURE_SESSIONS | capture 5, second HM |
| Capture 8, 9 (satisfaction, declined requests) | CORPORATE_CAPTURE_SESSIONS | 60 days of a real household |
| G-47 tier gating | register | see W-3 first |
| Phase 0 portal form | INTAKE_CAPTURE_GAP_REVIEW §3 | counsel on children's data (packet §6g) |
| Transcript ingestion | INTAKE_CAPTURE_GAP_REVIEW §4 | counsel on the AI subprocessor (packet §8) |
| Kits, object relationships, override taxonomy | INTAKE_CAPTURE_GAP_REVIEW | pilot makes them concrete |
| Mileage `purpose` and `destination` | G-46 | founder field list, plus the erasure interaction |
| Room-level intake granularity | INTAKE_CAPTURE_GAP_REVIEW §7 | after the calibration study runs |

---

## Not software

Listed so it does not vanish into a build queue.

1. **The 300-row floor review.** Column I of the provision workbook is empty, so
   `seed_reviewed` stays false, so the entire standards library renders nowhere
   for anyone. The workbook's own instructions say to filter column E and review
   the floor rows: 189 `floor_1` plus 111 `floor_2`. An afternoon, not a week.
   **Every provision-related thing built so far is dark behind this.**
2. Counsel outreach, then the custody sitting (three drills, one throwaway
   branch). Lifts the no-real-s3 guardrail.
3. Insurance: workers' compensation, which attaches from the point of employment
   in Virginia, plus the G-48 hired and non-owned auto question. Same broker
   call. Before the first pilot signature.
4. Approve the G-13 staff disclosure. It gates the hire's first logged hour.
5. Hire a House Manager. Recruit and consent the first household.
6. Chores (Upstash budget alert, Vercel project rename, DMARC), the pilot
   protocol's friction-log brackets, the two LAUNCH signatures with §2.4 after
   the restore drill.
7. **Consider putting one pilot household on a non-Concierge tier.** If every
   pilot household runs the same tier, the pilot ends with no evidence about
   tier differentiation, and the tiers are load-bearing in the revenue model.
   A recruiting decision, not a build.
