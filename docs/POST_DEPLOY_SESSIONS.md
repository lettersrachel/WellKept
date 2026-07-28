---
status: living
---
# Post-deploy review: Claude Code sessions

Prepared 27 July 2026, from the review of `WK_STATUS_REPORT_20260727.md`.

**Paste one session at a time**, with the standing rules below. Four sessions.
Two are read-only investigations, two are small changes.

**Most of what the review surfaced is not in this file**, because it is not
software. Hiring a House Manager, binding insurance, recruiting a household,
writing the G-13 staff disclosure, and signing two decisions are the critical
path, and none of them is a session. The list at the end names them so they do
not disappear into a build queue.

**Session A is time-sensitive and should run before the custody sitting.** The
counsel packet asserts that audit rows are written before secured values leave
the server. Session A determines whether that claim is currently supportable. An
attorney should not draft against it until it has been checked.

---

## Standing rules

1. Read-only sessions are read-only. Report findings; do not fix. The founder
   decides what happens next.
2. No guessing. If something cannot be determined from the tree, say so.
   Unverifiable is a valid finding.
3. Quote the evidence: file and function or line, for every claim.
4. One migration per session, if any. If it feels like two, the session is too
   big; report that instead.
5. Never echo `DATABASE_URL`, `WK_KMS_KEY`, `AUTH_SECRET`, or the contents of
   `.neon-connection`. Never run the erasure tool with `--commit`.
6. No em dashes, no AI jargon, plain prose.
7. Any commit that adds or changes a data category updates `legal/README.md` and
   the privacy notice collection table in the same PR.
8. Gap register IDs are allocated at filing time. Read the current maximum from
   `docs/GAP_REGISTER.md` rather than assuming it is still G-39. Same lesson as
   migration numbers.

---

## Session A. The audit invariant, G-34 and G-33 together

**Read-only. Run before the counsel meeting.**

**Why this matters more than its size.** G-34 is filed as one unexplained missing
audit row, disposition watch-and-see. That disposition assumes the question is
whether it recurs. The real question is which of two worlds you are in, and it is
answerable today without a reproduction.

If the audit insert and the value read are one transaction, and a failed audit
write aborts the reveal, then a missing row is close to impossible and one
appearing is a serious signal. If instead the audit write is a separate
operation, fire-and-forget, queued, or wrapped in a swallowed try-catch, then a
missing row is ordinary and fully explained, and the invariant was never
structurally enforced. Those two worlds call for completely different responses,
and the counsel packet currently asserts the first one.

**Treat G-33 as the same investigation.** One row missing, one row appearing
spuriously, same subsystem, both unreproduced. Two anomalies pointing in opposite
directions say more about determinism than either alone. Filing them separately
is how that signal gets lost.

**Questions to answer, with evidence:**

1. Locate the s3 reveal path end to end, from the client action to the returned
   plaintext value.
2. Is the audit insert inside the same database transaction as the read of the
   secured value? Quote the transaction boundary.
3. If the audit insert fails or throws, does the reveal abort and return nothing,
   or does the value still reach the client? This is the load-bearing question.
4. Is the audit write ever asynchronous, queued, backgrounded, or awaited without
   its result being checked? A queued write would fully explain G-34.
5. Is there retry logic anywhere in the path that could produce a duplicate row?
6. For G-33 specifically: is there any path that writes `s3_corporate_view` on
   page render rather than on an explicit reveal action? Check server component
   re-execution, and whether an already-revealed value in session state
   re-triggers a log on refresh. A render-triggered log would explain a row
   appearing without a click.
7. Do the missing-row and extra-row symptoms share a plausible single cause? If
   the write is fire-and-forget and a render path also logs, both symptoms follow
   from one design.

**Report:** which world, with evidence. If the invariant is not structurally
enforced, say so plainly and state what the counsel packet should say instead.
Do not fix it in this session; the fix may be a transaction boundary change and
that deserves its own review.

---

## Session B. Legal drift since counsel packet rev 3

**Read-only. Run before the counsel meeting.**

**Why.** Three capture sessions shipped after the packet was code-verified.
`time_entry`, `cost_entry` and `membership_event` are new data categories, plus
new columns on `prompt_outcome` and `incident_report`. The status report says the
collection tables are current through session 3; the packet itself is described
as rev 3 and it is not clear whether verification preceded or followed those
merges.

**The item that matters most.** `time_entry` attributes hours to a named House
Manager. That is a personnel record, not household data. The privacy notice is
client-facing and does not cover employees, and the G-13 staff-facing disclosure
does not exist yet. So this category may be disclosed in the wrong document, or
in none.

**Questions to answer:**

1. For each of `time_entry`, `cost_entry`, `membership_event`, `referral_source`,
   and the new columns on `prompt_outcome` and `incident_report`: is it in the
   privacy notice collection table, in `legal/README.md`, and in the counsel
   packet's "what exists" paragraphs?
2. Is any employee data currently described in a client-facing document, where it
   does not belong?
3. Receipt photos are stored as `visit_photo` rows by reference. Confirm they
   inherit the same rolling purge and hold behaviour, and that the notice's photo
   language covers a receipt as well as a room.
4. Does `erase-household.mjs` reach all three new tables? A household deletion
   that leaves time entries, cost entries and membership history behind is a
   deletion story that quietly stopped being true.
5. Does the packet's rev 3 verification date precede or follow migrations 0020 to
   0022?

**Report:** a drift table, with suggested wording for anything missing. Do not
edit the packet or the drafts.

---

## Session C. Three small fixes

**Gate:** none beyond the deploy. Each is independent; one migration at most.

**1. Mileage substantiation.** `cost_entry` records mileage as an entered amount.
IRS substantiation for a vehicle expense generally wants date, business purpose,
and destination, not just a number. Check what the table captures. If purpose and
destination are absent, report what a migration would add, and do not add it
without founder confirmation of the field list.

**2. Incident back-link skip rate.** The `preventable_by_prompt` question is
skippable by design, which was the right call. But if it is skipped most of the
time, the Misses panel stays empty and the only false-negative stream in the
business is decorative. Add a completion rate to `/oversight/triggers` beside the
Misses panel: the share of resolved incidents that carry an answer. No threshold,
no alert, just the number. It tells you whether the mechanism is working before
you rely on what it produces.

**3. Migration count.** The status report says 23 migrations applied, while its
own narrative accounts for 0014 through 0022. That reconciles only if numbering
starts at 0000. Confirm and make the count unambiguous wherever it is stated, so
a reviewer does not have to work it out.

---

## Session D. Record the gates that do not exist yet

**Gate:** after sessions A and B, so their findings can be filed at the same
time. This is documentation, not code.

**Gap register entries to file** (read the current maximum ID first):

- **Personnel data captured without staff disclosure.** `time_entry` records
  hours against a named House Manager. G-13 is unwritten. Nothing has gone wrong
  because the only person logging hours is a founder, but the disclosure has to
  exist before a real House Manager enters a single row. This makes G-13 a gate
  on hiring, not only on capture session 5. Cross-reference from
  `CORPORATE_CAPTURE_SESSIONS.md` session 1, whose gate was written as deploy
  clean and should have carried the G-13 condition.
- **After-the-fact time entry and W-2 recordkeeping.** No live clock is fine at
  pilot scale while a founder logs their own time. It becomes an employer
  recordkeeping question the moment a non-exempt employee reconstructs their own
  hours from memory. File the trigger as the first non-founder time entry rather
  than a household count.
- **Membership price duplicated across systems.** `membership_event` carries a
  price per event, and QuickBooks is the system of record for billing. Nothing
  reconciles the two. This is the ADR-004 seam appearing where it was always
  going to appear first.
- **Unbounded spend after the Upstash upgrade.** The plan change replaced a quota
  failure with a spend failure. No cap or alert is mentioned anywhere.
- **Intake hours capture is not in any runbook.** Session 1 shipped an `intake`
  category. Nothing requires anyone to use it during the first onboarding. That
  number decides whether the 108-household model arithmetic works, it is
  capturable precisely once, during a chaotic first week. The schema is necessary
  and not sufficient.
- Plus whatever sessions A and B return.

**Document notes to add:**

- `LAUNCH.md` §2.4: the drafted position depends on Neon point-in-time recovery
  being sufficient, and the restore drill that would demonstrate that is still
  pending. Note that the signature should follow the drill, not precede it.
  §1.2 already establishes that a recovery path is theoretical until exercised.
- `PARALLEL_PILOT_PROTOCOL.md`: the friction log's home and owner were last seen
  bracketed. The protocol is what makes the pilot produce evidence rather than
  activity, so those brackets are a gate on the pilot starting, not a tidy-up.

---

## Not Claude Code work, and the actual critical path

Listed here so it does not vanish into a build queue.

1. **Hire a House Manager.** Nothing in the pilot starts without one.
2. **Bind insurance.** General liability, a bond, workers' compensation, cyber.
   Workers' compensation attaches from the point of employment in Virginia, not
   from the first visit, so it precedes the hire rather than following it.
3. **Recruit and consent the first household.**
4. **Write the G-13 staff disclosure.** One page. It now gates hiring, per
   session D above.
5. **Send the counsel outreach; hold the custody sitting.** Sessions A and B
   should land first so the packet is accurate when it arrives.
6. **The two chores and the two signatures**, with §2.4 following the restore
   drill.
7. **Fill the parallel pilot protocol brackets.**

The status report's one-line summary says the critical path runs through a
meeting, two signatures and two dashboard chores. Items 1 through 3 above are the
real path, they are months rather than afternoons, and they are the least legible
work available, which is why they fell out of a report assembled from the
repository.
