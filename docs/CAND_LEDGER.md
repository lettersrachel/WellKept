---
status: living
---
# CAND ledger: handoff section 22 candidates with dispositions

The Gate 0 instrument for handoff 24.7: every CAND requires an owner, a
decision forum, a target date, and the register it promotes into,
recorded at Gate 0; "a candidate without an owner and date after Gate 0
is closed, not carried." Dispositions below are drawn from WK-DEV-006
and the adoption record; OWNER and DATE columns are deliberately blank
where they are the founders' to assign, per the standing rule that a
blank is a fine deliverable and a plausible default looks like a
decision somebody made.

## Closed by the directive (no owner needed)

| CAND | Closed by |
|---|---|
| CAND-PLAT-01 | D1 (platform of record confirmed; the map is `SYSTEM_OF_RECORD_MAP.md`, delivered) |
| CAND-A11Y-01 | D2 (promoted; REQ-074 at WCAG 2.2 AA) |
| CAND-AUTH-01 | D3 (passkey MFA target adopted; joins the brief-08 security checklist per A566 rather than duplicating it) |

## Surviving candidates awaiting owner, forum, and date

Notes are factual context from the repo, not recommendations.

| CAND | Priority | Owner | Forum | Date | Promotes into | Repo context |
|---|---|---|---|---|---|---|
| CAND-ATTN-01 | P0/P1 | | | | WK-DEV-001 | Phase 3 lists notification/attention budgets (handoff section 10) as evidence-gated |
| CAND-WORK-01 | P0/P1 | | | | WK-DEV-001 | deferral, paused_decision, condition_flag already share a lifecycle vocabulary; a common WorkItem model would generalize them |
| CAND-DEC-01 | P1 | | | | WK-DEV-001 | Prepared Decision component described in handoff 8.3 |
| CAND-AUTHZ-01 | P1 | | | | WK-DEV-001 | packages/permissions is per-action today; this is a larger engine |
| CAND-OUTBOX-01 | P0 substrate | | | | WK-DEV-001 | field_event_outbox already exists as a table; the candidate generalizes it |
| CAND-OBS-01 | P0 | | | | WK-DEV-001 | Sentry present; correlation IDs and error envelopes absent |
| CAND-REL-01 | P0 | | | | WK-DEV-001 | no feature-flag mechanism exists |
| CAND-SYN-01 | P0 | | | | WK-DEV-001 | the airplane e2e covers the offline journey; permissions/decision/consent journeys are unit-tested, not synthetic-journey-tested |
| CAND-PRIV-01 | P0 | | | | WK-DEV-001 | payload guards cover responses; log/error redaction is unguarded |
| CAND-VND-01 | P1 | | | | WK-DEV-001 | no vendor trust ledger exists |
| CAND-DELIV-01 | P0/P1 | | | | WK-DEV-001 | the Resend delivered-but-never-arrived case (AO brief) is this candidate's motivating defect |
| CAND-3P-01 | P1 | | | | WK-DEV-005 process | REQ-084's CI check is the first instance of the class |
| CAND-INC-01 | P0 | | | | WK-DEV-001 | incident_report exists; containment/postmortem lifecycle does not |
| CAND-RESTORE-01 | P0 | | | | WK-DEV-001 | overlaps the Phase 1 acceptance line (timed restore drill) and G-02; whichever forum owns Phase 1 custody naturally owns this |
| CAND-AI-01 | P0 for AI features | | | | WK-DEV-001 | no AI feature exists yet; gates the transcript-ingestion brief (counsel packet section 8) |
| CAND-CHANGE-01 | P1 | | | | WK-DEV-001 | the client card and briefing deltas are partial instances |
| CAND-DEV-01 | Later | | | | none yet | the handoff itself says only when team/system count demands it |

Per 24.7, rows still blank after Gate 0 close as CLOSED, not carried.
The founders fill owner/forum/date; this ledger records the outcome
either way at the next housekeeping pass.
