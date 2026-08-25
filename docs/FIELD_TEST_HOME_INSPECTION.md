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
5. **Role assignments**: as it ran, TWO were correct and expected:
   the granted corporate identity plus the founder's own pre-existing
   `house_manager` (the reason an alter identity was needed at all,
   step 4). After the step 5 revoke, one remains. A third identity, or
   any identity that is not the founder's, is a finding.
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
  queue nobody could open. **DISMISSED the same evening** with its
  reason recorded, as the ftc-admin identity (filing is corporate
  only, so the primary account saw the capture and no control).

## Step 5: the field role, revoked (25 August, evening)

The founder revoked her primary account's `house_manager` assignment
on Field Test Home through the audited path, again as the ftc-admin
identity: `revokeRole` refuses a self-target, so a single dual-role
account could not have done it, which is the alter identity earning
its keep a second time. `role_revoked` is on the trail.

What this does and does not do: Field Test Home leaves her field
surface, and Field Test Home still passes check 15 on the ftc-admin
corporate assignment. It does NOT answer G-65: /visit re-resolves to
the next field-role household by the same first-by-age rule, so the
arbitrary pointer moved rather than settled. The resolution rule
remains her decision between the three shapes in the register.
