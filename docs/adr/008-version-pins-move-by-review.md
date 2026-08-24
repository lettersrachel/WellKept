---
status: living
---
# ADR-008: Version pins move only by reviewed change or security override; the freeze rule is retired

Date: 2026-08-24 | Status: Accepted (founder approval, "proceed with
proposals", 2026-08-24, resolving the WK-DEV-006 section 8 escalation
raised by the Phase 0 delta report) | Decider: Rachel Letters (founder)

## Context

WK-DEV-003's version rule said the first sprint task was a pin-refresh
PR after which "versions freeze for the build." The delta report found
the freeze never operated and cannot: the CI dependency audit
(`pnpm audit --audit-level=high`, a gates step) fails the build the day
a high advisory publishes, forcing same-day version bumps regardless of
any freeze. This happened twice in practice before this ADR:
brace-expansion (PR #111) and the js-yaml/nanoid/tar batch (PR #117),
each an unrelated diff failing on the day's advisory feed.

## Decision

The freeze rule is retired and replaced by the practice already in
force: dependency versions move only through a reviewed pull request,
in one of two shapes. (1) A deliberate upgrade: a lockfile change
reviewed on its own merits. (2) A security override: a parent-scoped
`pnpm.overrides` entry (or, for an advisory with no patched release, an
`auditConfig.ignoreGhsas` entry carrying a written reason and a
remove-when-patched note), proven two ways before push: the audit exits
zero, and the full suite runs green with the override applied, because
an override that satisfies the audit can still break a consumer (the
brace-expansion lesson, minimatch at runtime).

## Consequences

WK-DEV-003's version pins are read as a floor snapshot, not a contract.
The delta report's VERSION DRIFT verdicts are expected behavior, not
findings. Ignored advisories are revisited whenever the audit output
changes, and each ignore is removed on the first patched release.
