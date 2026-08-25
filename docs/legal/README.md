---
status: living
---
# Pilot agreements, starting points

> ⚠️ **These are drafts, not legal advice.** They're written to match exactly
> what the software does, so a lawyer has less to invent, but a qualified
> attorney in your jurisdiction must review and adapt them before you use them
> with a real household. Two spots especially need counsel: **data retention /
> right-to-erasure** (the system tombstones rather than hard-deletes; but an
> executable erasure tool now exists: `apps/web/scripts/erase-household.mjs`
> crypto-shreds the vault, purges photo bytes (receipts included), blanks
> free text across every table including service-time/cost notes,
> membership cancellation reasons, and preference-exclusion reasons,
> clears the referral note while keeping the referral channel category
> (acquisition history), deletes queued notifications and transient
> delivery rows, empties household-scoped reminder rules, and keeps
> business/employer rows and the audit trail by default (counsel-directed
> flags go further); a CI check fails any new household-linked table that
> lacks an erasure treatment; counsel decides when it applies and what
> must be retained) and
> **which privacy laws apply** (state, GDPR if any client/staff is in the EU/UK).

**For the engagement itself:** [`COUNSEL_PACKET.md`](COUNSEL_PACKET.md)
assembles the seven attachments, what the software does today, and the
specific question per item, so one engagement closes all of them.

Four documents, one per audience and direction:

- [`household-consent.md`](household-consent.md): what a client agrees to
  before their household's information goes into Well Kept.
- [`privacy-notice.md`](privacy-notice.md): what data is held, how it's used
  and protected, and the household's rights.
- [`staff-confidentiality.md`](staff-confidentiality.md): what a house manager
  or corporate user acknowledges before they get access. (The app already has
  an `nda_approved` flag per person in the People & access panel.)
- [`staff-records-disclosure.md`](staff-records-disclosure.md): the reverse
  direction: what the software records ABOUT staff, disclosed to them before
  their first logged hour (the G-13 document; gap register G-41 gates hiring
  on it). Drafted 2026-07-27 from the session I inventory;
  founder-approved 2026-07-28; counsel review next.

## What the software actually collects (ground truth for all three)

- **Household operating details**, organized by sensitivity: **s1** (safe to
  show the client), **s2** (internal ops), **s3** (secured; e.g. alarm codes,
  access instructions, where valuables are kept).
- **s3 items are encrypted at rest** (AES-256-GCM) and only shown after an
  authorized, **audited** reveal.
- **Visit records**; tasks completed, hours, a three-sentence report, and
  photos. Photos are stored inside the database, are shown only to assigned
  staff and management (second factor required on every view), and never
  appear on the client's view. No retention period is set yet, counsel
  should set one (see the photo-lifecycle item in LAUNCH.md §3).
- **"Dots"**, verbatim observations a house manager logs; never shown to the
  client.
- **Incident & complaint records** (added 2026-07-25; extended 2026-07-27);
  a complaint, breakage, injury, or near-miss: what happened, severity, who
  reported it and how, and the resolution note. At resolution, the resolver
  may also record whether a service prompt could have prevented it (and
  which rule relates, if any); answering is optional, and the answer is
  used to improve the service prompts. Append-only; internal; never shown
  to the client in the app.
- **Anticipation records** (added 2026-07-25; extended 2026-07-27); staff
  answers to service prompts (with optional internal notes), including
  whether an acted-on prompt told the staff member something new and, when
  a prompt is set aside, why (wrong for this home, or bad timing);
  service-preference exclusions ("don't bring this up") with their
  reasons; and season-recall lines derived from the household's own
  history. All internal (s2); structurally blocked from client views by
  the payload guards.
- **The consent record itself** (added 2026-07-25); that the household's
  written consent was signed, when, and which document version; recorded by
  a named corporate user. The paper stays the artifact.
- **Service time & cost records** (added 2026-07-27); time spent serving
  the household, categorized (delivery, travel, intake, admin, training)
  and entered after the fact (a visit's delivery hours record themselves
  when the visit closes), and non-labor costs (supplies, materials,
  mileage, other) with amount, date, and who recorded them. Internal (s2);
  never shown to the client in the app. Hours and costs only; no pay
  rates, no payroll, no invoices (ADR-004; QuickBooks is the book of
  record for money). Note: time entries are attributed to the staff member
  who worked them, this is also STAFF data, and it belongs in the G-13
  staff-facing disclosure when that is written.
- **Commercial record** (added 2026-07-27), how the household found Well
  Kept (referral channel, with an optional note), and the membership
  history as dated events: start, tier change, pause, resume, cancellation,
  each with the tier and price where they apply, and cancellations
  always with a reason and who initiated. Corporate-only; append-only.
  Records that state changed, never that money moved (ADR-004, QuickBooks
  is the billing system of record).
- **Registries**, important dates, vendors, appliances, subscriptions.
- **Object observations** (added 2026-07-27, G-49); repeated staff
  observations of registry objects over time: condition (1–5) and fill
  level, with an optional internal note and who recorded them. Internal
  (s2); never shown to the client; deleted with the household on erasure.
  Recorded by a named staff member, also STAFF data (the G-13
  disclosure's "written work" item covers it).
- **Condition flags** (added 2026-07-28, W-5); a staff member's note that
  some condition of the home is worth watching: what and where, the
  concern in their own words, a revisit plan (a date or a stated
  condition), repeated condition looks over time, and how it was
  resolved. Internal (s2); never shown to the client; deleted with the
  household on erasure. Recorded by a named staff member, also STAFF
  data (the G-13 disclosure's internal-observations item covers the
  category; its examples list should name flags at the next revision).
- **Deliberate deferrals** (added 2026-07-28, W-6; lifecycle added same
  day, AB); what a staff member noticed and chose not to act on yet,
  with the reason, the intended timing (a date or a stated condition),
  and how it was ultimately resolved (done, no longer needed, or
  superseded, by whom and when). CLIENT-VISIBLE by design: the client
  sees what was noticed, the reason, the timing, and the resolution and
  its date, never who decided or resolved. On erasure the free text is
  blanked and the record skeleton kept (the visit-report posture). Also
  STAFF data (decided_by, resolved_by); joins the G-13 founder line
  candidates.
- **Paused decisions** (added 2026-07-28, W-7); research a staff member
  did toward a household decision and then paused: what is being decided,
  what was learned, a revisit plan (a date or a stated condition), and
  how it was ultimately resolved (done, no longer needed, or superseded,
  by whom and when). Internal (s2); never shown to the client; deleted
  with the household on erasure. Recorded by a named staff member, also
  STAFF data (paused_by, resolved_by); joins the G-13 founder line
  candidates.
- **Internal work, attention, and decision records** (tables added
  2026-08-25, RFC-PRIM-01; these entries added in the same day's
  catch-up, one PR late, recorded as G-62): the follow-up work we track
  on a household's behalf (title, detail, due timing, how it ended),
  the items the system surfaces to staff for attention (the reason, who
  saw it, how it was answered), and the choices routed internally for a
  decision (question, recommendation, evidence, outcome). Internal
  (s2); never shown to the client; on erasure the free text is blanked
  and the record skeletons kept (operational history without the
  household's words). Recorded by named staff members, also STAFF data;
  joins the G-13 founder line candidates.
- **Anticipation shadow log** (table added 2026-08-24, WK-DEV-007;
  entry added in the 2026-08-25 catch-up, G-62): what the anticipation
  engine WOULD have suggested while it is tuned, derived from condition
  flags and household records. Engine-internal; visible only to
  founder, CFO, and developer roles; deleted with the household on
  erasure.
- **Tell Well Kept captures** (added 2026-08-25, WK-DEV-009 §8): what a
  staff member says once, in their own words, about something
  unexpected, held until a person files it (as tracked work, or
  dismissed with the reason). Internal (s2); never shown to the client;
  deleted with the household on erasure once filed onward. Recorded by
  a named staff member, also STAFF data (captured_by, filed_by); joins
  the G-13 founder line candidates.
- **Work requirements** (added 2026-08-25, WL Gate 1): planned
  instances of the household's standing tasks (when or under what
  stated context each is due, and how each ended: completed, verified,
  deferred, reopened). An instance of the internal-work category
  above, named for precision. Internal (s2); never shown to the
  client; on erasure the stated context blanks and the skeleton keeps
  (the work_item posture). Also STAFF data (created_by, completed_by,
  verified_by); joins the G-13 founder line candidates.
- **Household task profiles** (added 2026-08-25, WL Gate 1): an
  instance of the operating-details category above, named for
  precision: which standing tasks apply in the household, their rhythm,
  and how the household wants each done. Internal (s2); never shown to
  the client; on erasure the words blank and the skeleton tombstones
  (the registry posture). Configured by a named corporate user, also
  STAFF data (configured_by).
- **Visit brief snapshots** (added 2026-08-25, WK-DEV-009 §2.1): every
  pre-visit brief composed for a staff member, kept exactly as shown
  (deduped by content), so what a staff member was told about the
  household is always reconstructable. Internal (s2); never shown to
  the client; on erasure the brief content is blanked and the skeleton
  kept (that a brief was shown, when, to whom). Also STAFF data
  (which staff member was briefed); joins the G-13 founder line
  candidates.
- **Account & activity**, email, role, and an append-only audit log of who
  accessed or changed what.

## Who can see what (enforced in code, not just policy)

Role-based and server-enforced: a **client** sees a curated s1 view; a **house
manager** sees the field surface for their assigned homes; **corporate** has
oversight. No account sees every household by default. Every s3 read and every
change is written to the audit log.
