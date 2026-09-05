---
status: living
---
# Freeze decision packet · the 25 September two-key session

**Scope of that session, from the queue's own preamble:** whether the
WK-DEV-007 client-side freeze lifts for the three split surfaces at E1
(Q-6's member decision inbox, Q-8b's member-facing export control,
Q-9's auto-acknowledgment), and nothing else.

**Why this file exists.** Each split row builds its freeze-safe half
now, and building it surfaces facts the freeze decision should be made
knowing. Those facts otherwise live in a session log nobody re-reads
on the day. This is the place they are carried to, opened 5 September
2026 by the Q-8b session on the founder's instruction, one entry per
finding, added to by each session that finds one.

**It is not a recommendation and does not argue for an outcome.** Each
entry states what a surface would hand over or do if the freeze lifted,
and what is undecided about it.

---

## Q-8b, the member-facing export control (5 September 2026)

**The export is built and works in two scopes.** `--scope corporate`
carries everything household-keyed minus two written exclusions;
`--scope member` carries only what the portability line names. The
scope argument is required and has no default.

**What the member scope carries today, and it is six tables:**

| Table | The portability phrase that admits it |
|---|---|
| `playbook_field`, **s1 rows only** | canonical household structure |
| `registry_entry` | asset history |
| `deferral` | outcome history |
| `preference_rule` | preferences and standing rules |
| `household_role_assignment` | access history |
| `audit_event` | audit metadata |

**The decision this leaves open: four of the portability line's nine
named categories are EMPTY in the member scope, and each is empty for a
reason that is a decision rather than an oversight.**

1. **Work history.** The record of a visit lives in `visit_command`,
   whose jsonb payload carries the HOURS. D7 (register A564) bars a
   duration from a client surface. So the member scope carries no
   visits at all, which is a large absence in an artifact whose point
   is that a household's record can leave. The fix is a payload
   projection dropping the duration keys, and choosing which keys to
   drop inside a jsonb column is exactly what the client-payload-shape
   guard says no mechanism can check for you. **Not decided here.**
2. **Document and media manifest.** The portability line names it, and
   `legal/README.md` says photos "never appear on the client's view".
   Those two sentences point opposite ways at the same artifact. A
   manifest row carries a hash and no bytes, so it is not an image, and
   an export is not the client's view; both readings are defensible.
   **The stricter reading holds meanwhile and `visit_photo` is out of
   the member scope**, per the standing report-and-hold doctrine. One
   line flips it either way.
3. **Vendor history.** No vendor table exists. Vendors are registry
   entries, which are already in. Nothing to decide, recorded so the
   empty category is not read as a gap.
4. **Outcome history is thin rather than empty.** `deferral` is in
   because it has a decided client projection. `task_occurrence`,
   `estimate_snapshot` and `time_segment` all carry durations and are
   out on the same D7 ground as item 1.

**And the corporate scope carries material no member surface does.**
`paused_decision` (whose own table comment reads "INTERNAL: no client
projection exists at all"), `shadow_log`, `capture_artifact` and
`decision_right` are all in the corporate archive and all excluded from
the member one by the founder's 5 September ruling. If a member-facing
control ships, it must be wired to the MEMBER scope; wiring it to the
corporate scope would hand a household every one of those.

**One property worth knowing either way:** people are pseudonymised in
both scopes. An archive carries each referenced person's id and the
role they held on this household, never a name or an address. So the
freeze decision is not also a decision about disclosing staff
identities; that one is already made.
