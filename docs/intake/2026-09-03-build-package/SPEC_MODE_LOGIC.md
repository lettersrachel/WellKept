---
status: frozen
---
# Spec · Guided, Normal and Expert modes, and the HOM development layer

Status: adopted 3 September 2026. Consumed by Q-15, Q-16, Q-17. Companion to WK-TRN-009, WK-SOP-020 and the Anticipation Engine (altitude two).

## 1. What a mode is
A mode is a property of one HOM on one household on one workflow class, not of a person. It sets how much the software surfaces (briefing density, standards shown inline, verification cues) and it is the evidence trail that time-to-Expert is measured from.

| Mode | Software behavior | Entry |
|---|---|---|
| Guided | Surfaces the relevant standard, household context, common failures, authority and verification cues on every step. | Default for every new HOM-household pair and for any workflow class the HOM has not demonstrated. |
| Normal | Shows household-specific exceptions and meaningful changes only. | Promotion criteria met (§2). |
| Expert | Nearly invisible; exceptions only. | Promotion criteria met and a full continuous quarter in Normal with no high-consequence error on that household. |

Workflow classes: visit sequence, close flow, vendor coordination, property observation, prepared decisions, safety and access, privacy and record discipline. Seven classes, matching the certification domains where they are operational.

## 2. Promotion and demotion
- Promotion Guided to Normal: certification in the matching domain at HOM I threshold (rubric 3+, or 4+ for high-consequence domains), plus three observed visits on that household with no correction on that class. Recorded with provenance, dated, and signed by trainer and second observer (two keys).
- Promotion Normal to Expert: one continuous quarter in Normal on that household with zero high-consequence errors and scorecard at 4.0 or above for the period.
- Demotion: automatic to Guided on any `high_consequence` error on that class and household, logged, with re-demonstration required before re-promotion. A member request for a different HOM does not demote; it opens a WK-STD-027 fit signal.
- Mode history is a table (`hom_household_mode`: hom_id, household_id, workflow_class, mode, from, to, evidence_ref, signer_1, signer_2). Never overwritten; the current mode is the latest row.

## 3. What the mode feeds
- Time-to-Expert per HOM and per source occupation: the learning metric for cohorts and the empirical training-distance data the sourcing model lacks.
- HOM II standard: Expert across a full book for two consecutive quarters at 4.0+ (brief §9).
- E2 measurement: process minutes by mode, so the leverage delta at promotion is attributable to the software rather than to tenure.
- Altitude two of the anticipation engine: suggestion load is throttled by mode; Guided pairs receive fewer offers.

## 4. The HOM development layer
- Cohort record: per cohort, dates, trainer per module, every certification check with retakes, evaluator, and the trainee feedback survey. Written the day it happens by the observer who watched. Append-only. This is the audit trail for insurers and a court.
- Scenario evaluation form as a record: outcome, structure, understanding, escalation, failure modes; pass / repeat / module review; three failed attempts at the same scenario open a material-revision item, not a person finding.
- Doctrine-change propagation by `consequence_class`: `editorial` updates silently; `behavioral` surfaces a contextual prompt on the next relevant step; `high_consequence` gates the workflow class until re-demonstration is recorded.
- Practice community artifacts (Monthly Round, Trick Book, Notice of the Month) live in the corporate portal. No leaderboard is ever computed from competence, speed, cognitive-load or process-mining data; the CI guard's pattern list includes ranking constructs over HOMs.
- Capture budget: minutes of non-visit capture per household per week, measured from the close flow and shown to corporate; the training program uses the measured figure, and the senior's load view carries it beside hours.

## 4a. AI release governance (before any inference leaves shadow)
- `ai_behavior_version`: model provider and version, prompt and tool-policy version, evaluation-suite version. Every consequential change runs unit and contract tests, the synthetic scenario suite (docs/FIXTURES.md §5), the abuse cases, staging, Household Zero, a small cohort, monitoring, then EXPAND, HOLD, ROLLBACK or KILL.
- AI action evidence envelope on every proposal: inputs, sources, procedure and policy version, model and tool-policy version, human confirmation where required.
- Reversibility classes govern gates: calendar mutation (fully reversible), vendor booking and purchase (compensatable), message sent (irreversible, higher gate, evidence only), physical access grant (revocable, never automatic; explicit human authorization, expiry, emergency revoke).
- Handoff packet contract: need, attempts made, verified context, sources, current state, blocker, decision, deadline, related refs. The receiving human owns the next step; the member or HOM is never asked to repeat what is already in authorized context.

## 5. Guardrails
Mode is never shown to a member. Mode changes are never automatic upward. The trainer of record and the second observer are distinct users; the schema enforces `signer_1 != signer_2`.
