---
status: living
---
# The dependency map from today to E1, and the critical path

**Preparation batch item 2, 4 September 2026.** Every queue item, founder task
and corporate task that gates another, with lead times where they exist, and
the critical path stated explicitly.

**The instruction asked to be told where the hand reconstruction is probably
wrong.** Section 5 is that, and it is the section to read first if you read only
one: **four of the corrections change the ORDER of things, not just their
dates.**

**What this page is built from**, so its own reliability is legible: the
repository. `E1_READINESS.md` for the conditions, `BUILD_QUEUE.md` for the
items, the custody checklist, the staging status and runbook, the two ruling
files. **Two of the four sources E1's conditions come from are NOT in the
repository** (the v7.0 model, WK-FIN-012), so every lead time below that is not
in the tree is marked as carried from the founder's own statement rather than
verified. A map that hid that distinction would be more useful-looking and less
usable.

---

## 1. The shape of the answer

**The critical path does not run through engineering.** It runs through
formation and staging, and the build is not on it today.

```
  founder agreements
        |
        v
  LLC FORMATION ------------------> accounts in the entity's name
        |                                   |
        |                                   v
        |                            custody transfer (GitHub, Vercel, Neon)
        |                                   |
        v                                   |
  insurance bound                           |
                                            |
  STAGING STOOD UP (6 dashboard ops) -------+
        |                                   |
        v                                   v
  SECURITY ASSESSOR ENGAGED ------> AUDIT RUNS ----> remediation ----> RETEST
                                                                        |
                                                                        v
                                                          real household data permitted
                                                                        |
                                                                        v
                                                       member on the digest for a month
                                                                        |
                                                                        v
                                                                       E1
```

**Read that bottom stretch carefully, because it is the part a schedule usually
gets wrong.** The last three steps are STRICTLY SEQUENTIAL and each has a
calendar cost that cannot be compressed by working harder: the retest follows
remediation, real data follows the retest, and the month on the digest follows
the first real member. **That is a minimum of roughly six weeks of pure waiting
AFTER the audit passes**, and none of it starts until staging exists.

---

## 2. Founder and corporate tasks, with lead times

| Task | Lead time | Source of the lead time | Gates |
|---|---|---|---|
| Founder agreements | unknown | not in the tree | LLC formation |
| **LLC formation** | unknown | not in the tree | accounts in the entity's name; custody transfer; insurance; payroll |
| **Staging stood up** | six dashboard operations | `STAGING_STATUS_2026-08-28.md` | **the entire security audit** (ADR-007 makes staging its only venue) |
| Assessor engaged | unknown | not in the tree | the audit |
| Insurance bound | unknown, "same broker call" | `WORK_QUEUE.md` not-software item 3 | first household signature |
| Payroll live | unknown | not in the tree | employment |
| A2P registration | **two to four weeks** | founder's own statement, carried | any SMS channel |
| Custody transfer | after formation | `CUSTODY_TRANSFER_CHECKLIST_2026-08-28.md` | "code and accounts in the company's name" |
| Neon restore drill | one sitting | the checklist, which says do it BEFORE touching the database account | safe custody transfer |
| The 300-row floor review | "an afternoon, not a week" | `WORK_QUEUE.md` not-software item 1 | **everything provision-related, which is dark until it runs** |
| COO hire | unknown | not in the tree | the accessibility trigger; the Decision Rights review; WK-TRN-009 |

**The two shortest items on this list gate the most.** Staging is six dashboard
operations and gates the audit, which gates everything after it. The floor
review is an afternoon and the entire standards library renders nowhere for
anyone until it happens. **Neither is on anybody's critical path in the sense of
being hard; both are on it in the sense of being undone.**

---

## 3. Engineering, and why it is not the constraint

E1 is gated on the launch-critical tier ONLY (the 3 September tier ruling,
adopted in CLAUDE.md). The queue is the tracker.

**The engineering dependencies that actually bind, as distinct from the ones
that merely follow each other:**

| Item | Blocked by | Kind of block |
|---|---|---|
| Q-11t Foundation Reset | WK-SVC-004 not in the repository | **intake**, not engineering |
| Q-7 | the A129 intake | **intake** |
| Q-6 and Q-8b/Q-9 member halves | the 25 September two-key freeze decision | **decision** |
| Q-11c contact ceiling | nothing, as of the 5 September ruling | was a decision, now unblocked |
| Q-11r restricted-access class | nothing in engineering | **it is specified already** (WK-SEC-001 test area 3) |
| Q-11g leverage metrics, M-25 half | Q-6-2 | **engineering**, genuinely |
| Q-11g, process-minutes half | the unresolved ExecutionActual conflict | **decision** |
| Q-11s shadow enablement | which three households, founder-named | **decision**, one sentence |
| WL Gate 2 estimator | Task Inventory adoption, founder verdicts | **decision** |

**Count the kinds rather than the items.** Of nine blocked things, **one is
blocked by engineering**. Four are blocked on a decision that is one sentence
each, three on an intake, one on a two-key date already fixed.

**So the honest read is that the build is not the bottleneck and has not been
for some time**, and adding engineering capacity would not move E1. What moves
E1 is formation, six dashboard clicks, and a handful of sentences.

---

## 4. The critical path, stated as one sequence

**Longest chain, each link genuinely gating the next:**

1. Founder agreements
2. **LLC formation** (unknown, and everything commercial hangs off it)
3. Accounts opened in the entity's name; **S3 and KMS specifically**, which the
   28 August staging ruling names as the exception that must be clean from the
   start, since a photo written to a contractor bucket is a photo to move and
   the KEK is the vault's root of trust
4. Custody transfer, **after** the Neon restore drill
5. **Staging stood up** (six operations; can run in PARALLEL with 1 to 4 under
   the 28 August ruling, which is exactly why that ruling exists)
6. Assessor engaged
7. **The audit runs** (staging is its only venue)
8. Remediation of critical and high findings
9. **Retest confirming closure**
10. Real household data becomes permissible
11. **A real member on the digest for a month**
12. Thirty stable worker days (may overlap 10 to 11)
13. **E1**

**The parallelism worth using:** step 5 does not wait for steps 1 to 4. The 28
August ruling put staging under contractor-held accounts precisely so that all
seven Phase 1 deliverables would not sit behind formation. **That ruling is the
single largest schedule decision in this map and it is already made.** What it
bought is only realised if staging actually goes up before formation completes.

**The parallelism NOT available, and this is where schedules usually go wrong:**
steps 9, 10 and 11 cannot overlap. The month on the digest cannot start early
"with a friendly household", because Household Zero forbids real household data
before the security test passes. That is a rule, not a preference.

---

## 5. Where the hand reconstruction is probably wrong

The instruction asked for this directly. **Six corrections, ordered by how much
they change the plan.**

**1. Staging is not a Phase 1 task among others; it is the gate on the entire
audit.** ADR-007 makes staging the audit's only venue, so six dashboard
operations sit in front of every security deliverable, the retest, and
everything downstream of the retest. **Anyone mentally scheduling the audit
without scheduling staging first has the order wrong**, and the gap between
"six clicks" and "gates a quarter" is exactly the kind of thing a hand
reconstruction misses because the task is small.

**2. The last three conditions are sequential and add roughly six weeks after a
PASSING audit.** Retest, then real data, then a month of digest. A plan that
treats E1 as "audit passes plus a bit" is short by about six weeks, and none of
that time is recoverable by effort.

**3. Insurance and payroll may not be E1 gates at all.** They are on the
founder's list; **nothing in the repository makes either an E1 condition**.
ADR-004 puts payroll in QuickBooks and bars the app from computing one, so it is
entirely company-side. Whether they gate E1 is what WK-FIN-012 would say, and
WK-FIN-012 is not in the tree. **Carrying them as gates when they may be
parallel obligations makes the path look longer than it is**, which is the
opposite of the usual error and worth as much.

**4. "Code and accounts in the company's name" is sequenced, not outstanding.**
It is blocked on formation and nothing else, so it is not a task to work, it is
a consequence to trigger. The checklist already names its trigger. **It should
not appear on a to-do list at all**, and treating it as one makes formation look
like it has a tail it does not have.

**5. Two of the four sources are not in the repository, so this map cannot be
complete and neither can E1_READINESS.** The v7.0 model and WK-FIN-012 are cited
as E1's conditions and appear nowhere in the tree. **Under the intake rule
neither is a build authority yet.** The condition "and whatever else the sources
actually name" is unanswerable until they land, so **no reader should treat
either page as a complete list of E1's gates**, and the honest reconstruction
error is over-confidence rather than a wrong item.

**6. The 300-row floor review is not on the E1 path and is probably being
under-weighted anyway.** It gates nothing in this map, and **the entire
standards library renders nowhere for anyone until it runs**, which means every
provision-dependent surface is dark for the COO's first weeks. An afternoon that
unblocks a whole subsystem is worth scheduling ahead of things that feel more
urgent.

---

## 6. What would move E1 soonest, if the question is asked that way

**In order of effect per hour spent**, and this ordering is the map's actual
recommendation:

1. **Stand up staging.** Six operations, unblocks the audit, needs no entity.
2. **Engage an assessor now, conditionally.** The engagement can be arranged
   before staging exists; the audit cannot run before it. Serialising the
   procurement behind staging adds its full lead time for no reason.
3. **Answer the four one-sentence decisions** that are blocking queue rows: the
   three shadow households, the ExecutionActual conflict, the Task Inventory
   verdicts, and the tz NOT NULL confirmation.
4. **Intake the v7.0 model and WK-FIN-012**, because until then nobody can say
   what E1 requires, and this map has a hole in it shaped like those two
   documents.
5. **Run the floor review**, which is off the critical path and unblocks
   everything provision-shaped.

**Nothing on that list is an engineering task**, which is the finding of this
whole document rather than an aside in it.
