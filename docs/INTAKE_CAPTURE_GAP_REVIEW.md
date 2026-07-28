---
status: living
---
# Intake capture: what the record cannot hold

Prepared 27 July 2026. Companion to `STANDARDS_TRIGGERS_GAP_REVIEW.md`.

Sources: `Well_Kept_Playbook_Inventory_Rubric.xlsx` (7 tabs),
`Well_Kept_Client_Profiles_Intake_and_Anticipation.docx`, and the 23 July
manifest, compared against ADR-002, SPEC_AUDIT and the rev 9 package.

Still not seen: the 258-field record seed itself and the bindings CSV. Those
would let me check field-by-field rather than model-to-model.

---

## The through-line

Both intake instruments and STD-016 assume the same thing, and the schema does
not provide it.

**The instruments capture objects with attributes and histories. ADR-002 chose a
single registry table.** That decision was right for what it was deciding at the
time, which was whether birthdays, vendors, appliances and subscriptions each
needed their own table. It is under-dimensioned for what intake actually
collects, and the gap is not one or two columns.

**Everything valuable in intake is a series, not a state.** This is the same
finding as STD-016's flags, arriving independently from a second document, which
is what makes it worth acting on rather than noting.

---

## 1. The object model

The rubric captures seventeen attributes per object: name, category, home
location, condition on a 1 to 5 scale, fill level for consumables, last used from
owner memory, override flag, barrier to use, purchase or install date, expected
lifespan, maintenance interval, last serviced or replaced, shelf life or expiry,
care instructions, warranty and value, whether it generates an actionable
trigger, and the trigger type.

**What that enables that the registry probably cannot:**

- **Horizons compute themselves.** Install date plus expected lifespan plus
  maintenance interval plus last serviced is enough to derive every horizon in
  STD-016 §6 without anyone maintaining a target date. My earlier review asked
  whether horizons were computed or entered. The instrument collects the inputs
  for computed. Whether the registry stores them is the open question, and it
  decides whether horizons age well or rot the first time nobody updates one.
- **Shelf life and expiry** is the consumable-expiry gap from the standards
  review, already being collected on paper.
- **Override flag** carries three distinct meanings: sentimental, safety-critical,
  high-value. Each drives different behaviour. Safety-critical maps to floors,
  high-value to insurance and handling, sentimental to how a House Manager treats
  the object. Collapsing them into one flag loses all three.
- **Barrier to use**, meaning repair, clean, reach, or buried, is a deferred-action
  reason. It is the same object as the deliberate-deferral gap in the standards
  review.
- **Part of a set or system**, from intake prompt 9, is an object relationship. A
  flat registry table has nowhere to put it, and it is what lets a trigger about
  one object reach the rest of its set.

## 2. Condition and fill level are the series problem, made concrete

Condition on a 1 to 5 scale and fill level are worthless captured once and
valuable captured repeatedly. A condition score in isolation says nothing; a
condition score that moved from 4 to 3 to 2 over three visits is a prediction.
Fill level once is trivia; fill level over time is a reorder date.

STD-016 §5 says the same thing about flags: re-observe at every visit, because a
flag records a rate of change as much as a state, and promote anything degrading
faster than its flag assumed.

The record holds current state. Nothing supports an observation series against an
object over time, so both instruments are collecting inputs to a calculation the
software cannot perform. **This is the single highest-value schema change
available**, and it is one table: an observation with an object reference, a
date, a measure, a value, and who recorded it.

## 3. Phase 0 has no software surface

The Client Profiles document describes a pre-intake form that runs before the 60
to 90 minute walk-through, so the walk-through spends its time on preferences
rather than facts already on file. It captures WFH days and commute patterns,
each child's school and activity roster, travel frequency and typical trip
length, entertaining frequency and style, grandchildren visit frequency, and the
decision-maker map showing who owns which domain.

Nothing in the client portal collects any of this, and the portal is the obvious
home for it. It is also the answer to the low-engagement problem in client
portals generally: a form the client must complete before service starts is a
reason to log in, which the portal currently lacks.

The pre-loads it is meant to drive are equally absent: grade-turnover and
activity-enrollment triggers seeded before the first visit, an away-mode
checklist auto-populated on any travel mention, a delegation ladder the House
Manager can read on day one.

## 4. The intake method assumes AI transcript structuring

The rubric's voice-capture instruction is explicit: narrate in a fixed order,
say the room name at each doorway so the transcript self-segments, handle each
object once. The stated reason is that consistency lets AI structure the
transcript into rows afterward.

So the designed intake path is voice, then transcript, then structured rows. The
software has no transcript ingestion, no structuring step, and no review queue for
proposed rows. Intake today would be someone typing into a spreadsheet and
importing it.

This matters more than a normal missing feature, because intake cost is the
number that decides whether 108 households arithmetic. The method that makes
intake affordable is the one with no software behind it.

Two things worth noting here rather than in a roadmap. The label-photograph step
is already in the protocol as prompt 8, so the Centriq-style scan mechanism I
recommended earlier is not new capability, it is automation of a step being done
by hand. And an AI structuring step would send household contents to a third
party, which is a new subprocessor and a counsel question, not just a build.

## 5. Tier gating is a depth rule the trigger engine may not implement

Essential logs a change to the record. Family Operations acts on routine
adjustments. Concierge runs the full cascade with proposals and partner
coordination. The same event produces different behaviour by tier, and the
external-calendar section restates it: Essential logs the calendar and standing
constraints, Family Operations checks the kit and sources gaps, Concierge runs
the August pre-year audit.

`membership_tier_gate` exists in the standards store schema and is null on all
1,146 seeded provisions. Whether the trigger engine implements tier-gated cascade
depth is unconfirmed and worth checking directly, because if it does not, every
household gets Concierge behaviour or Essential behaviour regardless of what they
pay for, and that is both a margin problem and a promise problem.

## 6. External calendar dependencies collect more than a calendar

STD-016 names Channel 5. The rubric's Part 2 specifies eight capture points per
dependency, and three of them are not calendar data at all:

- **Where the calendar and its announcements actually arrive.** The channel, not
  the schedule. A school that announces by email to one parent is a different
  operational problem from one that posts to an app.
- **Short-notice pattern**, meaning how much warning this dependency usually
  gives. Lead time is a property of the source and it determines whether a
  trigger can be useful at all.
- **The associated kit**: whether one exists, where it lives, what is in it, and
  the perishable details like sizes. Plus an overlap check for items covering
  multiple events.

**Kits appear nowhere in the software.** They also appear in the client profiles
as the visiting-child-mode kit, the go-bag, and the frequent-traveler pack, so
they are a recurring object type rather than a school-specific one. A kit is a
set with a location, contents, perishable attributes, and a staging trigger.

## 7. The rubric is the intake-cost instrument, on paper

The Summary and Findings tabs compute minutes per room, objects cataloged,
minutes per object, actionable trigger rate, and a verdict of high signal or
low-value mass per room. The stated purpose is a one-time calibration study to
find the 80/20 of where intake time earns its keep.

That is exactly the instrumentation I said was missing when reviewing corporate
capture, and it already exists in better form than I proposed. Two consequences.
`time_entry` has an `intake` category but no room-level granularity, so it cannot
reproduce this. And the calibration output, which rooms deserve exhaustive
capture and which deserve sampling, is a durable finding that should end up in
the software as guidance, not stay in a workbook.

## 8. Two things outside the software worth flagging

**Child data.** The rubric states plainly that school name, schedules and
children's sizes are child data under WK-SOP-019, do not belong in a loosely
shared document, and platform credentials are never stored in the open record.
This sharpens the consent question already in the counsel packet about who can
consent for a household containing minors, and it is worth asking counsel
directly whether children's sizes and school schedules need handling beyond the
s2 tier.

**Insurance.** The 23 July manifest carries a specific finding: hired and
non-owned auto liability apparently uncovered, broker and counsel needed before
the first pilot signature. That is now more pointed than when it was written,
because travel time and mileage are captured categories in the software, so House
Managers driving on business is a documented operational fact rather than an
assumption.

---

## What I would do with this

1. **The observation series.** One table, it unblocks condition tracking, fill
   level, flag rate-of-change, and degradation cadence, and every day of intake
   that happens without it produces states where series were intended.
2. **Confirm whether the registry holds install date, lifespan, interval and last
   serviced.** If yes, horizons are computed and fine. If no, that is the second
   change and it should happen before the first household's objects are entered.
3. **Check tier-gated cascade depth in the trigger engine.** A quick read,
   potentially a significant finding.
4. **Phase 0 as a client portal form**, before the first household rather than
   after, since it is also the portal's missing reason to exist.
5. Kits, object relationships, and the override taxonomy at the point the pilot
   makes them concrete.
