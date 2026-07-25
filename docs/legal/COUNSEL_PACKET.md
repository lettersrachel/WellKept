# Counsel engagement packet — Well Kept pilot

Assembled 25 July 2026, per the gap register's one-engagement consolidation.
Hand counsel this file plus the three drafts beside it (household-consent,
privacy-notice, staff-confidentiality). Each attachment below states what
exists in the software TODAY, and the specific question only counsel can
answer. The drafts were re-verified against the schema on 2026-07-25 (the
legal-drift check); they describe the product as built.

Jurisdiction: Virginia. Clients and staff are expected to be Virginia
residents for the pilot; flag if GDPR/UK GDPR analysis is wanted anyway.

---

## 1. Erasure semantics vs the notice's deletion language

**What exists.** A deletion request is executable today by an administrative
tool (`erase-household.mjs`): it hard-deletes the encrypted vault (a
crypto-shred — ciphertext and keys gone), blanks all free text, purges photo
bytes, and keeps two things by default as business records — the append-only
audit trail (hashes and actor ids, optionally scrubbed of detail payloads)
and incident/complaint records (optionally erased by flag). It refuses to
run while the household has an open incident unless explicitly overridden.

**Questions.** (a) Write the notice's retention/erasure section to describe
exactly this. (b) When a deletion request arrives during an open dispute,
which wins? The tool makes the operator choose; the policy should decide.
(c) Are audit rows and incident records defensible retained categories under
Virginia law (VCDPA if applicable at our scale), and under what wording?

## 2. The photo retention window

**What exists.** Visit photos (interiors of client homes) purge their image
bytes on a rolling window — default 90 days, configurable, floor 7 —
leaving a metadata tombstone. A corporate hold exempts photos tied to an
open incident or dispute.

**Questions.** (a) Bless or adjust the 90-day number. (b) Approve the
disclosure wording for the notice's "visit records" row (location: our
database; window; visible to assigned staff and management only, never the
client view).

## 3. The household consent document

**What exists.** The draft beside this file. The app now records THAT
consent was signed, when, and which document version, on the household
record; the signed paper remains the artifact. Only two states are
expressible today: signed and never-signed (withdrawal as a recorded state
is a known, queued gap).

**Questions.** (a) Review the draft for use with the first pilot household.
(b) The bracketed deletion-process language should match attachment 1's
answer. (c) Does the absence of a recorded withdrawal state need fixing
before the first signature, or is a written withdrawal letter sufficient
for a pilot?

## 4. The recovery window as the true floor on erasure latency

**What exists.** The database keeps point-in-time-recovery history (target:
at least 7 days). Within that window, a restore can reconstitute
crypto-shredded vault rows while the master key is still live. Erasure is
therefore a strong revocation of access immediately, and destruction only
after the retention window lapses.

**Question.** Write the notice's deletion timing knowing this — the history
retention setting IS the erasure-latency floor, and the number chosen for
backups is also a privacy number.

## 5. Subprocessor data-processing agreements

**What exists.** Five infrastructure vendors process household data:
Vercel (hosting), Neon (database), Upstash (queue), Railway (worker),
Resend (transactional email). All are named in the notice's subprocessor
section, currently in brackets.

**Question.** Confirm the standard DPA of each suffices (all five publish
one), fill the notice's bracketed section, and flag any that need more
than a click-through at our scale.

## 6. Breach-notification commitment

**What exists.** The notice carries ⟨add your breach-notification
commitment⟩ unfilled. Operationally: error monitoring is live; a named
breach owner and a one-page detect/assess/notify/record procedure are on
the founder's list but not yet written.

**Questions.** (a) What does Virginia require by way of timing and content
(Va. Code § 18.2-186.6, and VCDPA if applicable)? (b) Draft the
commitment sentence for the notice. (c) Anything the one-page internal
procedure must contain to make the commitment keepable.

## 7. CONDITIONAL — off-database backup retention

**Trigger.** Only if the founder's continuity decision (LAUNCH §2.4) is to
keep a periodic dump outside the primary database. Such a dump would hold
vault ciphertext and photos that the retention purge and erasure tool
cannot reach.

**Question.** If yes: the backup's own retention rule, and the sentence
that adds it to the notice's retention section.

---

## Also enclosed for context, not questions

- The consent-gating rule: no real household data enters the system before
  that household's written consent (architecture decision record 001,
  guardrail 3); the software shows a red no-consent banner until the signed
  consent is recorded.
- Staff-facing disclosure (gap register G-13): the system keeps an
  append-only record of staff actions, reveals, and hours. A short
  paragraph telling staff this exists is queued; counsel may fold it into
  the confidentiality acknowledgment.
- What the software refuses to hold: government IDs, payment card/bank
  numbers, health records (stated in both client-facing drafts). Payment
  runs entirely outside the software (QuickBooks; architecture decision
  record 004).
