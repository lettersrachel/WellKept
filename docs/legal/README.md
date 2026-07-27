# Pilot agreements — starting points

> ⚠️ **These are drafts, not legal advice.** They're written to match exactly
> what the software does, so a lawyer has less to invent — but a qualified
> attorney in your jurisdiction must review and adapt them before you use them
> with a real household. Two spots especially need counsel: **data retention /
> right-to-erasure** (the system tombstones rather than hard-deletes — but an
> executable erasure tool now exists: `apps/web/scripts/erase-household.mjs`
> crypto-shreds the vault, purges photo bytes, and blanks free text while
> keeping the audit trail; counsel decides when it applies and what must be
> retained) and
> **which privacy laws apply** (state, GDPR if any client/staff is in the EU/UK).

**For the engagement itself:** [`COUNSEL_PACKET.md`](COUNSEL_PACKET.md)
assembles the seven attachments — what the software does today, and the
specific question per item — so one engagement closes all of them.

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
  photos. Photos are stored inside the database, are shown only to assigned
  staff and management (second factor required on every view), and never
  appear on the client's view. No retention period is set yet — counsel
  should set one (see the photo-lifecycle item in LAUNCH.md §3).
- **"Dots"** — verbatim observations a house manager logs; never shown to the
  client.
- **Incident & complaint records** (added 2026-07-25; extended 2026-07-27) —
  a complaint, breakage, injury, or near-miss: what happened, severity, who
  reported it and how, and the resolution note. At resolution, the resolver
  may also record whether a service prompt could have prevented it (and
  which rule relates, if any) — answering is optional, and the answer is
  used to improve the service prompts. Append-only; internal; never shown
  to the client in the app.
- **Anticipation records** (added 2026-07-25; extended 2026-07-27) — staff
  answers to service prompts (with optional internal notes), including
  whether an acted-on prompt told the staff member something new and, when
  a prompt is set aside, why (wrong for this home, or bad timing);
  service-preference exclusions ("don't bring this up") with their
  reasons; and season-recall lines derived from the household's own
  history. All internal (s2); structurally blocked from client views by
  the payload guards.
- **The consent record itself** (added 2026-07-25) — that the household's
  written consent was signed, when, and which document version; recorded by
  a named corporate user. The paper stays the artifact.
- **Service time & cost records** (added 2026-07-27) — time spent serving
  the household, categorized (delivery, travel, intake, admin, training)
  and entered after the fact (a visit's delivery hours record themselves
  when the visit closes), and non-labor costs (supplies, materials,
  mileage, other) with amount, date, and who recorded them. Internal (s2);
  never shown to the client in the app. Hours and costs only — no pay
  rates, no payroll, no invoices (ADR-004; QuickBooks is the book of
  record for money). Note: time entries are attributed to the staff member
  who worked them — this is also STAFF data, and it belongs in the G-13
  staff-facing disclosure when that is written.
- **Registries** — important dates, vendors, appliances, subscriptions.
- **Account & activity** — email, role, and an append-only audit log of who
  accessed or changed what.

## Who can see what (enforced in code, not just policy)

Role-based and server-enforced: a **client** sees a curated s1 view; a **house
manager** sees the field surface for their assigned homes; **corporate** has
oversight. No account sees every household by default. Every s3 read and every
change is written to the audit log.
