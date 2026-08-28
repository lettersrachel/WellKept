---
status: living
---
# Gate 0, Phase 1 and Phase 2 status, against WK-DEV-006

28 August 2026. Report only. Nothing in this change builds, resolves or
decides anything; where a question is a founder ruling it is left open and
said to be open.

Everything below is read from this repository at the commit this document
lands on.

> **CORRECTED 28 August 2026, later the same day. This paragraph originally
> read that THREE documents were not in the repository: WK-SEC-001, WK-QA-004
> and WK-SPEC-002. WK-SEC-001 IS in the repository**, at
> `docs/library/WK-SEC-001_Application_Security_Audit_Scope.docx`, listed in
> `docs/library/`, carrying all eight test areas and the pass criteria. (A
> further correction, G-107: this line first said the file was "listed in
> `LIBRARY_INDEX.md`". It is not. The index names eight files and ten are on
> disk.)
> The absence claim came from a search that structurally could not find it
> (`ls docs` and a grep over `docs/*.md`, neither of which reaches a `.docx`
> one directory down). Filed as G-106. **WK-QA-004 and WK-SPEC-002 are
> genuinely absent**, confirmed against the full `docs/library/` listing.
> Section 3's WK-SEC-001 row is corrected in place below; the audit is still
> NOT RUN, which was the substantive finding and is unchanged.

---

## 0. Two premises corrected before anything rests on them

Both are cases of the standing doctrine: when a document and the code
disagree, report both and stop.

### 0.1 REQ-078 through REQ-082 are already appended

The instruction was to append them verbatim from
`INSTRUCTION_UPDATES_2026-08-05_v2` without renumbering. **They are in
`docs/WK-DEV-001_Requirements.md` already**, at lines 79 to 83, under
section I ("Response architecture, ADOPTED 2 August 2026, ruling A121;
appended 5 August 2026"). The document also carries its own canonicity note
at lines 91 to 94: the repo copy is canonical for REQ-078..082, because the
dated verbatim check found wording-level divergence from INSTRUCTION_UPDATES
v2 and the 24 August rulings resolved it in the repo copy's favour.

So there is nothing to append, and appending from the v2 source would
UNDO a resolved divergence rather than close a gap.

Where the belief comes from is worth naming, because it is load-bearing in
two documents. `IMPLEMENTATION_HANDOFF_2026-08-24.md:182` states the append
is outstanding, and WK-DEV-006's Phase 0 line inherits it. Both were written
24 August; the append happened 5 August. **The handoff line is stale, and it
is stale in a controlled document, so correcting it is a founder-side edit,
not one made here.**

`INSTRUCTION_UPDATES_2026-08-05_v2` is itself not in the repository, held out
deliberately (`FOUNDER_RULINGS_2026-08-24.md:102`), so a verbatim re-check
against the source cannot be performed from this container in any case.

### 0.2 REQ-074 is not stale

The reported defect was that WK-DEV-001 says WCAG 2.1 AA on the client portal
at P1 while D2 promotes it to 2.2 AA across critical client, HOM and
corporate workflows.

`docs/WK-DEV-001_Requirements.md:71` reads, in full:

> REQ-074 (P1) Accessibility: WCAG 2.2 AA is the engineering baseline for
> critical client, HOM, and corporate workflows, enforced through the shared
> component library's accessibility contract. PROMOTED 24 August 2026 per
> WK-DEV-006 D2 (register A567); was "WCAG 2.1 AA on client portal".

The promotion is already recorded, carrying D2's language, its date, its
register citation, and the superseded text quoted as the record. **If the
library copy of WK-DEV-001 still reads 2.1 AA, then the two copies disagree
and the repo copy is the one carrying the promotion.** That is a real finding
and it is founder-side.

One residual, and it is small: REQ-074 still carries **P1** while D2 calls it
a baseline. A baseline at P1 is an odd pairing, and nothing in the repo
resolves it. Reported, not changed.

**What this does to the accessibility ruling of 27 August is treated in
section 5 (Task E), not here.**

---

## 1. Task A. Arrival and departure. Report, not build

### 1.1 The three events exist. What writes each

| Event | Written by | Payload | Actor |
|---|---|---|---|
| `visit.arrival` | `apps/web/src/lib/visit-command-store.ts:231`, inside the visit-close transaction | `{ visitCommandId, occurredAt }` | deliberately null |
| `visit.departure` | `apps/web/src/lib/visit-command-store.ts:237`, same transaction | `{ visitCommandId, occurredAt }` | deliberately null |
| `household.departure` | `apps/web/src/lib/actions.ts:1166`, inside `recordMembershipEvent`'s transaction | `{ membershipEventId, causeCode, effectiveOn }` | `principal.userId` |

All three go through `emitOutboxEvent`, which is the one way an event enters
the outbox, and all three carry the 0046 envelope. The two visit events fire
only when the visit carries usable hours: the guard at
`visit-command-store.ts:207` requires a submitter, a parsable start and end,
and `end > start`. A conflicted or hourless visit reaches neither the time
entry nor the covenant stream, which
`visit-command-store.integration.test.ts:224` asserts.

### 1.2 The cause code and its vocabulary

`household.departure` carries a cause code, and it is structural rather than
conventional.

- Vocabulary, six values, at `packages/schema/src/tables.ts:103`:
  `relocated`, `ended_by_member`, `ended_by_company`, `financial`,
  `life_event`, `other_documented`. Held by the CHECK constraint
  `membership_event_cause_code_known` at `tables.ts:102`.
- The action refuses a cancel without one: `actions.ts:1143` requires reason,
  initiator AND cause code together, visibly (`refuse`), and
  `actions.ts:1165` emits the event only when the code is present.
- The reason text is s2 and stays on the membership row. It never rides the
  event, which `tooling/e2e/journeys.spec.ts:174` proves by asserting the
  raw payload does not contain the reason string.
- Rows recorded before the taxonomy render as "recorded before the taxonomy"
  (`board/page.tsx:264`) rather than being backfilled with a guess.

### 1.3 No monthly covenant report exists

Searched the whole tree for a covenant report, a lender report, or any
monthly aggregation over these events. **There is none.** The only consumer
of the three kinds anywhere is a live count on the corporate board
(`board/page.tsx:132`, rendered at `:274-275`) which the page itself
describes as showing the stream is alive and nothing more.

`capacity-utilization.ts` is the nearest existing computation and it is not
the report:

- it derives from `time_entry`, not from events (`capacity-utilization.ts:74`
  onward, `category = 'delivery'`);
- its window is a trailing 30 days from now (`:71`), not a calendar month;
- it is per-HOM across the fleet, not per household per month;
- and it is the display surface of the capacity gate, which A581 recognised
  as distinct from the covenant report.

### 1.4 Whether Phase 2's acceptance criterion is currently possible

Phase 2's criterion: **the monthly covenant report generates as a pure
function of events and matches a hand computation.**

**Not currently possible, and the obstruction is not "the report is
unwritten".** Three separable readings:

1. **Utilization minutes per household per month: derivable from events
   today.** Each visit contributes an arrival and a departure sharing a
   `visitCommandId`, both carrying `occurredAt`. Pair on the id, subtract,
   bucket by month. That part is a pure function of the outbox.
2. **Utilization per HOM: NOT derivable from events, by design.** The
   payloads carry no person and `actor` is deliberately null on both visit
   events. The source comment at `visit-command-store.ts:222-230` states the
   intent plainly: attribution lives in `time_entry` under the approved G-13
   item and the covenant report "joins through visitCommandId when it is
   built". So the report as specified would be a function of events **and of
   `time_entry`**, not of events alone.

   REQ-083 says the report "generates from these events, not from
   spreadsheets", and 24.3 says "the same arrival taps that build payroll
   produce utilization". Both are satisfied in spirit by a join through
   `time_entry`, which is not a spreadsheet. **But "pure function of events"
   as an acceptance test is not satisfied by it**, and the two sentences
   cannot both be met exactly while the no-person rule holds. This is a
   specification question, not an engineering one: either the acceptance
   criterion means "of events joined to the record", or the events must carry
   a person, and the second option runs at the no-person posture that Ruling 1
   and the G-13 disclosure both rest on. **Left open.**
3. **Churn with cause: derivable from events today.** `household.departure`
   carries the code and the effective date, and every departure since the
   taxonomy landed has one by CHECK.

**And the capture underneath it is not what the requirement describes.** A
visit's arrival and departure are two `datetime-local` fields the HOM types
(`VisitWizard.tsx:398-399`). The word "tap" in REQ-083, in 24.3 and in the
code comments describes a mechanism that does not exist. What the events
record is a typed interval, which is honest data and a fine input to a
report, but a hand computation matching it is checking arithmetic on typed
numbers, not verifying capture.

### 1.5 One thing found on the way, reported because it reaches a person

`VisitWizard.tsx:397` renders this sentence to the HOM, immediately above
those two typed inputs:

> Suggestion only; nothing bills from a geofence alone.

And `apps/hm-mobile/App.tsx:461` labels the chip "Confirm hours (geofence
suggestion)".

There is no geofence. The sentence is REQ-036's own language shipped into the
interface ahead of the feature, where it reads to the HOM as a description of
what just happened. It is not a false claim to a client and it is not a
safety issue; it is copy asserting a mechanism, on a live staff surface,
where a HOM could reasonably conclude the start time was suggested rather
than typed. Reported, not changed. Filed as G-104.

---

## 2. Task B. Gate 0, item by item

Phase 0's deliverables, crediting what has already been read.

| Deliverable | Status | Evidence |
|---|---|---|
| Delta report on WK-DEV-003, VERIFIED AGAINST REPO | DELIVERED, frozen | `DELTA_REPORT_WKDEV003_2026-08-24.md`; both section 8 escalations resolved (ADR-007 staging, ADR-008 version pins) |
| REQ-078..082 appended verbatim | ALREADY DONE, 5 August | section 0.1 above |
| Monthly stack run-rate statement (REQ-085) | NOT DELIVERED | founder-side by standing rule; figures never enter this repo |
| Per-workflow system-of-record map (D1) | DELIVERED | `SYSTEM_OF_RECORD_MAP.md` |
| Owners and dates on every surviving CAND (24.7) | SUBSTANTIALLY DONE, one structural gap | `CAND_LEDGER.md`; see 2.1 |
| Demo-to-commitment ledger tags (24.5) | RESOLVED | `FOUNDER_INPUTS_PHASE0_CLOSE_2026-08-24.md` |

**Acceptance lines.**

- *The full current test suite runs green locally before any change:* **PASS,
  read today.** `pnpm test --force` (uncached, so a replayed cache cannot
  stand in for a run), 11 turbo tasks successful, 0 cached, exit 0.
- *…and in staging:* **NOT MET.** Staging is not stood up; `STAGING_RUNBOOK.md`
  opens with founder-side dashboard steps that have not been reported done.
- *Every stack row carries a verified status:* met by the delta report.
- *Run-rate within the modeled software line, or a two-key exception filed
  first:* cannot be evaluated here; see the run-rate row.

**One Gate 0 housekeeping item not on the list but named by D2:** "Record the
promotion at Gate 0 housekeeping." The promotion IS recorded in REQ-074
(section 0.2). It is not recorded in `CLAUDE.md`, which is what actually
loads into a build session, and no accessibility guard exists. Reported.

### 2.1 The CAND list, reported and not assigned

Ownership is not proposed here; the founder's own assignments are already in
the ledger, transcribed verbatim from her response sheet of 25 August.

- **Four CANDs closed by decision** (`CAND_LEDGER.md:20-24`): CAND-PLAT-01
  (D1), CAND-A11Y-01 (D2), CAND-AUTH-01 (D3), CAND-DEV-01 (its own unmet
  trigger). SituationEvent merged rather than closed on merit.
- **Sixteen assigned CANDs** (`:53-68`), each carrying owner, forum and
  date/gate: OUTBOX-01, REL-01, PRIV-01, RESTORE-01, SYN-01, OBS-01,
  DELIV-01, INC-01, WORK-01, DEC-01, AUTHZ-01, ATTN-01, CHANGE-01, VND-01,
  3P-01, AI-01.
- **Eight recovered concepts** (`:40-47`), owner/forum/date filled from the
  founder's sheet: CaseHierarchy, ZoneState, FunctionalStateTarget,
  OrganizationPreferenceProfile, WorkCognitiveLoadProfile,
  RelationshipMomentRecord (HOLD, founder definition), VendorProviderProfile,
  AIHumanHandoff (gated to the Tier M PR).

**The structural gap: 24.7 requires four attributes and the ledger carries
three.** Owner, decision forum, target date, **and the named register it
promotes into**. The ledger's fourth column is "repo context (adjacency, not
disposition)", which is a different thing. No row names a promotion target.
Reported; filling it is a founder pass, since a register name is a
destination she chooses.

### 2.2 The trigger sweep, actual state only

- **Scheduled**: `services/worker/src/index.ts:211`,
  `upsertJobScheduler("registry-sweep-daily", { pattern: "0 9 * * *" })`,
  re-registered on every worker boot. The same block schedules the fleet
  digest (Mondays 13:00 UTC), client digest (Fridays 21:00 UTC), CPSC recall
  (Tuesdays 14:00 UTC), outbox drain (every 5 minutes, backstop only),
  shadow eval (hourly at :30) and an uptime check.
- **What one pass does**: `index.ts:164-177`, registry sweep, load signals,
  season materialization, photo purge, attention-record sweep, decision
  expiry, returning counts.
- **The second runner**: `packages/trigger-engine/src/run.ts` header, an
  inline pass in `apps/web` after each field write, sharing deterministic
  item ids so whichever arrives second inserts nothing.
- **Whether the Railway worker is currently consuming**: not observable from
  this container. The dashboard is the only control surface and no Railway
  CLI or config exists in the repo. **Not inferred either way.**

---

## 3. Task D. Phase 1 readiness, status only

| Phase 1 deliverable | Status |
|---|---|
| WK-SEC-001 white-box audit on staging with synthetic data, remediations filed | NOT RUN. **Corrected 28 August: the scope document IS in the repository** (`docs/library/WK-SEC-001_Application_Security_Audit_Scope.docx`, G-106), so its eight test areas and its pass criteria are readable. The pass criterion is zero unresolved critical or high findings touching tenant isolation, authentication and authorization, the photo layer, or the restricted-access class, plus the four named debt items fixed or formally risk-accepted, plus a retest |
| LLC ownership on GitHub org, hosting, database, object store, every billing account (24.8) | NOT CONFIRMED; and see 3.1 |
| Passkey MFA live for privileged accounts (D3) | NOT BUILT. Zero WebAuthn, passkey or FIDO references in application code; the only hit in the tree is a comment at `provision-hg.ts:15`. TOTP is what is live |
| Tested backup restore | NOT PERFORMED. Named as owed in `LAUNCH.md:37` and in `CUSTODY_SITTING.md:21` |
| Incident and rollback runbooks | PARTIAL. `DEPLOY.md` carries the deploy and rollback path; `docs/SECURITY.md` and `docs/STAGING_RUNBOOK.md` exist; there is no incident runbook by that name |
| brief-08 mappings closed (data inventory, access matrix, retention schedule per REQ-077, deliverability webhooks) | UNVERIFIABLE. Brief 08 is not in the repository. REQ-077's own gate is unbuilt (W-15) |
| Custody audit by a second qualified developer | NOT PERFORMED |

**Acceptance lines.**

- *Restore drill performed and timed within RPO/RTO (REQ-072):* not
  performed. The targets exist and are specific: `WK-DEV-001:69`, RPO 24h,
  RTO 8h, availability 99.5%, status page.
- *A simulated developer-offboarding executes cleanly from the account
  matrix:* not performed; the account matrix is founder-side.
- *Zero criticals open from WK-SEC-001:* vacuously true and meaningless,
  since the audit has not run.

### 3.1 One checkable finding inside 24.8

24.8 reads "The GitHub organization … are owned by Well Kept Home Operations
Management LLC". **The repository is not under an organization.** This was
established directly during the G-73 diagnosis, whose reading records "the
owner is a User so there is no org policy" as the reason an organization-level
Actions policy could not have been the cause. A personal account cannot hold
the ownership 24.8 describes, so this deliverable is not merely unconfirmed,
it is currently false in a way a founder-side check would confirm in one
page. Reported.

### 3.2 The four unordered `LIMIT 1` reads (G-95)

Unchanged since the finding was filed; listed with what each actually picks.

| Site | What it takes | Consequence of the wrong row |
|---|---|---|
| `packages/schema/src/dump-seed.ts:34` | any household, when no id argument is given | dumps the wrong household's playbook to a file |
| `packages/schema/src/provision-hg.ts:82` | any `corporate_admin` assignment for the actor | none material: the row is a permission existence check, and any row proves the same fact |
| `packages/schema/src/grant-corporate.ts:95` | same shape, same actor gate | same |
| `packages/trigger-engine/src/run.ts:117` | one observances field per household by `LIKE` prefix | a household with two observance-prefixed fields sweeps against an arbitrary one of them |

Two of the four are existence checks where the arbitrary choice is harmless
and the third argument is that saying so is better than silently "fixing"
them. `dump-seed.ts` and `run.ts:117` are the two where the row identity
matters. No guard is proposed, for the reason recorded in G-95: a static rule
against unordered `LIMIT 1` would fire on every legitimate existence check
and be allowlisted into silence.

### 3.3 Observability privacy

Reported against what exists, since WK-SEC-001's test areas are not
available.

- `telemetry-discipline.test.ts` covers two channels: the Sentry scrubber
  (cutting row-value leak shapes, wired in both inits with
  `sendDefaultPii: false`) and shipped `console` calls interpolating a
  sensitive-value identifier.
- The section 32 review's own reading (`BACKSTAGE_S32_GUARD_REVIEW_2026-08-27.md:80-93`)
  is that of the four named surfaces (logs, errors, replay, URLs), **replay
  and URLs are unguarded, and URLs are the live one**: `recorded()` and
  `refuse()` put a message into a query string, so a future author
  interpolating a field value into a confirmation would put a household value
  into a URL, into browser history, and into any access log in the path.
- The guard's own not-covered column concedes free text a developer writes
  into a message, and channels other than Sentry and console.

That is a known, written gap with a named live edge, not a new finding here.

---

## 4. Task F. Phase 2 status

Reported against 24.2's four pinned launch-scope items, in its order.

**1. The Household Record and ingest of the paper intake. PARTIAL.**
The record itself is built and in production use. The importer is
`tooling/import/wk_import.py`, and two things about it are worth stating
exactly: it parses a **WK_PLAY_002 Intake Workbook**, not
`HZ_Live_Household_Record_Master`, which is the source Phase 2 names; and it
writes a **seed JSON file**, with no path into the database. So the tooling
Phase 2 says to import "via the existing tooling/import package" exists, and
does not currently do what Phase 2 asks of it.

**2. Intake with ACH mandate capture against the D5 abstraction. ABSENT.**
No payments code of any kind: no processor, no abstraction, no mandate
object, no webhook receiver. See the shortlist delivered alongside this
document.

**3. The weekly digest. BUILT.**
`services/worker/src/digest.ts` (fleet, Mondays 13:00 UTC) and
`client-digest.ts` (client, Fridays 21:00 UTC), both scheduled at
`index.ts:212,216`. This is the one launch-committed item that is done.

**4. Arrival/departure event capture feeding payroll AND the REQ-083 covenant
report. PARTIAL, and the two halves differ.**
The events are emitted (section 1.1) and the visit writes its `time_entry`
row in the same transaction, which is the payroll input; payroll itself is
QuickBooks under ADR-004 and the app is correct not to compute it. The
covenant report does not exist (section 1.3), and its acceptance criterion is
not currently satisfiable as written (section 1.4).

**Two Phase 2 deliverables outside the pinned four, for completeness.**

- **The trainee role (D6): ABSENT.** Zero `trainee` references in the
  permissions package or the role vocabulary; the only hits are two comments
  saying the role does not apply.
- **The client anti-dashboard shell honouring D7: HELD, not built.** The D7
  guard exists and passes (`client-duration.test.ts`), and the client side is
  frozen at the digest by WK-DEV-007, which is the stricter posture. There is
  no shell to honour D7 yet because there is deliberately no new client
  surface.

---

## 5. Task E is recorded in the register

The three corrected rulings of 27 and 28 August are filed as **G-102**, with
the withdrawal kept visible rather than the ruling deleted. The requirements
collision is **G-103**; the geofence copy of section 1.5 is **G-104**.

---

## 6. Requirements housekeeping, reported and not changed

The instruction was to report before changing anything, and nothing in
`WK-DEV-001_Requirements.md` is changed by this document.

**6.1 Append REQ-078..082.** Nothing to do; see section 0.1.

**6.2 The REQ-031 / REQ-036 / REQ-083 collision.** Reported, not resolved.

- `REQ-031 (P0)`, line 35: the enforced close flow, in which "hours
  auto-capture" is one of the listed steps.
- `REQ-036 (P1)`, line 40: "Timer-free hours: geofenced arrive/leave
  suggestion with manual override (never auto-bill from geofence alone)."
- `REQ-083 (P0)`, line 97: the covenant report derives from visit
  arrival/departure events.

Three statements, one mechanism, two priorities. A P0 depends on capture that
another requirement places at P1, and **REQ-031's P0 auto-capture is not
met**: the implementation is two typed `datetime-local` fields. The priority
is a founder ruling and is not taken here.

The related correction: the geofence language in the code (section 1.5) is
REQ-036's own text, not a note about a hypothetical feature. Reading it as
reassurance about something that does not exist was wrong; it traces to a
real requirement that has not been built.

**6.3 REQ-074 against D2.** Not stale in the repo copy; see section 0.2.
Reported, with the P1-versus-baseline residual.

**6.4 REQ-003 against D3.** Reported, and it is not the same shape as the
others. `REQ-003 (P0)`, line 11: "email + password with mandatory TOTP MFA
for staff roles". D3: passkeys are the target, and "TOTP remains until
passkey migration and recovery are proven, then is retired for privileged
roles". **Those agree today.** The divergence is prospective: REQ-003 will be
wrong at the moment passkeys ship, and nothing in the requirement says so.
It is an unrecorded future amendment rather than a present contradiction.

**6.5 Four adopted decisions carry no requirement number.** Confirmed by
search: `WK-DEV-001_Requirements.md` contains no instance of ACH, mandate,
NACHA, trainee, passkey, WebAuthn, FIDO, or a client duration prohibition.

Proposed homes, as proposals only. **No numbers are proposed**, because
requirement ids are allocated at write time against the current maximum, and
two documents both claiming the next number will collide.

| Decision | Proposed home | Shape |
|---|---|---|
| D3, passkey MFA | Section A, as an amendment to REQ-003 rather than a new id | REQ-003 already owns staff auth; a second id for the same subject would create exactly the D2-style split this pass is cleaning up |
| D5, ACH mandate capture | A new requirement in a new billing section | Nothing in A-J covers payments at all; there is no existing section it belongs inside |
| D6, trainee role | Section A, beside REQ-003..006 | Roles and tenancy live there |
| D7, client-surface time quantities | Section C, client portal, as a prohibition | Its sibling prohibition REQ-071 is already there, and the existing guard (`client-duration.test.ts`) should be named in the text so the requirement points at its enforcement |

**6.6 REQ-016's P1 against Phase 2's launch commitment.** Reported.
`REQ-016 (P1)`, line 23: "Import: ingest WK_PLAY_002 workbook (xlsx) mapping
columns to field records; dry-run report before commit". Phase 2 makes an
importer launch-committed. Same collision shape as 6.2: a launch-committed
capability sitting at P1.

**With one wrinkle that should not be smoothed over:** REQ-016 names the
**WK_PLAY_002 intake workbook** and Phase 2 names
**HZ_Live_Household_Record_Master**. Those may be the same import path or two
different ones, and this repository cannot tell, because neither workbook is
in it. If they are different, REQ-016 is not the requirement Phase 2 is
waiting on and the launch-committed importer has no requirement number at
all, which would put it with the four in 6.5. **Founder-side to settle.**

**6.7 User stories.** No user stories were written and none should be. Which
of the four launch-committed items have none **cannot be answered from this
container**: there is no user-story document in the repository at all, and
`WK-DEV-002` is not present in `docs/`. What would settle it is one search of
the library copy for the four subjects: paper-intake ingest, ACH mandate
capture at intake, the weekly digest, and arrival/departure capture.

Stating it as unverifiable rather than answering from the four items' build
status, because "no code exists" and "no story exists" are different claims
and only one of them was checkable here.
