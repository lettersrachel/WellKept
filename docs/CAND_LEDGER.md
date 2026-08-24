---
status: living
---
# CAND ledger: handoff section 22 candidates with dispositions

The Gate 0 instrument for handoff 24.7. First drafted 24 August with
owner/forum/date blank; **closed the same day by the founder's Phase 0
inputs document** (`FOUNDER_INPUTS_PHASE0_CLOSE_2026-08-24.md` section 3,
register draft A571): sixteen candidates assigned, one closed by its own
condition, none left blank, so nothing closes by default under 24.7.

## Closed

| CAND | Closed by |
|---|---|
| CAND-PLAT-01 | D1 (platform of record confirmed; the map is `SYSTEM_OF_RECORD_MAP.md`, delivered) |
| CAND-A11Y-01 | D2 (promoted; REQ-074 at WCAG 2.2 AA) |
| CAND-AUTH-01 | D3 (passkey MFA target adopted; joins the brief-08 security checklist per A566 rather than duplicating it) |
| CAND-DEV-01 | Its own condition: the trigger (team scale) is unmet; reopen by register entry when it is |

## Assigned (founder inputs section 3, 24 August 2026)

| CAND | Owner | Forum | Date / gate | Repo context |
|---|---|---|---|---|
| OUTBOX-01 | Dev | Founder | Immediate; substrate workstream week one | field_event_outbox is the seed |
| REL-01 | Dev | Founder | Week one | the shadow engine's kill switches require it anyway |
| PRIV-01 | Dev | Founder | BEFORE HO real data enters | telemetry redaction tests are a Phase 1 line |
| RESTORE-01 | Dev | Founder | First drill in the HO sprint Day 1-2; quarterly thereafter | overlaps the Phase 1 acceptance line and G-02 |
| SYN-01 | Dev | Founder | With the sprint; journeys grow with each surface | airplane e2e is the existing member of the class |
| OBS-01 | Dev | Founder | Phase 1 tail; correlation IDs before the dashboards build | Sentry present; envelopes absent |
| DELIV-01 | Dev | Founder | Before the first real digest to HO | staging Resend ruling is its test bed; the AO delivered-never-arrived case motivates it |
| INC-01 | Dev | Founder | Phase 1/2 boundary | the corporate board's exception queue consumes it |
| WORK-01 | Dev | Founder | Nine-primitives substrate window (WK-DEV-007 section 4) | deferral/paused_decision/condition_flag share the vocabulary it generalizes |
| DEC-01 | Dev | Founder | Substrate window; internal UI with the Cockpit, client UI deferred | Prepared Decision component, handoff 8.3 |
| AUTHZ-01 | Dev | Founder | Substrate window; authorized as the engine's authority machinery (WK-DEV-007 section 3) | packages/permissions is per-action today |
| ATTN-01 | Dev | Founder | With the dashboards/notification workstream; no feature sends outside it thereafter | |
| CHANGE-01 | Dev | Founder | HOM/corporate projection with the dashboards; client projection deferred | briefing deltas are partial instances |
| VND-01 | Dev | Founder | P1; with the vendor primitive, post-launch window | |
| 3P-01 | Founder + Dev | Founder | Adopted now as PROCESS, zero build | every proposed integration passes the security/privacy/accessibility/degraded-mode review before its register entry |
| AI-01 | Dev | Two-key | Gated to the first model-inference dependency, itself register-visible (WK-DEV-007 section 3); the test suite lands in the same PR as that dependency | no AI feature exists yet |
