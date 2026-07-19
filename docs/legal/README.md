# Pilot agreements — starting points

> ⚠️ **These are drafts, not legal advice.** They're written to match exactly
> what the software does, so a lawyer has less to invent — but a qualified
> attorney in your jurisdiction must review and adapt them before you use them
> with a real household. Two spots especially need counsel: **data retention /
> right-to-erasure** (the system tombstones rather than hard-deletes) and
> **which privacy laws apply** (state, GDPR if any client/staff is in the EU/UK).

Three documents, one per audience:

- [`household-consent.md`](household-consent.md) — what a client agrees to
  before their household's information goes into Well Kept.
- [`privacy-notice.md`](privacy-notice.md) — what data is held, how it's used
  and protected, and the household's rights.
- [`staff-confidentiality.md`](staff-confidentiality.md) — what a house manager
  or corporate user acknowledges before they get access. (The app already has
  an `nda_approved` flag per person in the People & access panel.)

## What the software actually collects (ground truth for all three)

- **Household operating details**, organized by sensitivity: **s1** (safe to
  show the client), **s2** (internal ops), **s3** (secured — e.g. alarm codes,
  access instructions, where valuables are kept).
- **s3 items are encrypted at rest** (AES-256-GCM) and only shown after an
  authorized, **audited** reveal.
- **Visit records** — tasks completed, hours, a three-sentence report, and
  (soon) photos.
- **"Dots"** — verbatim observations a house manager logs; never shown to the
  client.
- **Registries** — important dates, vendors, appliances, subscriptions.
- **Account & activity** — email, role, and an append-only audit log of who
  accessed or changed what.

## Who can see what (enforced in code, not just policy)

Role-based and server-enforced: a **client** sees a curated s1 view; a **house
manager** sees the field surface for their assigned homes; **corporate** has
oversight. No account sees every household by default. Every s3 read and every
change is written to the audit log.
