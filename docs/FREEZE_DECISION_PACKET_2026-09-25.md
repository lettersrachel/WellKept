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

**Everything in the corporate archive now carries an explicit member
decision** (founder ruling, 5 September 2026). Every other table is
written down as corporate-only with the reason it stays out, and a
table with no entry fails CI rather than defaulting quietly. So the
list above is a decided set rather than a residue, and a table added
tomorrow cannot join it by silence.

---

## Three rulings the 25 September session is asked for

Four of the portability line's nine named categories are empty in the
member scope. Three rulings close all four, and each is framed so it can
be answered in a sentence. **Every one of them is reversible in one line
of a written list; none needs a migration.**

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

### Ruling B. Does the media manifest ship to a member?

**Why it is open.** Two standing sentences point opposite ways at the
same artifact. The portability line names "document and media manifest"
as something a provider-independent export contains.
`legal/README.md` says photos "are shown only to assigned staff and
management" and "never appear on the client's view".

**The distinction that may or may not matter:** the manifest is not a
photo. It is one row per photo carrying the identity, the visit, the
size and a content hash, with the bytes replaced by that hash. So a
member would learn that photos exist and which ones, and would not
receive an image. Whether an export is "the client's view" is the
question, and it cannot be settled in engineering.

**Held meanwhile on the stricter reading:** `visit_photo` is out of the
member scope today.

**The shapes:** **(a)** the manifest ships and `legal/README.md` gains a
sentence distinguishing the view from an export; **(b)** it does not
ship and the portability line's media category is recorded as
deliberately unmet for member archives; **(c)** it ships only when a
member asks for photos specifically, which is a second control and a
larger build than either.

### Ruling C. Is vendor history satisfied by registry entries?

**Why it is open.** The portability line names "vendor history". No
vendor table exists: a vendor is a `registry_entry` kind, and
`registry_entry` is already in the member scope. So the category may
already be satisfied under a different name, or it may be a real gap
that nobody has noticed because the word does not appear.

**What is being asked.** Whether "the vendors on the household's
registry, with their entries' own history" is what the portability line
means, or whether vendor history means the record of vendor
ENGAGEMENTS: who came, when, for what, at what outcome. The second does
not exist anywhere in the schema today, and if that is the meaning then
the gap is a build item rather than an export question.

**The shapes:** **(a)** registry entries satisfy it and the category is
closed; **(b)** vendor engagement history is a real absence, in which
case it belongs on the queue and NOT in this packet, since it stops
being about the freeze.

**This is the one of the three that may not be a freeze question at
all**, and it is here because it was found while scoping the export.

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
