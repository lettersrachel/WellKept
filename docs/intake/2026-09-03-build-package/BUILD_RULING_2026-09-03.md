---
status: frozen
---
# Build ruling · 3 September 2026

Founder ruling. Supersedes the tiering question raised in the Software Architecture Review (2 Aug 2026) §4 and the open scope item in WK-QA-015. Register entry to be assigned in WK-QA-018.

## The ruling
1. The launch-critical tier and the year-two tier are both built now, before the E1 software gate (May 2027). The year-three tier (cross-household batching behind the membrane guard, offer-surface throttle, three-altitude roll-up, 150-household corporate console) remains after E4.
2. E1 is still gated on the launch-critical tier only. Year-two features ship behind a `shadow` flag: they compute, log and are visible in the corporate portal, but do not surface to members or alter HOM briefings until promoted at E2. This keeps the E1 gate honest (a real member account on the digest for a month, security test passed and retested, thirty stable days) and preserves the E2 measurement: minutes moved from process to software are measured as the promotion delta, exactly as v7.0 Inputs describes ("first anticipation triggers promoted from shadow mode").
3. The name decision is excluded from this ruling and lands 25 September 2026. Nothing member-facing hardcodes it (CLAUDE.md, Brand in code).
4. The design arc stays closed (A133). No new design enters WK-QA-015 until the reconciliation session after queue item Q-16. A feature enters a higher tier only if a milestone test would fail without it.

## What "now" means in capacity terms
- Sixteen build sessions plus four reconciliation sessions (docs/BUILD_QUEUE.md), each one migration at most.
- Binding constraints are not engineering hours; they are human review on every PR and founder rulings on the enum values in RFC-001, the trigger table conversion, and the fixture content. Those three are founder tasks and are on the critical path.
- The engineer retainer in v7.0 ($7,500 a month, 10 to 15 hours a week) covers review, the security remediation and the pieces an agent cannot do (A2P registration, KMS, deliverability, App Store). Agent sessions do the build.
- If the queue is not through Q-11 (end of the launch-critical tier plus the substrate) by the end of February 2027, the year-two items move behind E1, not E1 behind them. The gate does not move.

## Adopted with this ruling
- RFC-001 enum values as written in docs/RFC-001_Schema_Substrate.md.
- Ground-truth rule: a spec is an input only when stamped in docs/SPEC_REGISTER.md. Session 0 is the reconciliation pass that creates the first stamps and retrieves the AQ run report.
- The Synthetic Training Household is built as the canonical fixture set (docs/FIXTURES.md) and used by the training program.
- Guided / Normal / Expert mode logic per docs/SPEC_MODE_LOGIC.md.

## Not changed by this ruling
The queue rules in SESSION_COMMISSIONING_BRIEF.md · one migration per session · financial figures never in source · report-and-stop · WK-STD-026 in full · the E-milestone tests in the v7.0 model.
