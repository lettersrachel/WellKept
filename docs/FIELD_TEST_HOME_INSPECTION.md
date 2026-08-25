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
5. **Role assignments**: after the grant, expect exactly one (the
   founder). Any other identity is a finding.
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

Once the grant has run in production, the check-15 allowlist entry for
`d05ab5a2` comes OUT of tooling/smoke-mechanical.sh (the household
holds a corporate role and passes the census on its own); the removal
rides the next repo session after the founder confirms the run, and
the weekly note records the grant's audit reference per the proceed
instructions.
