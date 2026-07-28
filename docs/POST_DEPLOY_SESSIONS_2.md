---
status: living
---
# Post-deploy review, round two: Claude Code sessions

Prepared 27 July 2026, from the review of `WK_REVIEW_RESPONSE_20260727.md`.
Follows `POST_DEPLOY_SESSIONS.md`, whose four sessions all landed.

**Paste one session at a time**, with the standing rules from
`POST_DEPLOY_SESSIONS.md`, which still apply unchanged. Six sessions. Two are
read-only, one is verification, three are changes.

**Two corrections carried from the review, for whoever reads this cold.**

Session A's world-one verdict is accepted. The evidence was the right evidence.
The reviewer's own framing was wrong: a shared transaction would be *worse* here,
because a decrypt failure inside it would roll the audit row back, which is the
unsafe direction. Ordering plus fail-closed produces over-logging instead. Do not
"improve" this into a transaction.

Session A verified the sole **writer** of reveal-kind audit rows. The invariant
actually depends on the sole **caller** of the decrypt function. Those are
different searches and only the second closes the hole. That is session E.

**The founder critical path is unchanged** and is not restated here. See §3 of the
response document.

---

## Session E. Decrypt callers, and two open questions

**Read-only. Highest priority in this file.**

**Why.** If any path other than the audited reveal route can unwrap a vault
value, it bypasses the audit entirely, and correctness in the reveal route does
not matter. Session A proved nothing else *writes* reveal rows. It did not prove
nothing else *decrypts*.

**Questions to answer, with evidence:**

1. Identify every decrypt or unwrap function in the vault module, including any
   lower-level primitive the higher-level ones call.
2. Repo-wide, find every caller of each. Classify each caller as: the audited
   reveal route, a justified exception, or unaccounted for.
3. Check these specifically, because each is a plausible bypass:
   - `db:rewrap-kek`, which by definition decrypts every vault row.
   - `erase-household.mjs`. Does it read values before deleting them, for
     example to log what it is removing, or does it delete blind?
   - Any export, backfill, migration, or seed script.
   - Any debug or admin route, including anything dev-gated.
   - Any test helper or fixture builder that could execute against a non-test
     database.
4. For each justified exception, state whether it constitutes plaintext access to
   secured values, and whether the privacy notice's description of who can see
   secured items covers it. A re-wrap is probably not a "reveal" and probably
   should not write a reveal row, but it is still access and the disclosure
   should account for it.

**Also answer, in the same session:**

5. **The over-logging case, evidentially.** Fail-closed means a row can commit for
   a reveal whose decrypt then failed. That is safe in the security sense and
   correct as a design. It is not costless as evidence: the audit trail is a
   business record for disputes, and a row asserting someone revealed an alarm
   code when the decrypt failed records something that did not happen. Report
   whether any status or outcome field distinguishes attempted from successful
   reveals. Do not build one; report what exists and what adding one would touch.

6. **G-33's disposition.** The response says G-33 and G-34 do not share a cause,
   which is not a disposition for G-33. Given one writer, firing only on explicit
   action, an extra `s3_corporate_view` row is either a mis-observation from the
   same day that produced other retracted screen reports, or something
   unaccounted for. Determine which, or state plainly that it cannot be
   determined and should be closed as unreproducible. Right now it is neither
   open nor closed.

**Report only.** If a bypass exists, the fix deserves its own session.

---

## Session F. Exercise the two untested destructive paths

**Verification. Requires explicit founder authorization before starting.**

**Why.** `--erase-time-and-costs` and `--erase-membership-history` shipped today.
The dry run exercised the default path only. The two flags that actually destroy
data have never run, and they are the paths where a mistake is unrecoverable.

**The standing rule says never run the erasure tool with `--commit`.** That rule
exists to protect real data, and it should not be waived on production. Two safe
ways to verify:

- **Preferred: an integration test with rollback.** Run the erasure logic inside a
  transaction that is rolled back, asserting row counts before and after. Nothing
  is destroyed and the test runs forever in CI. This may require making the script
  importable rather than only executable; report if so.
- **Alternative: a Neon branch.** Branch production, run the flags with `--commit`
  against the branch only, verify, delete the branch. Never against the production
  branch. This is the one authorized exception and it does not generalize.

Report which is feasible before doing either.

**Verify for each flag:** the row counts destroyed match the plan the dry run
printed, the audit trail records the flag that was passed, nothing outside the
targeted household is touched, and the open-incident refusal still fires when the
flag is present. That last one matters: a new flag is exactly how a guard gets
bypassed by accident.

---

## Session G. Legal document drift, round two

**Small. Documents only.**

Standing rule 7 fired on the G-40 commit and was half-applied: the counsel packet
was updated, the privacy notice was not. This is the same drift pattern G-40 was
created to prevent, one commit later.

1. **The notice's retention section** names incident records and the audit log as
   kept by default. Three more categories are now kept by default: time entries,
   cost entries, and membership events. Add them, in the notice's own plain
   language.
2. **Session B's "one wording gap"** for receipt photos was noted in the findings
   and never landed. Land it.
3. **Reframe the time and cost retention default in the counsel packet.** It is
   currently presented as a choice the builder made for counsel to confirm. It is
   more likely an obligation: federal wage and hour rules generally require
   retention of time and payroll records for a period of years, and tax
   substantiation drives the same answer for costs. Rewrite question (a) as "we
   believe we are required to retain these; confirm the period and whether a
   household deletion request changes it." Asking counsel to confirm an obligation
   is a different and stronger question than asking them to bless a preference.
   Do not assert the legal position as settled; frame it as the founder's
   understanding, for counsel to correct.

---

## Session H. Split referral note from referral channel

**Small code change. Needs founder decision first: see decisions below.**

**Why.** The erasure default currently clears both the referral note and the
referral source. Clearing the note is right, since it frequently names a third
party who may be a current client. Clearing the channel is not.

Session 3 existed to make LTV to CAC computable. If deleted households drop out of
channel attribution, the acquisition history degrades silently with every
deletion, and the surviving view is biased toward households that stayed. That is
the worst kind of data error: it looks complete and is not. The channel is a fact
about your marketing. The note is personal data about a person.

**Scope.** In `erase-household.mjs`, clear `referral_note`, retain
`referral_source`. Update the plan output so the distinction is visible in a dry
run. Update the counsel packet's erasure defaults to describe the split and ask
counsel to confirm that retaining a channel category with no identifying detail is
acceptable.

---

## Session I. Enumerate the staff data surface

**Read-only. Feeds the G-13 disclosure, which now gates hiring.**

**Why.** G-41 correctly reframed G-13 as a gate on hiring, but the item that
triggered it, `time_entry`, is the smallest part of the surface. The audit trail
is the largest, and it has been there since the beginning: every action a House
Manager takes, attributed by name, append-only, permanent.

**Produce a complete inventory** of everything the system records about a staff
member, as input to writing the disclosure page. At minimum, check: the audit
trail, TOTP enrollment, assignment history, authored visit reports and dots,
incident reports carrying who logged them, time entries, cost entries recorded by
them, and `prompt_outcome` rows.

**Call out `prompt_outcome` specifically.** `was_news` and `dismiss_reason` are a
record of a staff member's judgment calls. Nothing today computes a per-user act
rate, but `rule_health` already carries `minUsers`, so outcomes are
user-attributed and the data fully supports performance inference even though no
surface performs it. A disclosure that says what is recorded but not what it could
be used for is only half honest.

**For each item report:** what is captured, how long it is kept, who can see it,
and whether it could support a performance or productivity inference today or
with a small change. Do not write the disclosure; that is a founder document.

---

## Session J. Make the erasure rule a guard rather than a policy

**Structural. The most durable item in this file.**

The new standing rule, that a data category ships with its erasure treatment or it
does not ship, is the right conclusion drawn from the right failure. As written it
depends on someone remembering, which is what the previous rule depended on, one
commit before it was half-applied.

It is mechanically checkable. Enumerate every table carrying a household
reference, assert each appears in `erase-household.mjs`, and fail CI otherwise,
with an explicit allowlist for deliberate exceptions where each entry carries a
written reason.

This is the same move G-37 made for version skew: a class of failure detected
automatically rather than a specific instance fixed. That is why the skew fix has
held, and it is why this one will.

---

## Decisions needed before some of the above

1. **Referral split (session H).** Confirm the reasoning, or say why the channel
   should also be cleared.
2. **Mileage fields and erasure, an unflagged interaction between G-46 and G-40.**
   If `purpose` and `destination` columns are added for IRS substantiation, those
   fields exist precisely to survive scrutiny years later, so blanking them on
   erasure destroys what they were added for. But destination is usually the
   household's address, which is what erasure exists to remove. Decide this before
   the columns are added, not after, and it is a good question for the same
   counsel conversation.
3. **Authorization for session F**, and which of the two safe methods.
