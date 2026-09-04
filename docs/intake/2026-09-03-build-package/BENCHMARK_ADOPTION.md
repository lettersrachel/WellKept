---
status: frozen
---
# Benchmark adoption · what the Engineering Benchmark brief changes

Status: adopted 3 September 2026. Records how the 101-product Engineering Benchmark, Architecture and Failure-Lesson Brief and its PantriApp revision are absorbed. The brief is plan-of-record design direction; this file is the build authority for what it changed.

## 1. What is adopted as written
- The six architecture conclusions, twelve anti-patterns, the build-versus-buy table, the four separations and the "do not build now" list. They are now invariants 16 to 20 and the build-versus-buy section of CLAUDE.md.
- The definition for external use: a household operating system is not an app containing multiple services; it is persistent household state plus accountable ownership, anticipation, authority, reconciliation, execution and outcome verification across domains. "Household OS" is not ownable category language; the sentence above is.
- The PantriApp watch question: does information acquired in one domain materially improve execution in another? Reviewed at every reconciliation session; no vertical is added in response.

## 2. Reconciliation (the largest addition)
Anticipation answers what should happen. Reconciliation answers whether reality matched, what did not happen, what changed, what became stale and what must be recomputed. It is a consumer of the RFC-001 outbox, never a field attribute.
- `expected_event` patterns with `reconciliation_status` (matched, missing_expected, unexpected, changed, conflicting, stale, cannot_determine) and candidate decisions. Six launch patterns: vendor visit without invoice or report; registration without confirmation; cancellation confirmed then charged again; return shipped without refund; promised estimate overdue; annual school-cycle packet missing. The household is never made to check.
- `changeset` propagation: a source change invalidates or recomputes dependents; safe changes apply, review-required changes route; stability increases as execution approaches and near-term commitments lock unless a real change occurs.
- Handled invariant, the definition of closed: an accountable owner exists AND no unresolved required member decision AND follow-up or watch exists where external completion is pending AND verification requirements are satisfied or explicitly pending. Activity (contacted, sent, provider-complete) is never closure.
- Portability: provider-independent export of canonical household structure, document and media manifest, vendor, asset, work and outcome history, preferences and standing rules, access history and audit metadata. Launch tier (Q-8b). Maple's shutdown is the reason.
- Source revision intelligence: when a source document changes, diff versions, identify material changes, recompute downstream; never show the household the document again.

## 3. Adopted with a change
- Validity classes, event families and ReconciliationResult are absorbed into RFC-001 before Migration B, not as a second attribute set.
- CommitmentCompiler is realized by extending REQ-052 prompt packs and REQ-053 commitment cascade with the brief's branch tables; no new object.
- LatestSafeStart and FallbackPlan are computed fields on commitments and repetitive choices (RFC-001 §3, §3a).
- DuenessState ships only after the close flow captures condition inputs; until then recurring work runs on doc-cited intervals with a `launch-calibrated` comment.
- Household Operational Pressure uses operational evidence only; stress, emotion and health inference are CI-guarded.
- The AI evaluation harness is the Synthetic Training Household scenario bank plus the eleven abuse cases (FIXTURES §5), not a separate build. AIBehaviorVersion, evidence envelope, reversibility classes and the handoff packet ship before any inference leaves shadow (Q-17b).
- Metrics: four join the M-series now (necessary member touches per household per week; member decisions required, M-25; human process minutes per verified outcome, the E2 test; expected-event misses caught) plus M-27 ownership trace. The remainder wait for E4 data.
- Ingestion: the capture pipeline shape (connector or approved inbox, quarantine, source identity and authority class, canonical match, AI proposal, human confirmation) is the only member-side write path (Q-7).

## 4. Held: recorded in WK-QA-015 as post-E4 candidates, not queued
Delight epic (CultureSignal, social inspiration capture, DelightCandidate, realization lineage, realization cost, repertoire learning); ExternalParticipant and PurposePack; Canonical Entity Resolver beyond registry needs; Tool Policy Registry; Household Query Contract; Failure Learning Queue as a separate system. The design arc stays closed (A133). Social sources, when they arrive, are discovery-only and never become household truth, sensitive inference or authority.

## 5. Corrections recorded
- Household data before the security test: the founders' two households are Household Zero; the external test household runs under written informed consent until the E1 security test passes; no other real household data before it. (CLAUDE.md, Household Zero.)
- The brief's twelve phases and the build queue are one sequence: phases 0 to 3 = Q-0 to Q-6; 4 to 6 = Q-12 to Q-14; 7 and 8 = Q-15 to Q-17b; 9 to 11 = post-E4. Nothing in the brief moves E1.
- "Deterministic AI" as used by competitors is a claim to verify, not a fact; Well Kept's separation stands: probabilistic proposals, deterministic mechanics inside authority, human authority for consequential change.
