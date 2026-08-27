---
status: living
---

# The six unreadable controls: one founder sitting

Written 27 August 2026 from G-74. **G-74 re-read fourteen controls that
standing documents assert are in place. Eight were readable from the
build container and THREE OF THOSE EIGHT WERE WRONG.** The remaining
six cannot be read from the container at all, so they have been carried
on a document's word for as long as they have existed.

There is no reason to expect the unreachable six are cleaner than the
readable eight. They are unreachable because they live in consoles
nobody opens, which is the same condition that hid G-35 for weeks.

**This is one sitting.** Four of the six are a single SQL query.

---

## First, the query that settles four of them at once

`app_setting` is a flat key/value table (`packages/schema/src/tables.ts:836`).
Against PRODUCTION, from the founder's machine:

```sql
SELECT key, value, updated_at FROM app_setting ORDER BY key;
```

Read the four rows below off that one result. Then, for the two knobs
that are supposed to be versioned, one more:

```sql
SELECT key, version, value, prior_value, reason, created_at
FROM app_setting_version ORDER BY key, version;
```

---

## 1. The visit reconciliation knob

**Asserted:** `visit_reconciliation` is set to `{"gapDays": 10}`, founder-set.
**Asserted where:** `WORK_QUEUE.md`, the seventh run's record and the
ninth run's, repeatedly, including the claim that Household Green "will
correctly flag on the {"gapDays":10} reconciliation knob".
**Settles it:** the `app_setting` query above.
**Ask:** does a row with key `visit_reconciliation` exist, and does its
value read exactly `{"gapDays": 10}`?
**If it is null or absent:** nothing has been flagging. Every
"the knob is working" observation in the record describes something
else.

## 2. The flag promotion threshold

**Asserted:** `flag_promotion.rateThreshold` is still **null**, and that
null is what keeps condition flags from promoting into prompts.
**Asserted where:** `WORK_QUEUE.md` W-5, "NOTHING promotes while
`flag_promotion.rateThreshold` is null (shipped default, knob shape
`{"minObservations": 3, "rateThreshold": null}`)".
**Settles it:** the same query.
**Ask:** does `flag_promotion` read `rateThreshold: null`?
**If it has a number in it:** promotion is live and was never
deliberately switched on. This is the one whose failure mode is
loudest, because it would put uncalibrated automatic prompts in front
of a HOM.

## 3. The capacity gate

**Asserted:** `capacity_gate` is at **version 1** carrying the v5 intake
ruling's figures (cap 5, band 3 to 5), attributed to the founder.
**Asserted where:** `WORK_QUEUE.md`, the 0055 entry and the ninth run's
post-deploy note.
**Settles it:** the `app_setting_version` query above, not the flat one.
**Ask:** is there exactly ONE version row for `capacity_gate`, is its
`value` the ruling's figures, and does `reason` cite the ruling? More
than one row means the cap moved, and a cap change is a two-key model
change before it is a config change.

## 4. The standards seed review gate

**Asserted:** `seed_reviewed` is still **false**, which is what keeps the
entire standards library dark for everyone.
**Asserted where:** `WORK_QUEUE.md` "Not software" item 1, "Column I of
the provision workbook is empty, so `seed_reviewed` stays false, so the
entire standards library renders nowhere for anyone."
**Settles it:** the same flat query.
**Ask:** is `seed_reviewed` false? **This one is worth reading in both
directions.** If it is somehow true, the library is rendering off an
unreviewed seed. If it is false, that is confirmation the 300-row floor
review really is still the blocker it is described as, which is worth
knowing before planning around it.

---

## 5. The Railway worker

**Asserted:** the worker is Git-connected and auto-deployed `b7026dd`,
so the swept sweep-template copy is live from the worker as well.
**Asserted where:** `WORK_QUEUE.md`, 2026-07-28, "founder confirmed in
the Railway dashboard". That confirmation is a month old and nothing
has re-read it since. **No Railway CLI or config exists in the
repository**, so the dashboard is the only control surface and no
automated check can ever see this.
**Settles it:** the Railway dashboard, the service's Deployments and
Settings pages.
**Ask three things:** (a) is the GitHub repository still connected? (b)
what commit is the currently running deployment built from, and is it
at or after `b7026dd`? (c) is the service actually running, as opposed
to connected but crashed or sleeping?
**Why it matters:** the worker runs the sweeps and the digest. If it
has been down, the absence of digests looks exactly like the absence of
anything worth sending.

## 6. The production KMS key

**Asserted:** the production `WK_KMS_KEY` decodes to 32 valid bytes.
**Asserted where:** `WORK_QUEUE.md`, the seventh run: "The health check
passing with the boot validation aboard proved the stored production
`WK_KMS_KEY` decodes to 32 valid bytes, the first time the key's shape
has ever been exercised."
**Settles it:** this one is genuinely still true and is the ONE of the
six with a live automated proof, so the honest ask is narrower.
`/api/health` returning ok means the app booted, and the boot validation
throws on a malformed key, so every green health check re-proves the
shape. **What is NOT proven by that is rotation.**
**Ask:** has `WK_KMS_KEY` been rotated since 2026-07-29? The record
says rotation "is still required (a key value entered a session
transcript on 2026-07-28)". If it has not been rotated, a key that was
exposed in a transcript is still the production key, and that is a
standing item, not a verification.
**Where:** `vercel.com/well-kept/wellkept/settings/environment-variables`,
the `WK_KMS_KEY` row's "Added on" date. If it still reads 18 or 19
July, no rotation has happened.

---

## What to bring back

For each of the six: the value read, and the date. Not "confirmed".
The value and the date, because "confirmed" is what the last month was
made of.
