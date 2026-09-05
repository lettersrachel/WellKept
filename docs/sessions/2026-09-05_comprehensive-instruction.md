---
status: living
---
# Session · 5 September 2026 · the comprehensive instruction

Frozen and manifested as `docs/COMPREHENSIVE_INSTRUCTION_2026-09-04.md`.
Worked in the order Part Eight sets.

## A CORRECTION I OWE, made before anything else

Earlier today I reported one red full-suite run as "consistent with the
known G-114 environmental shape" (accumulated consumer-less outbox rows),
noting that I had not caught the failing case. **That attribution was
wrong, and the evidence arrived when the same failure recurred here.**

Every failure in this run named `connect ECONNREFUSED 127.0.0.1:5432`.
**The container's Postgres stops under load**, which I have had to
restart twice in this session by hand. It has nothing to do with G-114's
outbox residue.

**What I did wrong is the part worth keeping.** I had a plausible known
cause in hand and a symptom that did not contradict it, and I named the
cause while saying I had not caught the failing case. Those two
sentences do not belong together: if I had not caught the case I had no
grounds to name a cause, and the hedge made the guess read as a
qualified diagnosis rather than as a guess. The rule this repository
already has covers it ("a re-flag names the build and the delta, or it
is not a re-flag"); the same applies to a cause. **Suite green after
restarting Postgres: 11 of 11 turbo tasks, 0 cached.**

## Already done, so it is not built twice (instruction line 115)

- **Part Six items 1, 2 and 3** are OPEN AS ROWS already, from your three
  raise additions earlier today: Q-11d (the demonstration path with its
  reset), Q-11e (the diligence evidence export), Q-11i (the investor
  view, reported as a split rather than a yes).
- **Part Six item 4's first clause is ANSWERED**, not owed: the metrics
  question was asked and answered earlier today in
  `docs/LEVERAGE_METRICS_STATUS.md`. One of the three renders
  (households per HOM); M-25 does not exist in code and arrives with
  Q-6-2; process minutes per verified outcome is blocked upstream by
  having no measured work rather than by a missing computation. **The
  row itself is still owed** and is not opened here, because item 4 says
  "if they do not, this row builds them" and two of the three cannot be
  built over data that does not exist yet.
- **Part Seven is ADOPTED**, in CLAUDE.md's tier bullet, with the two
  things it needs and does not have reported on Q-11s: no
  shadow-enablement mechanism exists in the tree, and which three test
  households is yours to name.
- **Part Six items 5 and 6** come from preparation batch item 12, which
  has not run yet; they are not opened twice here.

## Part Three, the security self-audit: DONE, nothing fixed

`docs/SECURITY_SELF_AUDIT_2026-09-05.md`. Twelve items, each with file
and line, split into five REAL findings, five VERIFIED GOOD, one
THEORETICAL pair, and one CLASS gap.

**Nothing was fixed**, per the instruction's own rule that behaviour
changes are reported first. Every REAL finding changes behaviour.

The one that matters most is finding 1: **the web magic-link entry point
carries no rate limit** while both mobile sign-in routes do, and the auth
config's own comment justifies a deliberately short (~40 bit) typeable
token with three legs, one of which is "rate-limited entry". The token
space still makes online guessing impractical, so the finding is not
that it is exploitable; it is that a control the code names as present
is absent on the primary surface, and that email-bombing through the web
form is unthrottled.

**The class gap became a row rather than a patch** (Q-11a), which is the
instruction's own stated preference: `action-permissions.test.ts` covers
server actions and its not-covered column already concedes API routes.
This audit walked all seventeen by hand and found every one correct, so
the guard would go green on its first run and would hold a property
currently held by nobody.

**Two routes are recorded as looking ungated and not being so**
(`api/exhibits/fleet`, `api/mobile/briefing`), because the next person
running this audit will make the same grep.

## The certification additions

**(1) Folded into Q-16's scope**, on the row rather than in a note: the
credential is a first-class object, with two-signature issuance, the
curriculum version certified against, the re-demonstration expiry, and
suspension and revocation as states rather than deletions; the trainer
credential takes the same shape. The row records why first-class matters
here rather than as tidiness: a credential inferred from records cannot
be suspended, cannot say what it was earned against, and cannot survive
the curriculum changing under it. WK-TRN-009 remains unwritten (G-110)
and is a prerequisite of the row, not of the object.

**(2) Reported, not built**:
`docs/EXTERNAL_CERTIFICATION_FEASIBILITY.md`. The answer is that ONE of
the four pieces is foreclosed and it is the load-bearing one:
`getStaffIdentity` (`session.ts:91-101`) derives staff identity from
`household_role_assignment` and returns null when a person holds none,
so **belonging to a household is how this system knows who anyone is**.
An external trainee belongs to none by definition, and giving them one
would put a stranger inside the mechanism tenant isolation rests on.

The other three: enrollment without a staff account is open and cheap
(`auth_user` carries no role, though **no audited identity-creation path
exists for anyone**, which this question surfaced rather than created);
the non-employee identity is G-111 met a fourth time and one step
further out than its three instances; payment is barred by ADR-004
rather than by architecture, which is a boundary question and gets
answered differently; and the scenario bank **already runs without a
real household** (`pnpm db:training`, resettable, `is_fixture`).

Three shapes for the inside-or-beside decision are set out with their
sizes, and none is recommended, because the choice is about whether
certification is a credential granted to the industry or an internal
capability and that is not visible from the schema.

## Next, in the instruction's order

Part Five items 1 and 2, then Parts One and Two, then Part Four.
