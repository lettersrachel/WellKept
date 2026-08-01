---
status: living
---
# `concerns_minor`: draft field categories for redline

Prepared 28 July 2026, as input to session D. **This is a redline draft, not a
decision.** It is categories with reasoning, not field keys, because I have never
seen the 258-field seed. Map each category onto the actual fields, cut what is
wrong, add what I could not know about.

**Correction, 1 August 2026 (WK-PLAY-001):** 258 is a retired figure. The
authored field count is 218, across 25 section slots numbered 0 to 24
(section 0 record-level, 1 to 24 the Playbook's content sections). Earlier
figures of 205, 215 and 273 are retired the same way.

Sources: Client Profiles §2, §3, §5, §21; the Playbook Inventory Rubric Part 2
and its WK-SOP-019 note; STD-016 §6.

---

## The test

A field is `concerns_minor` when **its definition guarantees the value
describes, identifies, locates, or schedules a person under 18.**

Not "may mention a child." The whole point of the split in CHILD_DATA.md is that
definitional classification happens once at the schema level, with no
capture-time decision, because it is a property of the field rather than of what
someone typed. A field that might contain a child reference stays unmarked and
falls under the free-text policy plus payload guard.

Apply the test to anything below that does not match your actual fields, and to
anything I have missed.

---

## Definitional set

**1. Child identity.** Name, preferred name, date of birth, age, pronouns.
Identifies a minor directly.

**2. School.** School name, grade or year, teacher, classroom, student
identifier. The rubric names school as child data under WK-SOP-019 explicitly.

**3. School schedule and calendar.** Start and end times, early release days,
term dates, closures. Locates a child in time and place, which is the school
category's actual sensitivity: it is not that a school name is embarrassing, it
is that a schedule tells someone where a child will be.

**4. Activity roster and schedule.** Sports, lessons, clubs, practice and game
times, instructor or coach names, venues. Same reasoning as 3, and Phase 0
collects this per child.

**5. Children's sizes.** Clothing, shoe, uniform, equipment. Already covered at
the registry layer by the `sizes` CHECK; this is the playbook-field equivalent.

**6. Transport and pickup.** Bus route and stop, carpool arrangement, who is
authorised to collect. Authorisation lists are the field most directly
exploitable if leaked.

**7. Custody arrangement.** The schedule itself, meaning which parent has the
child when. See the design question below on whether the co-parent contact
travels with it.

**8. Childcare providers.** Nanny, sitter, after-school programme, including
their schedules. The provider is an adult; the field concerns the child's care
and locates the child.

**9. Child health cadence.** Pediatrician, dentist, orthodontist, vision, with
STD-016 §6's constraint carried through: date, provider and member only, never
clinical detail. Worth marking so the constraint is queryable rather than
remembered.

**10. Allergies and dietary restrictions for a minor.** Health-adjacent, and
operationally necessary for a House Manager, which is exactly why it will be
captured and why it needs the marker.

**11. Child's room and belongings.** Bedroom location, personal storage. Locates
a child within the home.

**12. School and activity platform access.** Portal names, account references.
The rubric is explicit that credentials are never stored in the open record;
marking the surrounding fields makes that rule enforceable rather than advisory.

**13. Visiting-child material.** Client Profiles §21, the visiting-child mode
and its kit. See the design question below, because these minors are not members
of the consenting household.

---

## Derivative, and needing a decision rather than a default

**Co-parent contact information.** Concerns an adult, exists only because a
child does, and Client Profiles already treats the co-parent boundary as an S2
field. Marking it `concerns_minor` is arguably wrong on its face and arguably
right in effect. Decide deliberately.

**Household staff who are minors.** Unlikely, but if a household employs a
teenager, employment fields would concern a minor. Probably out of scope for the
playbook record and worth one sentence in CHILD_DATA.md saying so.

---

## Explicitly not, so the list does not creep

- Pets and pet cadence. STD-016 groups per-member and per-pet cycles in the same
  sentence, which makes this an easy over-inclusion. A dog is not a minor.
- Adult household members, including adult children, unless the field is one of
  the categories above.
- General household schedule, WFH days, travel patterns. Phase 0 collects these
  and they concern adults.
- Free-text surfaces. Dots, visit reports, incident notes, photographs. Policy
  plus payload guard, per CHILD_DATA.md, and no marker.

---

## Three design questions the list surfaces

**1. Does the marker mean "under 18" or "in the child role"?** A household with a
nineteen-year-old still has the same fields populated. Over-protection is the
safe direction and I would take it. But it matters for the enumerate-on-demand
query: if counsel's §6(g) answer requires reporting what children's data is
held, a nineteen-year-old's schedule is not children's data in the legal sense.
Either the query needs an age filter or the answer needs a caveat.

**2. Visiting children may need more protection, not less.** Grandchildren and
guests' children appear in §21 and in the kit material. Those minors are not
household members, and nobody in the consenting household necessarily has
standing to consent on their behalf. This connects directly to packet §6(d) on
photographs capturing any person, and it is the sharper version of that
question.

**3. Should child data carry its own retention rule?** The marker makes it
possible: a distinct window, or deletion at majority, rather than the household
default. Not currently asked in the packet. Worth adding to §6(g) while the
question is still open, since the marker is what would make any answer
enforceable.

---

## How to use this

Mark up this file, replace categories with field keys, then hand it to session D
in `ROUND4_SESSIONS.md`. The session brief already carries the scope, the
sequencing argument, and what is deliberately out of scope.

The one thing worth holding to: the marker goes on field definitions, not on
values. If a category here turns out to need a capture-time judgement, it
belongs in the free-text policy set instead, not in a marker that pretends to be
structural.
