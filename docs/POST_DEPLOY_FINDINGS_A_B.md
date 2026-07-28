---
status: frozen
---
# Post-deploy sessions A and B: findings
> Dated verification record. Historical evidence, not living copy: findings
> are as of the stated date. Excluded from style sweeps (the W-13 em-dash
> rule applies to living documents, not this record). Do not edit for style.

Run 2026-07-27 against main `3c22bac`, read-only, per
[POST_DEPLOY_SESSIONS.md](POST_DEPLOY_SESSIONS.md) standing rules: findings
reported with evidence, nothing fixed, the founder decides what happens next.

---

## Session A. The audit invariant — which world

**Verdict: world one, with one precision. The invariant is structurally
enforced — by ordering and abort-on-failure, not by a shared database
transaction. The counsel packet's claim is supportable as written.**

Evidence, per question:

1. **The path, end to end.** Client: `RevealButton.tsx` — a single `fetch`
   to `POST /api/reveal` on click, button disabled while in flight. Server:
   `apps/web/src/app/api/reveal/route.ts` — field row read (line 24) →
   principal from session + household assignment (line 28) → TOTP step-up
   gate (line 34) → rate limit (line 40) → permission decision (line 49) →
   audit insert (line 59) → vault decrypt (line 76) → value returned.
2. **Same transaction?** No. The field read, the audit insert, and the
   vault decrypt are three sequential awaited operations; no
   `db.transaction` anywhere in the route. The insert autocommits before
   the decrypt begins.
3. **The load-bearing question: does a failed audit write abort the
   reveal?** Yes, structurally. The insert sits alone in a try/catch whose
   failure path returns `{ok:false, reason:"audit write failed: reveal
   refused"}` with status 500 (route.ts lines 68–71, comment in source:
   "The log is not optional: no audit row, no value"). The decrypt runs
   only after the insert resolves. There is no code path on which a
   decrypted value reaches the client without a committed audit row.
4. **Asynchronous, queued, backgrounded, or unchecked?** None of the four.
   The insert is awaited inline and its failure is handled. Nothing about
   this write is fire-and-forget.
5. **Retry logic that could duplicate a row?** None found. The client
   fires one fetch per click and disables the button while busy; the
   server has no retry; the fetch API does not retry POSTs.
6. **Any render path that writes `s3_corporate_view`?** No. The reveal
   kinds are written in exactly one place in the tree (`route.ts:59` —
   verified by repo-wide search). The two other files touching those kind
   strings only read: `lib/data.ts:254` filters the audit summary;
   the drill-in page displays rows. A server-component re-render cannot
   produce a log entry.
7. **Do G-34 and G-33 share a single cause?** No — the design that would
   unify them (fire-and-forget write plus render-triggered logging) does
   not exist here.

**What this means for the two anomalies:**

- **G-34 (missing row, 2026-07-26) is bounded, not explained.** Given this
  code, a missing row after a fresh decrypt is close to impossible. One
  benign mechanism exists: the client caches a revealed value for 60
  seconds (`RevealButton.tsx:13`) and re-shows it without a new fetch —
  one audit row per reveal ACTION, not per look. The 07-26 report is also
  most consistent with observation error: it occurred during the
  stale-page period, no logs were running, and the same day produced
  multiple screen-reports that were later retracted against the database.
  Disposition can move from watch-with-alarm to watch-bounded; a
  recurrence with logs running still gets investigated immediately.
- **G-33 (extra row on refresh) has no supporting mechanism in the code.**
  No render path writes; a refresh does not replay a fetch. Most
  consistent with an unremembered second click. Unreproduced; stays filed.

**Suggested counsel-packet refinements (wording only, packet not edited):**

- Keep the existing claim; optionally sharpen to: "the audit entry is
  written and committed before the value is decrypted, and a failed audit
  write aborts the reveal — the log is load-bearing, not advisory."
  Avoid the word "transactional": the enforcement is sequencing, and that
  is sufficient for the claim being made.
- Add one sentence: "a revealed value remains visible for sixty seconds
  and re-displays within that window without an additional log entry —
  the trail records reveal actions, not seconds of viewing."
- For completeness: a committed audit row can exist for a reveal whose
  decryption subsequently failed. The error is in the safe direction
  (over-logging).

---

## Session B. Legal drift since counsel packet rev 3

**Verdict: the collection documents kept pace; the counsel packet did not.
Rev 3 verification (2026-07-25, against main `69b6631`) PRECEDES migrations
0020–0022 (merged 2026-07-27) — the packet describes a system three data
categories smaller than the one counsel will be advising on. And one
mechanism drifted: the erasure tool does not reach any of the three new
tables.**

**Q1 — the drift table:**

| Category | Privacy notice | legal/README | Counsel packet |
|---|---|---|---|
| `time_entry` | ✓ ("Service time & costs" row) | ✓ (Service time & cost records, with G-13 pointer) | ✗ absent |
| `cost_entry` | ✓ (same row) | ✓ (same bullet) | ✗ absent |
| `membership_event` | ✓ ("Membership record" row) | ✓ (Commercial record) | ✗ absent |
| `referral_source` / `referral_note` | ✓ (same row) | ✓ (same bullet) | ✗ absent |
| `prompt_outcome.was_news` / `dismiss_reason` | ✓ (updated wording) | ✓ (extended 2026-07-27) | ✗ (describes pre-session-A outcomes) |
| `incident_report.preventable_by_prompt` + links | ✓ (updated wording) | ✓ (extended) | ✗ |

**Q2 — employee data in a client-facing document?** Partially, and the
reviewer's underlying concern is confirmed. The privacy notice's "Service
time & costs" row describes time in household-service terms and does not
name staff attribution — defensible for a client-facing document. But the
personnel HALF of the same records (hours attributed to a named House
Manager) is currently disclosed NOWHERE, because the G-13 staff-facing
disclosure does not exist. `legal/README.md` carries the pointer; the
document it points to is unwritten. This belongs in session D's filing:
G-13 gates hiring, not just capture session 5.

**Q3 — receipt photos.** Confirmed: a receipt is a `visit_photo` row
referenced by `cost_entry.receipt_photo_id`, so it inherits the rolling
purge and hold behaviour automatically — one photo lifecycle. WORDING GAP:
the notice's photo language lives under visit records ("tasks, hours,
notes, photos") and does not obviously cover a receipt. Suggested addition
to the "Service time & costs" row: "a receipt photo, where one is
captured, is stored and retained exactly like a visit photo."

**Q4 — does `erase-household.mjs` reach the new tables? NO.** Verified by
search: the tool references none of `time_entry`, `cost_entry`,
`membership_event`, nor the new `household.referral_note` free text. A
household erasure today would leave behind its time entries, cost entries
(including any `note` and `miles`), membership history (including
cancellation reasons — s2 free text), and referral note. The deletion
story the privacy notice tells quietly stopped being true three migrations
ago. **This is the one finding that needs a fix before the packet goes to
counsel** — the fix is a session of its own (per standing rule 1, nothing
was changed today). Note for that session: what erasure SHOULD do per
table is itself partly a counsel question (time entries are employer
records; membership events are business records) — the tool likely wants
the same preserve-by-default-with-flags pattern the incident register got.

**Q5 — verification date vs migrations.** Confirmed from the documents:
`COUNSEL_PACKET_VERIFICATION.md` is dated 2026-07-25 against main
`69b6631`; migrations 0020–0022 merged 2026-07-27. Verification precedes.
The packet needs a rev 4 pass covering the three new categories and the
erasure answer before the custody sitting.

**Suggested packet rev-4 additions (wording, not applied):** one paragraph
under "what the software holds": "Since verification, the system also
captures categorized service time (delivery, travel, intake, admin,
training) attributed to the staff member who worked it; non-labor costs
(supplies, materials, mileage, other) with optional receipt photos that
follow the standard photo retention; the household's referral source; and
membership state changes (start, tier change, pause, resume, cancellation
with reason and initiator) as an append-only history. QuickBooks remains
the billing system of record; these records capture that state changed,
never that money moved. Questions for counsel: whether staff-attributed
time requires the staff disclosure before a non-founder logs hours (we
believe yes), and what erasure should preserve from these categories."

---

## What was NOT done, per the standing rules

No fixes, no packet edits, no gap entries filed (session D's job, so A and
B findings land together), no migrations. Founder decisions this report
tees up: authorize the erasure-tool extension session; authorize the packet
rev-4 edit; then sessions C and D per the brief.
