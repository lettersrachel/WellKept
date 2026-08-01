---
status: living
---

# Provisional register

Companion to the `counsel-pending` marker convention (Direction 0,
`PLACEHOLDER_DIRECTIONS.md`, 1 August 2026). A placeholder waiting on a ruling
does not expire the way `pilot-calibrated` does — it sits in the code looking
decided until nobody remembers it was provisional. This file, plus the
`provisional-markers` guard (`packages/schema/src/provisional-markers.test.ts`),
is what keeps that from happening: every `counsel-pending` marker in the source
tree must resolve to an entry here, and the guard fails the build on any marker
older than 90 days, unresolved.

## Format

Every entry is a level-3 heading matching a marker's question id exactly, so
the guard can find it by string equality:

```
### question-id

Who: <who the question went to>
Asked: <date>
Text: <the question, as actually asked>
Resolved: <date and outcome, once answered - remove the marker from the
  source tree in the same change that resolves the entry here>
```

## Open questions

None yet. Nothing in the codebase currently depends on an unresolved ruling —
the non-client-record work this convention was built for (`WK-STD-026`'s
deletion-on-request question, tracked in `docs/GAP_REGISTER.md` G-56) is still
blocked upstream of any code that would need a marker. The first real entry
belongs here the moment a session writes code whose behavior assumes an
answer counsel or the founder hasn't given yet.
