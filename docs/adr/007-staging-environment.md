---
status: living
---
# ADR-007: A staging environment exists, stood up as an early Phase 0/1 deliverable

Date: 2026-08-24 | Status: Accepted (founder approval, "proceed with
proposals", 2026-08-24, resolving the WK-DEV-006 section 8 escalation
raised by the Phase 0 delta report) | Decider: Rachel Letters (founder)

## Context

The Phase 0 delta report (`docs/DELTA_REPORT_WKDEV003_2026-08-24.md`)
established that no staging environment exists: the pipeline is local
proof, then production, with the Smoke Test Fixture living inside
production. WK-DEV-006 depends on staging twice: the Phase 0 acceptance
line ("the full current test suite runs green locally and in staging")
and Phase 1 ("WK-SEC-001 white-box audit executed on staging with
synthetic data"). WK-DEV-003 described staging as existing; it did not.

## Decision

Staging is stood up as an early Phase 0/1 deliverable: a second Vercel
project (or a pinned preview environment), a Neon branch or separate
database, and a worker service, seeded with the synthetic fixture set
only. Until it exists, the Phase 0 acceptance line reads "locally, and
in staging once staging exists"; the Phase 1 audit does not start
without it, since staging is its venue.

Rules carried from the start: staging holds synthetic data only (the
WK-DEV-006 section 5 fixtures rule applies to staging exactly as to
tests); staging secrets are distinct from production secrets, WK_KMS_KEY
above all (a shared key would make staging a second custody surface for
production data); the erasure tool's dry-run-only rule applies in
staging as everywhere.

The founder-side standup steps and the repo-side follow-ups are in
`docs/STAGING_RUNBOOK.md`. Deploy tooling gains its staging target only
after the infrastructure exists to prove it against, per the doctrine
that a path is only real if it can be reached.

## Consequences

WK-SEC-001 has a venue. The section 4 checklist gains a place to run
before production. WK-DEV-003's environments row becomes true instead
of aspirational. One more monthly line in the REQ-085 run-rate
statement, which is the cost side the two-key rule already governs.
