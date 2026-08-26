---
status: living
---

# Field Test Home: grant-and-inspect (register A581 item 1)

Disposition confirmed by the founder 25 August 2026: GRANT-AND-INSPECT.
Household `d05ab5a2-7d9c-4cff-919a-250adafa0355` ("Field Test Home") is
the one check-15 orphan: no corporate role holds it, so no corporate
operator can reach its drill-in, and it carries the G-52 stuck command
from early field testing. This document is the walkthrough for the
founder's inspection session.

## Step 1: the audited grant (founder runs, production)

    DATABASE_URL=<by name> pnpm db:grant \
      --household d05ab5a2-7d9c-4cff-919a-250adafa0355 \
      --email <founder corporate login> \
      --by <founder corporate login> \
      --reason "A581 item 1: grant-and-inspect the check-15 orphan (Field Test Home)"

The script is the assignRole act from outside (the app cannot reach an
unreachable drill-in): assignment + minted ADR-006 subject token +
role_assigned audit row carrying the reason. Proven locally in five
refusing directions and the accepting one before it shipped; a re-run
is a polite no-op. ndaApproved stays false (conservative; corporate s3
access is unaffected by NDA mode).

## Step 2: the contents walkthrough (read-only)

After the grant, the drill-in opens like any household. Look at, in
order, and note anything surprising:

1. **The header**: name, tier, status tag, is_fixture (expected FALSE,
   which is part of why it was invisible rather than excluded).
2. **Playbook fields**: how many, which sections, whether any value
   looks like real household data rather than test content. This is
   the question that decides the disposition.
3. **Visit history**: applied visit commands, if any, and the G-52
   stuck command's trail (the register expects a same-day CONFLICT row
   if a drain ever completed; confirm what actually stands).
4. **Incidents, photos, vault items**: expected none or test-only;
   a vault_item row would raise the stakes of the disposition.
5. **Role assignments**: ONE is correct and expected, and one is what
   stands as of 25 Aug 23:28: the granted corporate identity alone. The
   founder's own pre-existing `house_manager` (the reason an alter
   identity was needed at all, step 4) was revoked and verified, step 5.
   A second field-role identity, or any identity that is not the
   founder's, is a finding.
6. **The audit trail**: what the household's history says about who
   touched it and when it went quiet.

The founder's local session can pull the same as queries if the
drill-in read raises questions; everything here is read-only.

## Step 3: the disposition (founder decision, after inspection)

- **Test-content only, worth keeping as a scratch tenant**: flag
  `is_fixture=true` (a reviewed change; it then dims, leaves fleet
  counts, and stops flagging on the reconciliation knob).
- **Test-content only, not worth keeping**: the erasure tool's
  standard counsel-and-founder path. The standing rule holds: dry run
  only from any development session; a `--commit` is the founder's own
  deliberate act after reading the plan twice.
- **Anything that looks like real data**: stop and treat it as its own
  question; nothing proceeds on a guess.

## Step 4: closing the loop

**DONE 25 August 2026, evening.** The founder ran the grant in
production: `lettersrachel+ftc-admin@gmail.com` holds corporate_admin
on Field Test Home, `ndaApproved` false as designed, the
`audit_subject_token` minted (32a207a2, kind=email) and the
`role_assigned` row carrying `provisionedVia: db:grant` with the
register citation in its reason. The census then read **no household
without a corporate holder**, so the check-15 allowlist entry came out
of tooling/smoke-mechanical.sh and the allowlist is empty again: the
first exception was disposed of, not carried.

An alter identity was used rather than the founder's own login, which
is the right call and worth recording: her primary account already
holds `house_manager` on this household, and the one-role index
constrains (user, household), so a corporate grant to the same user
would have collided with her field role. Two users, two roles, no
index change, and the audit reads honestly on both.

**One unaudited write, recorded rather than papered over:** the
grantee's `auth_user` row was inserted directly, because `db:grant`
deliberately refuses to create people and `auth_user` has no household
to attach an audit row to. There is no audited path for creating an
identity today. That is a real gap in the trail, small and known; if a
second one ever appears, the fix is an identity-creation act that
attributes to the corporate actor rather than a script that quietly
creates people.

## What the inspection found on arrival (25 August)

Two facts from the founder's first reachable look, both recorded here
so the disposition decision has them:

- The household's oldest rows are a **July import of 258 template
  fields**: a fully provisioned tenant that no corporate operator
  could see for a month. This is the strongest argument the check-15
  census could have been given for existing.
- A **capture_artifact written 16:41 on 25 August as house_manager**,
  which is the founder's own Tell Well Kept test from the section 4
  sitting: /visit resolved to this household (see G-65), so the
  sitting's "test capture awaiting dismissal" was sitting here, in a
  queue nobody could open. A dismissal was attempted the same evening
  as the ftc-admin identity and reported clean, but it is UNVERIFIED:
  the revoke attempted in the same sitting turned out not to have
  written, so this one is not claimed until its own audit row is read.
  (Filing is corporate only, so the primary account sees the capture
  and no control, which is not the failure mode here.)

## Step 5: the field role, revoked on the SECOND attempt (25 August)

**The first attempt did not write, and that correction is kept in place
rather than rewritten away, because it is the more useful half of the
story.** The founder reported the action clean, and this document, the
weekly note, and G-65's interim line all recorded it as done. A
verification query the same evening found the truth: `role_revoked`
rows on this household numbered ZERO, and `lettersrachel@gmail.com`
still held `house_manager` (assignment aa4b7053). The screen said one
thing and the trail said another; the trail wins, which is the whole
reason the standing rule reads query the database, never trust the
screen.

**The retry wrote, verified 25 Aug 23:28:59.** Field-role assignments
on this household: zero. Assignment aa4b7053 is gone and a
`role_revoked` audit row stands behind it, actor corporate_admin. The
household is corporate only now, which keeps it passing check 15 on the
ftc-admin assignment and takes it off the founder's field surface, so
/visit resolves elsewhere for her. G-65's resolution RULE is untouched
and still open.

That the same click worked minutes later with no code change is
evidence and not a closure: it rules out a systematic server fault in
`revokeRole` and leaves the transient client-side causes standing. See
G-67, which stays open, and whose other half (the capture dismissal)
has still not been re-attempted.

Not a permissions problem: the Revoke control renders whenever the
viewer is corporate_admin on the household and the row is not their
own, both true for the ftc-admin identity here, and every refusal path
in `revokeRole` redirects to a VISIBLE banner. A clean-looking click
that wrote nothing is the documented stale-server-action hazard
(DEPLOY.md's own sharp edge) or a click that never landed on that
control. The cheap retry-with-verification RAN and wrote (above), which
narrows the cause without settling it; the decisive test, whether a
POST leaves the browser at all, is still owed and now harder to gather,
since the state that produced the silence is gone.

So Field Test Home is a corporate-only household: one assignment, no
house manager, no backup. It is off the founder's field surface, and
G-65's resolution rule is untouched and still open.

**Rider from the same verification, now G-69, filed and fixed:** that
first `role_revoked` row carried `assignmentId` and nothing else, and
the assignment it names is deleted by the same action, so the trail
could not say whose role ended or which one. `revokeRole` now reads its
subject before the delete and records the role, the NDA standing, and
an ADR-006 subject token, matching what `role_assigned` has carried
since G-59. Whether a revocation should also require a REASON stays a
founder decision.

## Step 6: the capture, dismissed and verified (26 August)

The sitting's last remainder is closed. The artifact moved `captured` to
`dismissed` at 09:42:04 on 26 August with all four fields set together
(status, disposition, filed_by, filed_at) and `work_item_id` correctly
NULL, since a dismissal files nothing into work. Verified by query, not
by screen; the confirmation banner and the ninety-second brief's
"0 capture(s) awaiting the router" agreed from two separate reads.

The disposition answers the question the first look could not: the
artifact was never a stuck flow. It was a test capture nobody had gone
back to.

**Worth remembering when this row is read later, because it looks like
two people and it was one.** `captured_by` is the founder's primary
identity acting as house_manager; `filed_by` is the ftc-admin alter
identity acting as corporate_admin. Same human, two user ids, and the
trail records both honestly because that is what actually happened. It
is also the grant from the day before being used for exactly what it was
created for: the artifact was unreachable by any corporate operator
until that grant existed. This is the cost of the one-role index and the
AJ option-1 trade, now visible in a production row rather than a design
note.

Also true and worth stating once: `capture_artifact` has held exactly
one row in its production life, and that row has now completed its whole
lifecycle. The file-into-work-item path is unexercised outside tests.
