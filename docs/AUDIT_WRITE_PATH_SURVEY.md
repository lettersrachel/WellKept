---
status: frozen
---
# Session AO: can the interface report success when nothing was written?

Read-only survey, 29 July 2026, from AUDIT_SURVEY_SESSIONS.md. Reports
only; nothing was changed. No wrapper is proposed here, per the brief.

## The count, before any analysis

**51 state-changing surfaces**, materially more than the brief's estimate
of eighteen:

- **37** server actions in `lib/actions.ts`
- **3** MFA actions in `app/mfa/actions.ts`
- **8** writing API routes (auth, dev trigger-pass, mobile notifications,
  mobile pair, push subscribe, mobile signin, signin verify, mobile
  upload, reveal, visit-commands, visit-commands/discard - eleven route
  files, of which three are auth/dev infrastructure)
- **3** scripts (`erase-household`, `ensure-smoke-fixture`,
  `archive-demo-data`)

The brief said the estimate shapes how much is worth automating. At 51,
per-surface remediation is not viable; whatever is done has to be
structural.

## The headline answer

**No surface in `lib/actions.ts` asserts success it has not performed.**
There is no code path that prints "saved" and then writes nothing. What
exists instead are three patterns of varying honesty, and the failure
mode observed in the wild (visit close, exclusion end) sits **outside**
the action code entirely - it is the request never arriving, which no
action-level check can catch.

## The three patterns actually in use

| Pattern | Count | Success signal | Failure signal | Audit row |
|---|---|---|---|---|
| **A. Audit, no verdict** | 24 | implicit (`revalidatePath`; the page re-renders with new state) | `refuse()` redirect to drill-in, `?refused=`, banner at top of page | yes |
| **B. Verdict, no audit** | 11 | `recordedTo()` -> `?recorded=<what>` banner | `refuseTo()` -> `?refused=` banner | **no** |
| **C. Neither** | 6 | implicit | **bare `return`, silent** | no |

Pattern A is the older corporate surface. Pattern B is the newer
field-and-capture surface (time, cost, observations, flags, deferrals,
paused decisions). **They are almost perfectly disjoint: exactly one
action (`createIncident`) does both.**

That disjointness is the survey's central structural finding. The
actions that can prove what they did write no verdict; the actions that
announce what they did leave no proof. Neither half is wrong on its own,
and no single author chose the split - it is an artefact of the surfaces
being built in different sessions.

### Pattern C, the six with neither (the real silent set)

`proposeEdit`, `logStrangerTest`, `recordPromptOutcome` use bare
`return` on every rejection. `queueGesture`, `gestureGate`,
`executeGesture` use `refuse()` for authorization but write no audit
row.

## Question 4: audit ordering

**Every audit-writing action is do-then-log.** There is no log-before-do
anywhere except the vault reveal, which is the documented invariant.
`setVaultValue` (the vault WRITE) is also do-then-log, which is correct:
the invariant protects reads, where no row must mean no value.

Nothing to flag. This was the question most likely to surface a
copy-paste of the vault pattern into places that get no benefit from it,
and it did not.

## Question 5: stale server actions

**The exposure is general, not specific to the two observed cases.**
Every one of the 40 server actions is reachable by a dead action id, and
none of them can detect it: the POST dies in the Next.js runtime before
any application code runs, so no guard inside an action can fire. G-37's
skew banner fires on refocus or within sixty seconds; a click inside
that window is exactly the observed signature.

This is the one exposure that a per-surface fix cannot address, and it
is the mechanism most consistent with both the visit-close false success
and the two exclusion-end false successes.

## The four specific checks

### 1. Client-facing writes (the brief's priority)

**The client-facing path is the SAFEST in the codebase, and it is the
best existing model.**

`proposeEdit` is the only client write. Its confirmation is not
asserted by the action at all - the client page renders

    {pending ? "Your suggested update is with your house manager." : <form/>}

where `pending` is derived from `getPendingEdits`, i.e. **from the row
itself**. A proposal that was not written leaves `pending` false and the
form still standing. The success message is therefore true at the moment
it is shown, by construction, and cannot be shown without the row.

The allowlist (`isClientEditable`) gates the form in the UI as well as
in the action, so the most common rejection path is unreachable rather
than silent.

**Answer to the brief's priority question: no, client requests have not
been silently dropping into a false confirmation.** The residual gap is
the inverse and much smaller: on a genuine failure the client sees an
unchanged form with no explanation. The client page renders no verdict
at all (its `searchParams` type is `{ q?: string }`; there is no
`refused` or `recorded` handling and no `RefusalBanner`).

### 2. Notification and email writes

**Nothing records "sent" - truthfully or otherwise.** The client visit
report and the WATCH alert (`api/visit-commands/route.ts`) call
`sendMail` inside try/catch that logs and continues, by design ("a mail
failure never un-applies the visit"). The weekly digest counts sends in
memory and logs. `notification` rows record an in-app notification's
creation, not a delivery; push is best-effort with `.catch(() => {})`.

So there is no false delivery claim anywhere. The exposure is the
opposite: **the one email that reaches clients has no durable record of
having been attempted or delivered.** Given a Resend message has already
come back marked delivered and never arrived, a client saying "I never
got my report" cannot be answered from the database today.

### 3. Script and direct-SQL state changes

Three scripts. **`erase-household.mjs` writes an audit row** (and
deliberately preserves `audit_event`, scrubbing detail only under
`--scrub-audit-detail`). **`ensure-smoke-fixture.mjs` and
`archive-demo-data.mjs` write none** - defensible for the fixture
seeder, less so for archiving.

Beyond scripts, the class G-54 exposed is broader: any state change
performed by direct SQL has nowhere to log by definition. Today's MFA
recovery (TOTP secret, backup codes, and ten sessions deleted) is
invisible to the trail. There is no mechanism that would make a
hand-run statement auditable, and inventing one is out of scope here.

### 4. Consistency, and the best existing model

Three patterns, disjoint, none dominant. The best model is **not** any
action in `lib/actions.ts` - it is the client playbook's
`pending`-derived confirmation, because it is the only success signal in
the app that **cannot be shown unless the write happened**. Every
verdict-based pattern (A and B alike) asserts an outcome the action
believes; the client pattern reads the outcome back.

If anything is extracted later, that is the property to extract, and the
client page is where it already exists.

## Exposures, ranked (client-facing first, per the brief)

1. **Client visit-report delivery is unrecorded** (client-facing).
   No row anywhere says a report was attempted or delivered. A client
   dispute is unanswerable from the record.
2. **Client failures are unexplained** (client-facing, low severity).
   No false success, but a rejected proposal looks like an unsubmitted
   one.
3. **Stale server actions are a general exposure** (all 40 actions).
   Undetectable from inside an action; the leading candidate for all
   three observed false successes.
4. **Pattern B's eleven actions leave no audit row.** Time entries,
   cost entries, observations, condition flags, deferral and paused
   decision resolutions - all announce success, none can prove it.
5. **Pattern C's six actions are silent on failure.** Of these
   `recordPromptOutcome` matters most: it feeds rule-health metrics, so
   a silent drop biases a calibration input.
6. **Direct-SQL and two of three scripts write nothing** (the G-54
   class).

## What this survey does not answer

Whether a wrapper is warranted, and what it should do - deliberately out
of scope per the brief. Two facts bear on that decision: the count is 51,
and the most reliable pattern found works by reading state back rather
than by reporting intent.

## Addendum: the doctrine line tested against the other escape hatches

The G-54 line ("a recovery path is only real if it can be reached from
the state it exists to recover from") was tested against the three the
brief named, while it was fresh. Read-only; each is a finding, not a fix.

**1. ADR-005's second-custody retrieval: PASSES, by design, and this is
the one that was thought about.** The mechanism is a sealed physical
envelope in counsel's safe, so retrieval depends on no software at all.
The guardrail that no real s3 value enters the vault until the sealed
copy exists is the same idea stated forward. Note the retrieval
condition, mechanism, and custodian are still bracketed as PROPOSED, so
the hatch is designed-but-not-installed: today there is no second copy,
which is a stronger version of the same exposure and already tracked.

**2. The erasure dry run: FAILS the test in its strictest reading.** It
needs `DATABASE_URL` and a live Postgres connection (`pg.Client`, line
105). It exists to answer "what would erasure remove for this
household", and it cannot answer at all when the database is the thing
that is broken. In fairness that is close to inherent - a plan computed
from counts must read the counts - but it means the tool is a
service-quality instrument, not a disaster instrument, and nothing
records that distinction where an operator would look.

**3. The restore runbook: FAILS.** It lives in `docs/` inside the
repository (referenced from LAUNCH.md and CUSTODY_SITTING.md), which
means reading it requires a working checkout. That is exactly the shape
G-54 had: the instructions for recovering are stored behind the thing
that may be unavailable. Cheap to fix and not fixed here - a printed or
externally-hosted copy, verified on the same cadence ADR-005 already
specifies for the sealed key.

Two of three fail. The pattern is consistent enough to be worth stating
plainly: **every recovery mechanism in this system so far was written
by someone imagining the healthy system, and the one that passes
(ADR-005) passes because it was deliberately taken out of software.**
