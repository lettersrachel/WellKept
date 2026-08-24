---
status: frozen
---
# Founder Inputs · Phase 0 Close · 24 August 2026
Prepared for approval and paste-back to the development session (register draft A571). Sections 2-4 are complete drafts awaiting the founder's yes; section 1 is a two-minute fill-in. THIS FILE IS FIGURE-FREE AS WRITTEN; the moment section 1 is filled with amounts it becomes reference-only and must not enter source control · paste sections 2-4 into the repo docs and deliver section 1 separately.

## 1. Stack run-rate statement (REQ-085)

The fill-in template for this section is founder-held and becomes
reference-only the moment amounts enter it, per the standing rule that
financial figures never enter source control. The filled statement is
delivered separately; this repo copy records only that the statement
exists, what it covers (every stack provider's monthly amount and the
within-or-exceeds-the-modeled-line declaration), and that an exceeds
answer requires a two-key exception before any new commitment.

## 2. Demo-to-commitment ledger, tags resolved (WK-DEV-006 §24.5)
| Shown surface | Tag | Basis |
|---|---|---|
| Weekly digest | LAUNCH-COMMITTED | Built in the HO sprint; founder approves sample before first real send |
| Arrival-tap payroll + covenant events | LAUNCH-COMMITTED | REQ-083; exercised in the HO sprint |
| Capital plan | POST-LAUNCH · MANUAL-FIRST | Desk-assembled from member-provided documents only; REQ-084 bars all enrichment; app surface later |
| Desk triage with response timers | MANUAL-WITH-LOGGED-SLA | Humans triage; the system logs the SLA clock from day one, so the deck's timers are honest as service standards |
| Recall matching | EXISTS-VERIFY | A recall job exists in the worker per WK-DEV-004; dev confirms operational status in the next weekly note; green = LAUNCH-CAPABLE, else manual-first |
| School-calendar / mailing-cutoff updates | CONFIG-DRIVEN | Manual refresh acceptable at launch |
| Vendor COI tracking | P1 · POST-LAUNCH | Lands with the vendor primitive (see CAND-VND-01 date) |
Sales guidance, standing: anything not LAUNCH-COMMITTED is presented as how the SERVICE runs (people plus system), never as what the app does today.

## 3. CAND assignments (handoff §22 · per 24.7, anything left blank after this closes)
Closed by directive: PLAT-01 (D1), A11Y-01 (D2), AUTH-01 (D3). Closed by its own condition: DEV-01 (Control Tower; its trigger, team scale, is unmet; reopen by register entry when it is).
Remaining sixteen, assigned:
| CAND | Owner | Forum | Date / gate |
|---|---|---|---|
| OUTBOX-01 | Dev | Founder | Immediate; field_event_outbox is the seed; substrate workstream week one |
| REL-01 | Dev | Founder | Week one; the shadow engine's kill switches require it anyway |
| PRIV-01 | Dev | Founder | BEFORE HO real data enters; telemetry redaction tests are a Phase 1 line |
| RESTORE-01 | Dev | Founder | First drill satisfied by the HO sprint Day 1-2; standing quarterly thereafter |
| SYN-01 | Dev | Founder | With the sprint; journeys grow with each surface |
| OBS-01 | Dev | Founder | Phase 1 tail; correlation IDs before the dashboards build |
| DELIV-01 | Dev | Founder | Before the first real digest to HO; staging Resend ruling below serves its testing |
| INC-01 | Dev | Founder | Phase 1/2 boundary; the exception queue on the corporate board consumes it |
| WORK-01 | Dev | Founder | Nine-primitives substrate window (WK-DEV-007 §4) |
| DEC-01 | Dev | Founder | Substrate window; internal UI with the Cockpit, client UI deferred |
| AUTHZ-01 | Dev | Founder | Already authorized as the engine's authority machinery (WK-DEV-007 §3); same window |
| ATTN-01 | Dev | Founder | With the dashboards/notification workstream; no feature sends outside it thereafter |
| CHANGE-01 | Dev | Founder | HOM/corporate projection with the dashboards; client projection deferred per §0 |
| VND-01 | Dev | Founder | P1; with the vendor primitive, post-launch window |
| 3P-01 | Founder + Dev | Founder | Adopted now as PROCESS, zero build: every proposed integration passes the security/privacy/accessibility/degraded-mode review before the register entry WK-DEV-007 already requires |
| AI-01 | Dev | Two-key | Gated to the first model-inference dependency, which itself requires a register entry (WK-DEV-007 §3); the test suite lands in the same PR as that dependency |

## 4. Staging rulings (the two flagged decisions)
**RESEND_API_KEY in staging:** staging never gains the ability to email a real person. Separate Resend key on a staging subdomain, sends hard-allowlisted to internal test addresses only; real member addresses never enter staging data (the fixtures rule already guarantees this; the allowlist guarantees it twice). Delivery-state webhooks are exercised against the internal addresses, which is exactly the DELIV-01 test bed.
**Dormant well-kept-web Vercel project:** before any repurpose, inspect its environment for a production DATABASE_URL. If present: rotate that credential first, record the rotation in the custody ledger, then repurpose or delete the project; if absent, repurpose freely. Result in the next weekly note either way.

## 5. Truly founder-only, this week
The six staging dashboard clicks per STAGING_RUNBOOK.md (report the URLs back); the billing amounts for section 1; and the yes on sections 2-4 of this document.
