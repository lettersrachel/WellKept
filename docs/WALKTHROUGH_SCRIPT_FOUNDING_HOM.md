---
status: living
---
# The founding-HOM walkthrough script

WK-DEV-007 section 2's closing requirement: a walkthrough script written
so February training doubles as the acceptance test. This is that
script. It walks every Cockpit and input-spine surface in the order a
working day meets them, on a phone from a home-screen install (the
pilot protocol's rule; opening it in Safari instead is a friction-log
row). It is also the no-dead-taps instrument: at EVERY station, any tap
that neither completes nor explains itself is a FAIL, written down with
what was tapped and what happened instead.

Run it against the Smoke Test Fixture or a synthetic household, never a
real one, until training itself. Two people make the stranger stations
honest: the HOM and someone who has never seen the household.

Timings marked DRILL are the standard's numbers; record them, do not
estimate them. A stopwatch and honesty; the record is the deliverable.

## Station 1: first open

1. Open the app from the home-screen install. Sign in with your work
   email; enter the emailed code and your authenticator code.
2. Expected: no passwords anywhere; a wrong code explains itself; the
   household picker appears only if you carry more than one assignment.
3. DRILL: from tap to briefing visible, cold, on hotel wifi. Record it.

PASS / FAIL / friction notes:

## Station 2: the briefing, read top to bottom

1. Read the briefing in order and say aloud what each section is for:
   flags first, flagged for revisit (condition flags, moving-fast
   first), past its timing (deferrals), paused decisions whose timing
   arrived, changed since last visit, today's specials, coming up, last
   year at this time, open dots, signals.
2. Expected: nothing on this screen asks you to do anything; it briefs.
   The signals section says plainly that nothing is promoted yet.
   Every section either shows content or says honestly why it is empty.
3. DRILL: airplane mode ON, kill the app, reopen. The briefing returns
   from cache, labeled cached. Record whether the cached open lands
   under two seconds (REQ-073).

PASS / FAIL / friction notes:

## Station 3: stranger mode, the handoff

1. One gesture: tap Stranger mode in the masthead. The banner states
   what the projection is doing.
2. Hand the phone to the second person. They confirm: no staff-only
   detail is visible EXCEPT fields marked stranger-visible (the
   allergies class); nothing secured appears anywhere, and nothing on
   the screen hints at what is hidden.
3. Take the phone back; exit stranger mode with one gesture. The full
   briefing returns.
4. The stranger question, asked of the second person while they hold
   the phone: could you run this visit from what you see? Their answer
   is a Stranger Test data point; record it.

PASS / FAIL / friction notes:

## Station 4: capture during the walk

1. Flag a condition in your own words, with a revisit date or a stated
   condition. Expected: the form refuses a flag with no revisit plan,
   and says why.
2. Log a look on an existing flag. Log a paused decision. Answer a
   surfaced prompt.
3. DRILL: count interactions from the briefing screen to each capture
   landed. The standard is three or fewer per observation.
4. Airplane mode ON. Capture another flag. Expected: the chip says
   saved on this device, syncing, and never says recorded until the
   server has it. Airplane OFF: the chip upgrades on its own.

PASS / FAIL / friction notes:

## Station 5: the close flow

1. Run the close flow end to end: tasks, hours, photo, changes noticed,
   life-change check, zone drift, the three sentences, submit.
2. Expected: a photo is stripped of location data at capture; the
   submitted card claims only what is true (saved on this device while
   anything waits, submitted only when nothing does).
3. Mid-flow, kill the app. Reopen. Expected: the flow resumes exactly
   where it stopped, checked tasks still checked.
4. DRILL: total interaction time for a routine close. The standard is
   under two minutes.

**The three sentences are the one thing here no software checks, and
this station is where that is taught.** Everything else on the close
flow is bounded by something: tasks come from a list, hours are a
number, photos are stripped at capture, the life-change check is a
yes or no. The three sentences are free text, and they are mailed to
the member, verbatim, within seconds of Confirm close. There is no
review step between the HOM typing them and the member reading them.

What the software does and does not do, stated exactly so nobody
assumes more:

- It refuses to send unless there are exactly three non-empty
  sentences. That is a COUNT, not a reading.
- It escapes them, so punctuation cannot break the email.
- It checks nothing about what they SAY. Not tone, not accuracy, not
  whether a sentence names another household, a staff member, a
  price, a diagnosis, or a judgment about the family.

So the rules for the three sentences are a matter of training and
review, not of a guard:

1. Write what a member would be glad to read and would recognize as
   true. If it would embarrass anyone to have it read aloud in the
   kitchen, it is the wrong sentence.
2. Never name another household, another member, or a colleague.
3. Never put an internal judgment in a sentence. What was done and
   what was noticed; not what you concluded about the people.
4. Never put a price, an estimate, or a duration in a sentence (the
   D7 wall exists for the same reason and the software cannot see
   prose).
5. If a sentence would be better said out loud, say it out loud and
   write a plainer one.

DRILL for this station: write one sentence that breaks rule 3, read
it back, and rewrite it. The point is to feel how easily an ordinary
internal thought becomes a sentence a member reads.

PASS / FAIL / friction notes:

## Station 6: intake mode and a correction

1. Open intake mode, capture a blank field, then correct it. Expected:
   both writes land; nothing is lost; the corrected value stands.
2. Mark a staff-only field stranger-visible where a covering stranger
   genuinely needs it. Flip to stranger mode and confirm it now shows.
3. Reclassify a field to secured (s3). Expected: its plaintext clears
   from the screen at once; the value's home is the vault, set through
   corporate.

PASS / FAIL / friction notes:

## Station 7: when things refuse

1. Deliberately do three things the system should refuse (a flag with
   no revisit plan, a resolution with no choice made, anything else you
   can find). Expected: every refusal is visible and says why; nothing
   fails silently.
2. This station has no pass by absence: if you cannot make it refuse
   visibly, that is a finding too.

PASS / FAIL / friction notes:

## Closing the run

Record: the DRILL numbers (cold open, cached open, interactions per
capture, close-flow minutes), every FAIL and friction note, and the
stranger's answer from station 3. File the numbers in the weekly build
note; a FAIL that survives the session becomes a register entry. When
this script runs clean with a founding HOM in February, the Cockpit's
acceptance test has passed, which is what this document is for.
