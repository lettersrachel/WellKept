---
status: living
---
# Task Inventory v1.4 reconstruction: the premise checked before the build

25 August 2026 (the evening authorization's follow-through). The ruling
adopted WK-DEV-008 section 4's second arm: reconstruct v1.3 from the
playbooks, the Standards Store, and the catalog's citation trail,
registered as v1.4 with a lineage note. Before building, this session
checked the premise the way the doctrine requires, and the premise
fails on evidence: **the catalog's citation trail is not in the
repository.**

## What the repository actually holds

- The workload-forecasting brief (docs/library, the only in-repo
  document that cites the catalog) references the inventory exactly
  once at task level: the line explaining "what T-001 to T-344 means;
  service level, pack/category, scope and links to standards." No task
  rows, no id-to-name mapping, no per-task standard links. Appendix A
  is the EXTERNAL source register (EXT-001 and onward), not the task
  catalog.
- The Standards Store holds 1,146 provisions (812 method, 300 floor,
  34 process) with stable ids. Provisions are directives about HOW
  work is done; they are not the task rows and carry no T-ids.
- The playbook seed (258 fields), the bindings CSV, and the prompt
  packs describe the record and its rhythms; none carries a T-id.

## What follows

A dev-side "reconstruction" would therefore have to invent 344 task
identities and boundaries. That is fabrication wearing reconstruction's
name, and it would poison the exact thing the ruling protects: the
brief's own handoff line says do not alter the 344 Task IDs. Stopping
here is the deliverable.

## The founder's ways forward (either resolves WL Gate 0)

1. **Export the catalog from the research thread.** The brief calls
   v1.3 "the canonical 344-task set reviewed in this thread"; the
   thread is founder-side. Any tabular export (id, name, service
   level, pack, scope, standard links) lets the import path bring it
   in as v1.3, no reconstruction needed, lineage trivial.
2. **Accept a derived catalog that renumbers.** The Standards Store
   and playbooks CAN yield a defensible task list, but its ids would
   be new. WK-DEV-008 already contains the safety for this: the
   provisional task list, flagged provisional in the schema so no
   evidence rows bind permanently to ids that may renumber. If the
   original cannot be located at all, the derived list is registered
   as v1.4 with a lineage note saying exactly this: derived, not
   reconstructed, ids new.

Until one of these lands, WL Gate 1 objects build against the
provisional list per WK-DEV-008 section 4, and nothing binds to a
T-id. The founder's order of work is unchanged: the nine primitives
precede the WL layer either way.
