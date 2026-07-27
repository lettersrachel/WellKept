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
   shared, plus the three drafts (`household-consent.md`,
   `privacy-notice.md`, `staff-confidentiality.md`).
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

## Same sitting, after the meeting — the two drills

**Rewrap drill (proves the key can rotate and BOTH custodies update):**

    # dry run first — prints the plan, writes nothing
    DATABASE_URL=<throwaway Neon branch> pnpm --filter @wellkept/schema db:rewrap-kek
    # then one real run ON THE THROWAWAY BRANCH only
    DATABASE_URL=<throwaway branch> pnpm --filter @wellkept/schema db:rewrap-kek -- --commit

  Create the throwaway branch in Neon first: dashboard → Branches → New
  branch (from production, any name — delete it after). The tool's final
  line on --commit says "update BOTH custody copies (ADR-005)" — on the
  drill this is rehearsal; on a real rotation it is the law.

**Restore drill (LAUNCH §1.2 — proves recovery is a path, not a theory):**

  Neon dashboard → project → Branches → "Restore" a new branch to a
  timestamp an hour old → connect to it once (any query) → confirm rows
  exist → delete the branch. While there: Settings → History retention —
  confirm at least 7 days, and note the number: it is the true floor on
  erasure latency (G-04) and counsel should hear it in the same meeting.

## Done when

ADR-005 has no brackets, the sealed copy exists somewhere that is not
your password manager, both drills have run once, and the ADR-005
guardrail lifts: real s3 values may then enter the vault.
