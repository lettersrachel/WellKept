---
status: frozen
---
# Comprehensive instruction, 4 September 2026

Author: Rachel Letters, CEO. Paste whole, after the two ruling files and the preparation batch. This supersedes nothing already given; it adds doctrine, self-audit work, and queue rows, and it is written to be complete so that no further additions are needed before the work begins.

Standing constraints for everything below: the build queue continues under the standing authorization and is not paused for this. Document-only unless an item says otherwise. Invent no doctrine and no household facts. Mark every blank as needing me or the COO by name. Report each item as it lands rather than batching. Where an item below contradicts something already in the tree, report the contradiction rather than reconciling it.

---

# Part One: client-side doctrine, ruled

Record these as doctrine before any member surface is built. Tell me where the current code already contradicts any of them, and flag any future queue row that would.

1. **What the member is never asked.** Never to categorize their own tasks. Never to check whether something happened. Never to rate a visit. Never to confirm what the record already knows. Never nudged to engage. The refusal is the differentiator; every competitor's product is built on the opposite.
2. **A weekly contact ceiling of three**, across every channel: the weekly digest plus up to two decisions. Anything urgent under the materiality rules is exempt. The decision inbox stays the only member push surface and quiet hours bind it. If a household is hearing from us more than three times in a week, something upstream is wrong and the system should say so rather than send.
3. **The member never sees the machinery.** No stages, modes, confidence scores, inference labels, capture artifacts or knowing-states. A member sees a decision or a completed thing, never the reasoning that produced it. This is already true by guard for `stage`; it now covers everything after.
4. **A member may always correct a fact about themselves and always change a standing instruction.** Everything else goes through their HOM, because the relationship is the product rather than the interface.
5. **The voice rule, stated substantively** rather than only as the em-dash guard: plain, brief, never cheerful, never apologetic, never "we noticed", never a phrase that implies the household is being watched. Put it beside the copy guard so the guard has a stated intent.

Deferred to the 25 September session with the COO: who in a household counts as a member, whose confirmation counts for Decision Rights, and what happens when two members of the same household disagree.

---

# Part Two: HOM-side doctrine, ruled

Same treatment: record as doctrine, report contradictions, flag future rows.

1. **What the software never asks a HOM to do.** Never to justify her time in the app. Never to rate her own performance. Never to explain a gap. Never to compete with another HOM. The judgment-free guard bars the schema fields; this bars the interactions.
2. **What is never measured about her, including corporate-only:** speed per task, idle time, app dwell, location outside a visit. None of it is collected, on the principle that a measure which exists is eventually used.
3. **Dissent is a first-class action, not a note field.** When the software proposes something she believes wrong for that household she can say so, it persists, it reaches corporate, and it feeds the ranked error list. A system that records only compliance trains its operators to stop noticing, and we are staking the company on operators who notice.
4. **She sees the full permitted record for her assigned households, standing**, not need-to-know per visit. Judgment requires context.
5. **A mode demotion is developmental.** It feeds training and the scorecard conversation. The software never initiates a performance action.
6. **Her own data is hers.** She can see everything the system holds about her work, can export it when she leaves, and what is retained afterwards is only what the household's continuity requires. Open a queue row if this needs one.

---

# Part Three: security self-audit, before the assessment

Run a self-audit against what an assessor will look for, and fix or guard what you find. This exists to reduce what the assessor bills us for, so err toward reporting more rather than filtering. Cover at minimum:

- Dependency vulnerabilities, including unmaintained packages.
- Secrets reachable in logs, error responses, Sentry events or crash reports.
- Magic-link expiry, single use, rate limiting on issuance, and replay behaviour.
- Rate limiting on every public route.
- Object-level authorization on every route taking an id. This is a different question from whether the action declares a permission.
- Security headers and cookie flags.
- Photo upload validation, size limits, and serving behaviour.
- The offline queue replaying a stale write after a permission change.
- Error verbosity reaching a client.

Prefer a guard over a fix wherever the finding is a class rather than an instance, with both-directions proof as usual. Report what you found before fixing anything that changes behaviour, and say which findings you judged real versus theoretical. Never fix a finding by weakening a guard, widening an allowlist or adding an excusal; that stays a round trip to me, as always.

---

# Part Four: proactive assurance, beyond security

Documents unless a gap needs code. Report gaps rather than filling them with reassurance.

1. **A privacy self-assessment**, answering end to end: what the system knows about a family, who inside the company can see it, and what a member would be surprised to learn.
2. **A threat model for the household context specifically**, not the generic web one. Name the real threats: a lost or stolen HOM phone with household access, a departing employee, a household in conflict, an abusive partner seeking information, a subpoena, a member's own device compromised. Say plainly which have answers in the tree and which do not.
3. **A data-minimization page**: every field we store about a person, why each exists, and what we deliberately do not store, provable from the schema rather than asserted.
4. **A documented proof of deletion and portability**, run against a real household: the household deleted and shown gone, an archive restored whole elsewhere. Maple's shutdown makes portability a live concern and we are the only ones in the category who can show it working.

---

# Part Five: corporate capabilities a technical reviewer will ask for

Prioritized. Build the first two now; the next two after; open rows for the rest.

**Build now**

1. **An operational health surface**: worker drain lag, failed and dead-lettered jobs, webhook silence, and migration drift between disk and database, with a stated alerting posture. Several of these exist scattered; one surface with an alerting position is what a reviewer expects and rarely finds.
2. **Perform and document one real backup restore** from Neon point-in-time recovery, verified rather than assumed. Today the honest answer to "has a restore ever been tested" is probably no, and doing it once converts an assumption into a fact.

**Build after those**

3. **Read auditing on sensitive fields**, so we can show every staff person who viewed a household's S2 or S3 data in a period. Provenance covers writes; a reviewer asks about reads, and for a company handling household intimacy this is the expected control.
4. **A demonstrable deletion proof** covering logs and backups, not only tables, with an honest statement of what we cannot prove.

**Open rows, placed where the queue's logic puts them**

5. A subject-access capability: everything held about one named person, where it came from, who touched it, produced on demand.
6. After-the-fact reconstruction of a past AI proposal: the facts it rested on, the behaviour version, the policy that day, who confirmed it. Q-17b builds the envelope; this is querying it later, and it is the answer to "what if the AI is wrong."

**Report, do not build**

7. What a reviewer would find if I were unavailable for a month: whether anyone else can deploy, rotate a credential, restore a backup or respond to an incident, and what would need writing down to change that answer. One person built and operates all of this and a reviewer will notice.

---

# Part Six: queue rows to open for the raise and for testing

Place each where the queue's logic puts it, with acceptance criteria. Report if any cannot be built without crossing the WK-DEV-007 freeze or the fixture guard, and do not build those.

1. **A scripted five-minute demonstration path** over a fixture household, with a reset, exercising the full sequence: a fact confirmed, the cascade offering implications, a decision routed, a vendor visit with no invoice appearing as a reconciliation finding. It must run identically every time.
2. **A diligence evidence export**: guard inventory, migration ledger, CI history, session logs and the gap register, in a form I can hand a technical reviewer. The story is unusually strong and currently lives where nobody outside can read it.
3. **A read-only investor view of a fixture household on a shareable link**, corporate-scoped, fixture-only by construction so no real household is ever reachable through it, with the demonstration path's sequence visible. A partner should be able to open it after a meeting without me present.
4. **The leverage metrics page**: M-25, process minutes per verified outcome, and households per HOM, rendered against whatever data exists. Tell me first whether these render anywhere today; if they do not, this row builds them.
5. **The Foundation Reset workflow**, if Part Twelve of the preparation batch has not already opened it.
6. **The staff-side member-view render**, read-only and corporate-scoped, same caveat.

---

# Part Seven: shadow mode on now

Turn every shadow-mode feature on for the three test households the day it ships, rather than waiting for E2. The features are already shadow-flagged and the review surface is in the preparation batch, so this costs nothing and starts the evidence accumulating six to eight weeks before it is needed. The most persuasive artifact in an October fundraising conversation is a curve, not a demo: how many anticipations fired, how many the COO marked right, what the software caught that a person would have missed.

---

# Part Eight: how to run all of this

- The build queue continues under the standing authorization and takes precedence. Everything here runs alongside it.
- Order within this instruction: Part Three and Part Five items 1 and 2 first, because they are cheap and currently unknown; then Parts One and Two, because they are doctrine that shapes what gets built after; then Part Four; then Part Six's rows in queue order; Part Seven applies continuously from now.
- The standing authority already given applies throughout: close calls are reports rather than questions, migration splits and queue-row corrections are pre-authorized, guard findings become rows, additive shadow and server-only deploys are yours after preflight, and missing specs do not stop the run.
- Never pre-authorized, here as everywhere: anything member-facing, anything that widens an allowlist or lowers a guard's floor, anything touching a two-key adoption.
- If any item in this instruction is already done, or already contradicted by something in the tree, say so rather than building it twice.
