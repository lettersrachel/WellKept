---
status: living
---
# Counsel engagement packet: Well Kept pilot

Assembled 25 July 2026; rev 5, 27 July 2026. Per the gap register's
one-engagement consolidation. Every "What exists" claim was verified against
the codebase on 2026-07-25 (see COUNSEL_PACKET_VERIFICATION.md); the four
corrections that verification produced are incorporated. Rev 4 added the data
categories shipped after that verification (section 2a below and the addendum
paragraph in section 0), the erasure tool's treatment of them, and two audit
wording refinements from the 2026-07-27 audit-invariant review
(POST_DEPLOY_FINDINGS_A_B.md, session A). Rev 5, same day, follows the
second review round (POST_DEPLOY_FINDINGS_E_I.md): section 2a's retention
question is reframed as an obligation for counsel to confirm rather than a
preference to bless, the erasure defaults now describe the referral split
and four further tables, a mileage-substantiation question is added ahead
of any schema change, and the key-rotation disclosure sentence is added to
the data-minimisation note. Rev 6, same day, adds two questions from the
intake-capture review (docs/INTAKE_CAPTURE_GAP_REVIEW.md): children's data
handling in section 6, and a prospective AI-transcription subprocessor in
section 8; both asked BEFORE the relevant capability is built.

Hand counsel this file plus the four drafts beside it: `household-consent.md`,
`privacy-notice.md`, `staff-confidentiality.md`,
`staff-records-disclosure.md`. Each attachment states what
exists in the software today and the specific question only counsel can answer.

The drafts were re-verified against the schema on 2026-07-25 and describe the
product as built, including four data categories added that day.

---

## 0. Engagement scope

**Who we are.** Well Kept Home Operations Management LLC, a Virginia LLC based
in Falls Church, serving Northern Virginia households with dedicated W-2 House
Managers on a weekly membership model. Co-founders: Rachel Letters (CEO), Kelly
Stover (CFO).

**Scale, which matters for section 1.** Pilot in 2027 with a small number of
households, likely one to three. Commercial launch 2028. The business plan
projects 108 households by 2032. We do not sell or share personal data with
third parties for their own purposes, and we do not process data for targeted
advertising or profiling.

**Status of the software, which affects how to read every attachment below.**
The application is built and verified in test. It has not yet been deployed to
production, and no real household data exists in it. Every behaviour described
below is implemented and exercised against test data; none of it has yet run
against a live client record, because there are no live client records.

This matters most for section 5. The scheduled purge described there is real
code on a real schedule, but it has never destroyed a photograph of anyone's
home, and it will not until we onboard a first household. We would rather
settle these questions before that happens than describe an exposure we are
already carrying.

**Jurisdiction.** Virginia. Clients and staff are expected to be Virginia
residents throughout the pilot. Flag if a GDPR or UK GDPR analysis is wanted
anyway, but we do not currently expect either to apply.

**What we are asking for.** In priority order:

1. A yes or no on section 1, which determines how much of the rest is
   regulatory and how much is contract drafting.
2. Redlines on the three enclosed drafts, suitable for use with the first pilot
   household and the first House Manager.
3. Answers to the numbered questions, at the level of a decision we can act on
   rather than a survey of options.
4. A short note on anything below that we have framed wrongly.

**Budget.** ⟨Founder: state the range you are working to, and whether you want
a fixed fee for the above. A scoped ask usually returns a fixed fee; an
unscoped one returns an hourly engagement.⟩

**A note on how to read this.** Sections 2 through 11 each open with what the
software actually does. That is there so the engagement does not spend billable
time on discovery. Where our description of the law is wrong, please correct
it; the descriptions of the software are accurate.

---

## 1. Threshold question: does the VCDPA apply to us at all?

**Answer this first, because it restructures everything below.**

Our understanding, which we would like confirmed or corrected, is that the
Virginia Consumer Data Protection Act reaches controllers that process the
personal data of at least 100,000 Virginia consumers in a year, or at least
25,000 where more than half of gross revenue comes from the sale of personal
data. We expect roughly 108 households at Year 5 and we sell no data.

**Questions.** (a) On those numbers, does the VCDPA apply to Well Kept now, at
launch, or at any point in the current plan? (b) If it does not, which of the
obligations discussed below survive as contractual commitments we are choosing
to make rather than statutory duties? (c) Are there Virginia consumer
protection, employment, or common law duties that reach us regardless of the
VCDPA threshold?

If the answer is that the VCDPA does not apply, sections 2, 3, 6 and 9 become
questions about what we want to promise rather than what we are required to do,
and we would want that reframing reflected in the redlines.

---

## 2. Erasure: what the tool actually does

**What exists.** A deletion request is executable today by an administrative
tool (`erase-household.mjs`). Run against a household it: deletes the encrypted
vault rows and their per-record wrapped keys from the live database; blanks free
text across the record; purges photo image bytes; and by default preserves two
categories as business records, being the append-only audit trail (actor ids,
timestamps and event types, with detail payloads optionally scrubbed) and
incident records (optionally erased by explicit flag).

Two safety behaviours: the tool refuses to run while the household has an open
incident, and corporate retention holds on photos are honoured unless an
explicit override flag is passed. Any override is recorded in the erasure's
audit entry. A refusal stops the tool before anything is written, including an
audit row; the refusal is visible only in the operator's terminal. The tool
defaults to a dry run and requires an explicit commit.

**Important qualification, which section 3 develops.** The master encryption key
persists in the application environment after an erasure. Deleting the vault
rows removes the ciphertext from the live database. It does not destroy the
means of reading that ciphertext if the rows are recovered by other means.

**Questions.** (a) Write the notice's retention and erasure section to describe
exactly this behaviour. (b) When a deletion request arrives during an open
dispute, which obligation wins? The tool currently makes the operator choose,
and we would rather the policy decided. (c) Are the audit trail and incident
records defensible retained categories, and under what wording? (d) Should a
refused erasure itself leave an audit record? Today it does not, and we are
open to changing that.

---

## 2a. Data categories added after verification (rev 4)

**What exists.** Since the 2026-07-25 verification the system also captures:
categorized service time (delivery, travel, intake, admin, training),
attributed to the staff member who worked it, entered after the fact;
non-labor costs (supplies, materials, mileage, other) with an optional
receipt photo that is stored and retained exactly like a visit photo; the
household's referral source (a six-value category plus an optional note);
and membership state changes (start, tier change, pause, resume,
cancellation with a reason and an initiator) as an append-only history with
the price at each event. QuickBooks remains the billing system of record;
these records capture that state changed, never that money moved.

**What the erasure tool now does with them (defaults chosen 2026-07-27,
for counsel to confirm).** On a household erasure: time and cost rows are
KEPT (employer and business records) with their free-text notes blanked,
deletable by an explicit flag; membership events are KEPT (commercial
history) with cancellation reasons blanked, deletable by an explicit flag;
the referral record is SPLIT: the channel category (how the household
found us, one of six fixed values) is RETAINED as acquisition history
about our marketing, while the free-text referral note is CLEARED because
it frequently names a person, possibly a current client; receipt photos
purge with the photo pass. The pass also blanks the reasons and subjects
on "please don't raise this" preference records, deletes the household's
queued notifications and transient delivery rows, and empties and
disables any reminder rules scoped to the household. A continuous
integration check now fails any change that adds a household-linked table
without naming its erasure treatment, so a new data category cannot ship
without one.

**Questions.** (a) Time and cost records: our understanding is that we
are REQUIRED to retain these rather than merely choosing to. As we
understand it, federal wage and hour rules require retention of time and
payroll records for a period of years, and tax substantiation drives the
same answer for cost records. That is the founder's understanding, not a
settled legal position; please correct it where it is wrong. Confirm the
required period, and whether a household deletion request changes it.
(b) Staff-attributed time is a personnel record: we
believe the staff-facing disclosure (item 7's document family) must exist
and be acknowledged before any non-founder logs an hour. Confirm, and tell
us what that disclosure must contain about time records. (c) Does the
client-facing notice's "Service time & costs" row say enough, given the
staff half is disclosed in the staff document rather than the notice?
(d) Is retaining the referral channel category after an erasure
acceptable, given it carries no identifying detail once the note is
cleared? (e) A question to settle BEFORE the fields exist: mileage rows
may gain business-purpose and destination fields for IRS substantiation.
Those fields would exist precisely to survive scrutiny years later, yet
the destination will usually be the erased household's address, which is
what erasure exists to remove. Which obligation wins, and should the
fields be added at all?

## 3. The recovery window is the true floor on erasure latency

**What exists.** The database keeps point-in-time recovery history, targeted at
seven days or more. Within that window a restore can reconstitute deleted vault
rows, and because the master key remains live, those rows are readable.

Erasure is therefore an immediate and strong revocation of access, and actual
destruction only once the recovery window lapses.

**Question.** Write the notice's deletion timing knowing this. The number we
choose for database history retention is simultaneously a resilience setting and
a privacy commitment, and we would like the notice to state a deletion timeline
we can actually keep rather than one that assumes instant destruction.

---

## 4. The photo retention window

**What exists.** Visit photographs, which are interior images of client homes,
have their image bytes purged on a rolling window. The default is 90 days,
configurable, with a floor of 7. A metadata tombstone survives, recording that a
photo existed. A corporate hold exempts photos tied to an open incident or
dispute from the purge.

**Questions.** (a) Bless or adjust the 90-day default. (b) Approve disclosure
wording for the notice's visit records row, covering where photos are stored,
the window, and that they are visible to assigned staff and management only and
never in the client's own view.

---

## 5. Automated purging and the duty to preserve

**This is the question we most want answered and the one we had originally
omitted.**

**What exists.** The photo purge runs unattended on a schedule, though as
noted in section 0 it has not yet run against any real client photograph. A
hold protects
photos tied to an incident that someone has logged in the system. There is a gap
between the moment a dispute becomes reasonably foreseeable and the moment
somebody logs an incident, and in that gap the job continues to destroy images on
schedule. Separately, the erasure tool can override holds when an explicit flag
is passed.

**Questions.** (a) When does a duty to preserve attach in Virginia for a matter
like a client damage claim or an employment dispute? (b) What has to happen to
the scheduled purge when it does, and who has to be able to stop it? (c) Should
the erasure tool's ability to override a hold be removed outright rather than
flagged and logged? (d) Is there anything we should add to the incident
procedure so that foreseeability triggers a hold before a claim is formalised?

We would rather change the software than defend the current behaviour, so a
recommendation to remove a capability is a welcome answer.

---

## 6. The household consent document, and who it can bind

**What exists.** The draft enclosed. The software records that consent was
signed, when, and which document version, against the household record. The
signed paper remains the artifact. Only two states are expressible today, signed
and never signed; a recorded withdrawal state is a known gap that is queued but
not built.

**The scope problem.** Consent is given for a household but signed by one
person. A House Manager works inside a home that may contain a spouse or
partner, children, elderly parents, a nanny, and other household staff. None of
them signs anything. Observations are recorded about the home, and photographs
may capture people.

**Questions.** (a) Review the draft for use with the first pilot household. (b)
The bracketed deletion language should match the answer to section 2. (c) Who
can consent on behalf of a household, and what should we do where two adults
disagree? (d) What is the position on minors in the home, and on photographs
that capture any person? (e) Do household employees such as a nanny or cleaner
require separate notice? (f) Does the absence of a recorded withdrawal state
need fixing before the first signature, or is a written withdrawal letter
sufficient for a pilot? (g) The intake protocol collects children's data
beyond photographs: school names and schedules, activity rosters, and
clothing sizes, held internally and never shown outside the service team.
Our internal rule already treats these as child data requiring care. Does
Virginia law (or a duty of care you would advise regardless) require
handling beyond internal-only access for this material; and does the
answer change what the consent document must say about children? Two
sub-questions while this is open: should children's data carry its own
retention rule (a distinct window, or deletion at majority, rather than
the household default - the schema is gaining a marker that would make
any answer enforceable), and what is the consent posture for VISITING
children (grandchildren, guests' children), who are not members of the
consenting household - the sharper version of question (d)?

---

## 7. The staff acknowledgment, as an employment document

**What exists.** The enclosed draft covers what a House Manager owes the
business: confidentiality of household details and secured items, no export of
records outside the app, no sharing of credentials or authenticators, and that
internal observations stay internal.

We had originally enclosed this document without asking anything about it, which
was an oversight given counsel will be reading it regardless.

**Questions.** (a) Is the confidentiality clause enforceable against a W-2
employee in Virginia as drafted? (b) Do Virginia's restrictions on covenants
with low-wage employees touch anything we are likely to want in this document or
in an offer letter? (c) Should the acknowledgment sit inside the offer letter
rather than beside it? (d) Is our at-will language, or its absence, where it
should be? (e) A separate live issue: client-side cameras and smart speakers
routinely record our staff inside client homes. What, if anything, do we owe
employees by way of notice, and should the client consent document address
recording of our staff?

Related and no longer small: the system keeps an append-only record of staff
actions, secured-item reveals and hours, and the enclosed
`staff-records-disclosure.md` now discloses the full inventory to staff (it
gates hiring; see section 2a question (b)). Please review it alongside this
document, including its bracketed staff-records retention period, and advise
whether it should stand alone or be folded into the confidentiality
acknowledgment.

---

## 8. Subprocessor data processing agreements

**What exists.** Six infrastructure vendors touch our systems. Five process
household data directly: Vercel (hosting), Neon (database), Upstash (queue),
Railway (worker), Resend (transactional email, including visit-report emails to
clients). The sixth is Sentry (error monitoring), configured to exclude
personal data by default; its residual exposure is an error message that quotes
a value. All publish a standard DPA. The notice's subprocessor section is
currently bracketed.

Two further outbound flows exist that are not vendor relationships but that
counsel should know about: a weekly job sends appliance model and label strings
(household-derived, no household identifier attached) as search queries to the
US CPSC's public recall API; and web push notifications, whose payloads can
contain a household name, transit browser push gateways (Google, Mozilla,
Apple) end-to-end encrypted, so the gateways carry ciphertext only.

**Question.** Confirm each standard DPA suffices at our scale, fill the
bracketed section including whether Sentry belongs in it, flag any vendor that
needs more than a click-through, and advise whether either outbound flow needs
notice disclosure.

**A prospective seventh, asked before we build.** Our designed intake method
is voice narration during the home walk-through, transcribed and then
structured into records by an AI service. That would send household
contents (though not secured items) to a new vendor. We have not built
this. Before we do: what would engaging an AI transcription/structuring
vendor require by way of DPA, notice disclosure, and consent-document
language, and is there anything about home-interior narration specifically
(other people's names, children, visible valuables) that changes the
analysis?

---

## 9. Breach notification commitment

**What exists.** The notice carries an unfilled bracket where the commitment
belongs. Operationally, error monitoring is live. A named breach owner and a
one-page detect, assess, notify, record procedure are on the founder's list and
are not yet written.

**Questions.** (a) What does Virginia require by way of timing and content? We
believe Va. Code § 18.2-186.6 is the relevant statute and would like that
confirmed, along with anything the VCDPA adds if section 1 says it applies. (b)
Draft the commitment sentence for the notice. (c) What must the internal
one-page procedure contain for the commitment to be keepable?

---

## 10. Business transfer and wind-down

**What exists.** Nothing. This is not addressed in any current draft.

The vault holds alarm codes, access instructions and equivalent material for
every client. We intend to raise outside investment, so a change of control is a
realistic future event, and dissolution is a realistic one for any young company.

**Questions.** (a) What should the notice say about transfer of personal data in
an acquisition or merger? (b) What obligations attach on wind-down, specifically
around destroying or returning secured items, and how quickly? (c) Is there
anything we should build now to make an orderly wind-down possible, given that
the encrypted vault is unreadable without a key held by two people?

---

## 11. Conditional: off-database backup retention

**Trigger.** This attachment is live only if the founder's continuity decision
(LAUNCH §2.4) is to keep a periodic dump outside the primary database. That
decision is not yet made.

**What such a dump would contain.** Vault ciphertext and photographs, in a
location the retention purge and the erasure tool cannot reach.

**Question.** If we proceed: the backup's own retention rule, and the sentence
that adds it to the notice's retention section.

---

## Enclosed for context, not questions

- **The consent gate.** No real household data enters the system before that
  household's written consent. This is architecture decision record 001,
  guardrail 3, and the software displays a red no-consent banner on any
  household until a signed consent is recorded.
- **What the product is not designed to hold.** Government identifiers,
  payment card and bank numbers, and health records: no field requests them
  and both client-facing drafts instruct clients not to provide them. This is
  policy and product design, not automated enforcement; software does not stop
  a client typing a card number into a free-text field. Payment runs entirely
  outside the software, in QuickBooks.
- **Data minimisation by design.** Household data is tiered by sensitivity, and
  the most sensitive tier is encrypted at rest with a separate key, revealed
  only to staff assigned to that household in a session that has cleared a
  second authentication factor, and every reveal is logged before the value is
  released. The log entry is written and committed before the value is
  decrypted, and a failed log write aborts the reveal: the log is
  load-bearing, not advisory. A revealed value remains on screen for sixty
  seconds and re-displays within that window without an additional entry;
  the trail records reveal actions, not seconds of viewing. One
  administrative operation also touches plaintext: key rotation verifies
  that every secured value decrypts correctly under the new key, so the
  values pass through server memory during the operation and are neither
  displayed to anyone nor logged as reveals. A rotation is a founder-run
  maintenance act, not a view of the data, and no person sees a value
  during it.

---

## Glossary

Three terms appear above that are not standard legal vocabulary.

**Vault.** The encrypted store for the most sensitive tier of household data,
such as alarm codes and access instructions.

**Crypto-shred.** Deleting encrypted data and the keys that unwrap it, rather
than overwriting the data itself. Fast and normally irreversible, subject to the
qualification in section 3.

**Tombstone.** A record that something existed and has been removed, retained
after the content itself is gone. Our photo purge leaves a tombstone; the image
is destroyed and the fact that a photo was taken survives.

---

## Founder checklist before sending

- ✅ Run the "What exists" verification session against the codebase; DONE
  2026-07-25 (`COUNSEL_PACKET_VERIFICATION.md`): 15 claims confirmed, 2
  overstated (corrected in this revision), one missing vendor (Sentry, added)
  and two outbound flows (disclosed above).
- ⬜ Confirm the three drafts beside this file are the corrected 2026-07-25
  versions whose collection table includes incident records, internal
  observations and anticipation records. An earlier version omits four data
  categories, and sending it would scope the engagement against a product that
  does not exist.
- ⬜ Fill the budget bracket in section 0.
- ⬜ Confirm the household counts in section 0 against the current model.
- ⬜ Decide whether you want the section 11 conditional live before sending, or
  whether to hold it for a follow-up.
