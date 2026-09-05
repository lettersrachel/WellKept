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

**It does not choose an outcome.** Each entry states what a surface
would hand over or do if the freeze lifted, and each open question is
written as a RULING with its shapes, so it can be answered in a
sentence rather than reconstructed on the day. Where a shape carries an
engineering consequence, that consequence is stated beside it; that is
not the same as arguing for it.

---

## Q-8b, the member-facing export control (5 September 2026)

**The export is built and works in two scopes.** `--scope corporate`
carries everything household-keyed minus two written exclusions;
`--scope member` carries only what the portability line names. The
scope argument is required and has no default.

**What the member scope carries today. The table below is the whole
of it:**

| Table | The portability phrase that admits it |
|---|---|
| `playbook_field`, **s1 rows only** | canonical household structure |
| `registry_entry` | asset history |
| `deferral` | outcome history |
| `preference_rule` | preferences and standing rules |
| `household_role_assignment` | access history |
| `audit_event` | audit metadata |
| `visit_photo`, **manifest only, never bytes** | document and media manifest |

**Everything in the corporate archive now carries an explicit member
decision** (founder ruling, 5 September 2026). Every other table is
written down as corporate-only with the reason it stays out, and a
table with no entry fails CI rather than defaulting quietly. So the
list above is a decided set rather than a residue, and a table added
tomorrow cannot join it by silence.

---

## What this session is asked for: one ruling, with two closed beside it

Four of the portability line's nine named categories were empty in the
member scope when this was written. **Two of the three rulings were made
on 4 September and are closed below**; one remains for this session, and
it is framed so it can be answered in a sentence. It is reversible in
one line of a written list and needs no migration.

### Ruling A. Do a visit's HOURS reach a member archive, and in what shape?

**Why it is open.** The record of a visit lives in `visit_command`,
whose jsonb payload carries the hours the HOM typed. D7 (register A564)
bars a duration from a client surface. So today the member archive
carries **no visits at all**, which is a large absence in an artifact
whose whole point is that a household's record can leave. The same rule
holds out `task_occurrence`, `estimate_snapshot` and `time_segment`, so
this one ruling also decides how thin "outcome history" stays.

**What is being asked.** Whether D7's bar reaches an export the member
asked for, as opposed to a screen the member browses.

**The shapes, so a sentence is enough:**

- **(a) D7 holds as written.** Visits stay out of the member archive.
  Work history remains an empty category and we say so in the artifact.
- **(b) Visits travel with the hours REMOVED.** The payload is projected,
  dropping the duration keys, and the member receives what was done and
  when without how long it took. The engineering note that belongs with
  this one: choosing which keys to drop inside a jsonb column is exactly
  what no guard can check for you, so the key list would be a written,
  reviewed list of the same kind as the table list.
- **(c) Visits travel whole, hours included**, on the reading that a
  member's own service record is not the staffing-wall quantity D7 was
  written to protect.

**Recommended framing rather than a recommendation:** (a) and (b) are
both defensible today; (c) is the one that needs D7 amended by name
rather than interpreted, because D7's text is about client surfaces and
a session reading it later should not have to reconstruct whether an
export counted.

### Items B and C are CLOSED and off the agenda (founder rulings, 4 September 2026)

Both were raised here on 5 September and both were answered without
this session, so they leave rather than sit on an agenda they no longer
need. The reasons are kept because an item that vanishes reads as an
item that was forgotten.

**B, the media manifest: RULED IN, and it is built.** The conflict was
between the portability line naming a document and media manifest and
`legal/README.md` saying photos never appear on the client's view. It is
resolved by the distinction the exporter already implemented: a manifest
of `content_sha256` and metadata is not an image. `visit_photo` is now in
the member scope as a manifest, and **image bytes are admitted to no
archive at any scope**, enforced on the way out by the projection and on
the way in by the restore not writing photo rows at all. Both directions
are asserted, including that a projection cannot be made scope-conditional.
`legal/README.md` carries the settling sentence, so the conflict is closed
in the document that created it rather than only in the export code.

**C, vendor history: NOT A FREEZE QUESTION.** If the portability line
means vendor engagements rather than registry entries, nothing in the
schema holds it, so there was nothing to rule about scope. It is a queue
row now (Q-8v). The founder's own reading of why it looked like one is
worth keeping, because the shape recurs: it was a build gap wearing the
costume of a disclosure decision.

**Ruling A stands and is the only export question left for 25
September.**

---

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
