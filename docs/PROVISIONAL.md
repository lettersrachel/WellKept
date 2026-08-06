---
status: living
---

# Provisional register

Companion to the `counsel-pending` marker convention (Direction 0,
`PLACEHOLDER_DIRECTIONS.md`, 1 August 2026). A placeholder waiting on a ruling
does not expire the way `pilot-calibrated` does. It sits in the code looking
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

Seeded 2 August 2026 from the founder's commissioning package
(`PROVISIONAL_seed.md`). The seed's opening instruction, to first resolve
any existing counsel-pending marker on the statutory deletion question, was
checked and is moot: this register was created after that question was
already answered (1 August, no statutory obligation, see GAP_REGISTER G-56),
so no such marker ever existed here. Neither entry below has a matching
`counsel-pending` source marker yet, because no code currently branches on
either answer; the entries are registered ahead of the code so the first
session that does write such code has its question id waiting.

### WK-HR-OpsCoordinator-departures

Who: counsel, with the WK-HR-002 v1.1 packet.
Asked: 2026-08-02.
Text: Two senior operations people leaving the same employer for the same
venture; non-solicitation exposure, whether anything was developed on the
employer's systems, and the sequencing of the two resignations.
Consequence: if counsel advises constraints, the Operations Coordinator
offer terms and start date change; the model's 2028 Operations Lead line
does not.
Resolved: open.

### WK-LEG-011-founding-rate-review

Who: counsel.
Asked: 2026-08-02.
Text: Review of the Founding Member Addendum as AMENDED (rulings A106/A108,
2 August 2026): founding households pay full list rate and receive a
per-household service credit drawn against engagement and add-on billing,
Years 2 through 5; fifteen households. Terms and figures live in WK-LEG-011
in the library, never here (financial figures never enter source control;
this entry originally carried the pre-amendment rate and was scrubbed and
updated 5 August 2026).
Consequence: if counsel changes the term structure, the model's assumption
rows carry the scenarios and the base case moves by selector, not by edit.
The rate-lock mechanic in the schema stays correct either way: founding
households now simply lock AT list rate.
Resolved: open.

## Pilot-calibrated entries

Counted by the guard, never build-failing; these expire when real numbers
arrive.

- **Decline-class taxonomy** (Founder Ruling 1, 2026-08-02): the six
  approved categories are deliberately incomplete; the pilot will surface
  cases the list does not cover. Revisit at pilot close. Lives in
  `packages/trigger-engine/src/decline-class.ts`.
- **The 90-day counsel-pending expiry itself** (`provisional-markers.test.ts`):
  a placeholder for real counsel turnaround, set before any real turnaround
  has been observed.
