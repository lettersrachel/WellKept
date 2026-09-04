---
status: frozen
---
# Spec register · stamps

A spec is a session input only when stamped `verified@<sha>` (read against the repo at that commit) or `plan-of-record` (not built; premises checked against the repo). `superseded` specs are removed from the folder. Session Q-0 fills the first column; every reconciliation session updates it.

| Spec | Status (Q-0 to set) | Notes |
|---|---|---|
| WK-DEV-001 Requirements | verified@? | Append REQ-078 to 080 at Q-2. |
| WK-DEV-002 User stories | verified@? | |
| WK-DEV-003 Stack | verified@? | Corrected 1 Aug (offline queue, server actions, Resend). |
| WK-DEV-004 Conventions | verified@? | Monorepo tree shows `api/trpc/`; confirm against repo and correct. |
| WK-DEV-005 Handbook | verified@? | |
| WK-APP-001 Backend spec | verified@? | |
| WK-APP-002 If/then library | plan-of-record | Prose; converted to `docs/triggers/*.yaml` before Q-19. |
| WK-APP-003 Playbook to application; A1 Standards store | verified@? | |
| WK-APP-004 Collision detection | plan-of-record | |
| WK-APP-005 Knowledge half-life | plan-of-record | |
| WK-APP-006 Trigger batch scope | plan-of-record | |
| WK-APP-007 What is needed and when | plan-of-record | |
| WK-APP-008 Making anticipation functional | plan-of-record (corrected 1 Aug) | Part 1 relational tables are superseded; field-based record is ground truth. Use 13_Software/repo_docs_corrections version only. |
| Four-Stage Application Spec | plan-of-record | Adopted A121. |
| Inference Cascade Spec | plan-of-record | Queued behind AR. |
| Pre-Populated Intake Spec (A129) | plan-of-record | |
| Anticipation Engine Depth, Goals, Altitude | plan-of-record | Three-altitude roll-up is year-three; household altitude is Q-12. |
| Five Feeds / Judgment-Free Observation | plan-of-record | Membrane guard ships in RFC-001 §4; batching itself is year-three. |
| Task Stacking and Errand Optimization (A128) | plan-of-record | |
| Portfolio and Team Operations | plan-of-record | §5 paper forms become computed views at Q-14. |
| Software Architecture Review | verified@? | Source of Phase 0 and RFC-001. |
| WK-SEC-000 / 001 | verified@? | Security test scope; handoff at Q-11. |
| Engineering Benchmark, Architecture and Failure-Lesson Brief (101 products, 3 Sep 2026) | plan-of-record | Design direction only; absorbed per docs/BENCHMARK_ADOPTION.md. Not a build authority. |
| WELL_KEPT.md (PantriApp revision) | plan-of-record | Merged into the benchmark brief; P0 competitive watch. |
| docs/COMPETITIVE_FEATURE_INPUTS.md | adopted | This package. |
| docs/BENCHMARK_ADOPTION.md | adopted | This package. |
| RFC-001 (amended 3 Sep) | adopted | This package. |
| SPEC_MODE_LOGIC.md | adopted | This package. |
| FIXTURES.md | adopted | Content to be supplied by founders before Q-8. |
