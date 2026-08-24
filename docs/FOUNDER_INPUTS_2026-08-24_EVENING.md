---
status: frozen
---
# Founder inputs, 24 August 2026 evening: proceed-with-recommendations dispositions

The founder's instruction, received in-session 24 August 2026 (evening):
proceed with recommendations for the two Cockpit rulings (stranger-mode
visibility, the day's-route source), the digest approval, the HZ
workbook, the staging clicks, the Task Inventory ruling, the
household_departure cause-code list, the run-rate line, and Friday's
go/no-go. This record freezes what that authorization resolved, what it
adopted as proposed defaults under WK-DEV-006 section 8, and what it
cannot move because the item is physically the founder's.

## Resolved and built the same evening

**1. Stranger-mode visibility: option (c), the per-field marker.**
Adopted because it is the only option in which no engineer chooses the
safety taxonomy: stranger mode hides every s2 surface except fields a
HUMAN explicitly marked stranger-visible, and s3 never shows in
stranger mode, marker or not. Safe default hidden. Built: the
stranger_visible column (migration 0039), the strangerMode overlay in
the permission core (applied after the role matrix, narrowing only;
100 percent coverage held with both directions tested), the briefing
API's server-side stranger projection (backup_hm always; a HOM opts in
with the one-gesture toggle before handing the phone over, with a
separate offline cache so a full briefing cached earlier can never
surface in a stranger's hands), the web field surface's backup_hm
projection, the STRANGER MODE banner, and the capture-time checkbox.
Proven live in four directions on the synthetic twin: normal shows s2;
stranger hides unmarked s2; marked s2 shows; marked s3 still hides.

## Adopted as rulings; the builds are queued

**2. The day's-route source: the assigned-households list, at training
scale.** Scheduling is Jobber's under ADR-004 and Ruling 2a; the app
holds no visit schedule, so a "route" would be invented order. The
picker's list satisfies the one-screen clause while one HOM serves few
households; the upgrade (a founder-entered day plan versus a Jobber
export) is deferred until a real multi-household day exists, and that
choice stays open, evidence-gated, not defaulted.

**3. The household_departure cause-code taxonomy, v1** (a proposed
default adopted under section 8 by this authorization; the register
transcription records it): relocated, ended_by_member,
ended_by_company, financial, life_event, other_documented (a note is
required with other_documented). Six codes, household-level, feeding
REQ-083's churn-with-cause; expressly not per-person data. The build
(a cause_code column on membership_event, the capture select on the
membership form, and the household.departure covenant event) is the
next migration session; REQ-083's gate is production-ready before the
first covenant reporting month, not this week.

**4. Task Inventory v1.3: reconstruction authorized.** The
locate-or-reconstruct ruling resolves to WK-DEV-008 section 4's second
arm: reconstruct from the playbooks, the Standards Store, and the
catalog's citation trail, registered as v1.4 with a lineage note. WL
Gate 0 unblocks; until the reconstruction session runs, WL Gate 1
objects may build against the provisional task list, flagged
provisional so no evidence rows bind to task IDs that may renumber.

**5. The digest: approved per the delivered sample.** The
client_weekly_digest flag may now be set. The flip itself is a
founder-side knob write against production (this environment holds no
production access by design): from the local session with database
access, set the feature_flags app_setting key's client_weekly_digest
to true through the established knob path, by name, never echoing the
connection. Nothing sends until a real household with a client
assignment exists, so the flip is safe to do at any time before HO
enters.

## Recorded, not executable from the build side

**6. Friday's go/no-go.** The standing recommendation is the sprint
directive's own structure: real intake only if every Phase 1
acceptance line is green; otherwise the pseudonymized fallback, which
loses nothing. Several Phase 1 lines are founder-side and unconfirmed
at this writing (LLC verification, passkey MFA, the restore drill),
so as of tonight the recommendation resolves to the FALLBACK unless
those lines turn green by Friday. The decision itself is made Friday,
by the founder, with the line-by-line status in front of her; an
authorization tonight cannot admit a real household early, and this
record does not pretend otherwise.

**7. Physically the founder's, unchanged by any delegation:** the six
staging dashboard clicks (her Vercel, Neon, Upstash, and Resend
dashboards; the repo-side half proceeds when the URLs come back), the
HZ paper-kit capture and transcription workbook, and the run-rate
amounts (figures never enter this repo; the weekly note carries the
pointer).
