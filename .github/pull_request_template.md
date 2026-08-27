<!--
Fill the sections that apply and delete the rest. This template is a
prompt, not a gate: nothing enforces it, and that is understood.
-->

## What changed

## Producer (REQUIRED when this PR adds or alters a schema column)

<!--
G-85. Migration 0058 shipped ten columns that nothing writes. Every one
is NULL on every row in production, and the shape assertion, four CHECK
constraints and a granularity-aware render all guard a path no data can
reach. They are correct and inert, and a later reader seeing green
guards and an applied migration would reasonably conclude the feature
works.

Shipping schema ahead of its writer is a legitimate thing to do
deliberately. It is not a legitimate thing to do by accident, and after
the fact the two are indistinguishable. So state which it is, in one
line. Nothing can compute this: a static reader cannot tell which
columns a runtime-assembled insert touches, and "no writer" is a valid
state rather than a defect, so a guard would fire on every intentional
case and be allowlisted into silence. It stays a question a person
answers at the only moment the answer is known.
-->

- **Written by:** <!-- the surface that writes these columns, e.g. "the close flow's capture step" -->
- or **NO PRODUCER YET:** <!-- name the session that will build it, e.g. "the systems capture form, its own session" -->

## Proofs

<!-- Red before green, preconditions asserted first. Name the mutation and
     confirm it landed at the intended site. -->

## Same-PR obligations (delete any that do not apply)

- [ ] New data category: erasure treatment
- [ ] New data category: `legal/README.md` and BOTH privacy-notice copies
- [ ] New data category: `CHILD_DATA.md`
- [ ] New guard: manifest row and `CLAUDE.md` table row
- [ ] New client-facing route: payload guards re-asserted in the page
