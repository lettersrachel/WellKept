---
status: living
---
# The custody sitting — one afternoon, everything G-01 needs

Prepared 2026-07-27 so the counsel meeting is turnkey. This closes the
register's most serious item (G-01), the ADR-005 brackets, and the counsel
packet's seven questions in ONE sitting. Nothing here is done until you do
it — this is the checklist, not the deed.

## Bring

1. **The sealed envelope**: `WK_KMS_KEY` and `AUTH_SECRET`, printed, in a
   sealed envelope you prepare the same day (copy the values from your
   password manager; never email or message them; shred any working paper).
2. **The counsel packet**: `docs/legal/COUNSEL_PACKET.md` printed or
   shared, plus the four drafts (`household-consent.md`,
   `privacy-notice.md`, `staff-confidentiality.md`,
   `staff-records-disclosure.md`).
3. **A laptop that can reach Neon and the repo** — the rewrap drill and
   the restore drill happen the same afternoon, while everything is fresh.

## At the meeting — decisions to write down (the ADR-005 brackets)

- **Second custodian:** who holds the sealed copy. Counsel-held is the
  default recommendation (this meeting makes it true the same day);
  Kelly-held is the alternative the register names.
- **Sealed mechanism:** e.g. "sealed envelope in counsel's safe, tamper
  marks initialed" — write what is actually done, not a template.
- **Retrieval condition:** under what circumstances the seal is broken
  (e.g. "written request from Rachel, or her documented incapacity plus a
  corporate officer's request"). This sentence is the whole point.

Fill the brackets in `docs/adr/005-key-custody.md`, date it, and move it
from "Accepted in part" to Accepted.

## Same sitting, after the meeting — the three drills

**Rewrap drill (proves the key can rotate and BOTH custodies update):**

    # dry run first — prints the plan, writes nothing
    DATABASE_URL=<throwaway Neon branch> pnpm --filter @wellkept/schema db:rewrap-kek
    # then one real run ON THE THROWAWAY BRANCH only
    DATABASE_URL=<throwaway branch> pnpm --filter @wellkept/schema db:rewrap-kek -- --commit

  Create the throwaway branch in Neon first: dashboard → Branches → New
  branch (from production, any name — delete it after). The tool's final
  line on --commit says "update BOTH custody copies (ADR-005)" — on the
  drill this is rehearsal; on a real rotation it is the law.

**Erasure flag drill (review round two, session F — proves the two
destructive erasure flags do what the dry-run plan says, on the SAME
throwaway branch):**

    # dry run first — read the plan it prints, note the row counts
    cd apps/web
    DATABASE_URL=<throwaway branch> node scripts/erase-household.mjs <smoke-fixture-household-id> --erase-time-and-costs --erase-membership-history
    # then commit AGAINST THE THROWAWAY BRANCH ONLY
    DATABASE_URL=<throwaway branch> node scripts/erase-household.mjs <smoke-fixture-household-id> --erase-time-and-costs --erase-membership-history --commit

  This is the ONE authorized exception to "never run the erasure tool
  with --commit," it applies to a throwaway Neon branch only, and it does
  not generalize. Verify four things, per the session F brief: (1) the
  destroyed row counts match the dry run's plan; (2) the erasure audit
  row records both flags that were passed; (3) nothing outside the target
  household changed (spot-check another household's time/cost/membership
  counts before and after); (4) the open-incident refusal still fires
  with the flags present — log an incident on the branch, run again with
  both flags, and expect the refusal, because a new flag is exactly how a
  guard gets bypassed by accident. One branch serves all the drills;
  delete it when they are done.

**Restore drill (LAUNCH §1.2 — proves recovery is a path, not a theory):**

  Neon dashboard → project → Branches → "Restore" a new branch to a
  timestamp an hour old → connect to it once (any query) → confirm rows
  exist → delete the branch. While there: Settings → History retention —
  confirm at least 7 days, and note the number: it is the true floor on
  erasure latency (G-04) and counsel should hear it in the same meeting.

## Done when

ADR-005 has no brackets, the sealed copy exists somewhere that is not
your password manager, all three drills have run once (and the throwaway
branch is deleted), and the ADR-005 guardrail lifts: real s3 values may
then enter the vault.
