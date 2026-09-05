---
status: living
---
# Privacy self-assessment

**Part Four item 1 of the comprehensive instruction, 4 September 2026.** What the
system knows about a family, who inside the company can see it, and what a
member would be surprised to learn. Answered end to end, against the tree.

**The instruction's own rule governs this document: report gaps rather than
filling them with reassurance.** Where the honest answer is "nothing stops
that", it says so.

The column-level evidence is in `DATA_MINIMIZATION_2026-09-05.md` beside this
file and is not repeated. This document answers the three questions a person
asks, not the three questions a schema answers.

---

## 1. What the system knows about a family

**Almost nothing in a typed column, and a great deal in prose.**

The typed surface is four columns on `auth_user`, and only two of them are
facts: an email address, because it is the sole authentication factor, and an
optional display name. No phone number, no postal address, no date of birth, no
health field, no financial field, no identifier issued by anybody. Verified by
query, not by memory.

The prose surface is the 24-section playbook instrument. A member's household
record is a set of named prompts and the answers somebody typed, held on
`playbook_field.value` and classified row by row as `s1` (the member's own
view), `s2` (staff) or `s3` (vaulted, encrypted, and unreadable without an
audit row landing first).

**So the real answer to "what does it know" is: whatever the intake conversation
put there.** Which is the honest answer for a service business, and it means the
company's discipline about what goes IN the box matters more than any schema
constraint, because the schema cannot see inside that column. That is stated at
the top rather than buried, because a reader who takes "only four typed columns"
as the whole answer has been misled by a true sentence.

Around the record sit the operational traces: visits and their three report
sentences, photos, time and cost entries, registry entries for the objects in
the house, deferrals and paused decisions, condition flags, and the audit trail
over all of it.

---

## 2. Who inside the company can see it

**Nobody, by default. Access is a per-person, per-household grant, and there is
no role that bypasses it.**

Six roles exist: `client`, `house_manager`, `backup_hm`, `corporate_ops`,
`corporate_admin`, `cfo_readonly`. A person holds at most one role on a given
household (a unique index enforces it), and `getPrincipal` resolves that
assignment or resolves nothing. There is no super-user flag, no
company-wide-read role, and no way for a staff member to reach a household they
are not assigned to. The isolation journey proves it against a household nobody
holds.

**Three consequences worth naming, because each answers a question a reviewer
asks:**

- **A departing employee loses access by revocation, not by policy.** Revoking
  an assignment deletes the row and writes a `role_revoked` audit row naming the
  subject token, the role and the NDA standing. Sessions are database-backed, so
  revocation is effective rather than advisory.
- **Corporate roles see more than a HOM, and less than everything.** They see
  `s2`, they do not see `s3` values without a logged decrypt, and the corporate
  board deliberately carries no per-person operational measure beyond the one
  ruled capacity section.
- **A HOM sees the full permitted record for her assigned households,
  standing.** Not need-to-know per visit. That is doctrine, not an oversight:
  judgment requires context.

**The vault's rule is the strongest thing in this section.** The audit row is
written BEFORE the secured value is decrypted. If the insert fails, the reveal
aborts and returns nothing. **No audit row, no value**, with no shared
transaction to roll the log back.

**Access by the founder is not privileged.** She holds ordinary role assignments
and appears in the audit trail like anyone else. The one thing she can do that
others cannot is operate the database directly, which is true of every company
and is why the section below on operator access is honest rather than
reassuring.

---

## 3. What a member would be surprised to learn

This is the part of the assessment that has to be uncomfortable to be worth
anything. Nine items, ordered by how surprised a reasonable member would be.

1. **Staff write private observations about their household that the member
   never sees.** `condition_flag.concern`, `paused_decision.decision` and
   `.research`, `deferral` reasons before they are projected, `work_item.detail`,
   and Tell Well Kept captures are all internal prose about the home and
   sometimes about the people in it. The member's own view is a filtered
   projection, and the unfiltered record is larger. This is legitimate and
   disclosed in the privacy notice by category; it is first on the list because
   the gap between "your record" and "the record about you" is the thing people
   do not expect.

2. **A photograph taken during a visit is stored, and the member does not
   approve it.** Photos are captured on the HOM's device and uploaded. There is
   no member-side review, no per-photo consent, and no room scoping (a
   `visit_photo` carries no room). The member's report tells them a COUNT of
   photos, not which ones.

3. **The system observes the absence of a visit.** The reconciliation knob flags
   a household with no visit in N days. Nothing about that is hidden, and no
   member has ever been told it exists.

4. **Anything typed in an `s1` field is visible to the member and anything typed
   in an `s2` field is not, and which box a fact lands in is a person's
   judgment.** A member reading their own playbook is reading a curated view,
   and the curation was done by the person who typed it. There is no mechanism
   that can catch a staff-only fact typed into a member-visible field.

5. **Deleting a household does not delete everything.** By design: the audit
   trail survives, wage and cost records survive (employer obligations, and
   WK-SOP-017 requires four years of the wage half), membership history survives
   as a business record, and incident reports survive unless counsel directs
   otherwise. What goes is the household's own content: the fields, the secured
   values, the photos, the staff observations. **The audit rows survive and stop
   naming anybody**, which is ADR-006 working as intended and is not the same as
   deletion.

   **And the STATED POSTURE, promoted here from an internal treatment note
   because a member is entitled to it in the same words we use:** an erased
   household's record discloses **which questions were asked, and not the
   answers**. The field row survives, tombstoned and empty, still carrying its
   name. So a record erased today still says a field called `medication`
   existed, or `Alarm and entry codes`, with nothing behind either. That is the
   skeleton-kept treatment working as documented, and it is a real residual
   disclosure with a narrow and specific shape. Demonstrated rather than
   asserted: it is what the 5 September erasure run left behind, recorded in
   `DELETION_AND_PORTABILITY_PROOF_2026-09-05.md` section 4.

   **The same section carries the storage-layer qualification, which belongs
   beside this one** (G-128): erasure is complete and immediate at the
   application layer and in the logical database, and the underlying bytes
   persist in the table's storage until the relation is rewritten, with the
   backup retention window the wider term. **"Deleted" is true of what anyone
   can reach and is not yet true of the disk**, and a member asking the plain
   question deserves the plain answer rather than the flattering half of it.

6. **The company can read a secured value.** The vault is not zero-knowledge and
   has never claimed to be. What it guarantees is that every read leaves a row
   the member can be shown, and that a read cannot happen without one.

7. **A member's own suggested correction goes to their house manager rather than
   changing the record.** `client_edit` is a proposal. The doctrine is
   deliberate (a member may always correct a fact about themselves, through the
   relationship rather than through a form), and a member expecting an edit
   button will find a review queue.

8. **The system emails the household's name in a subject line.** The client
   report's subject is "This week's visit at <household>". Settled copy. A
   member whose email is read by someone else in the house has told that person
   something, and nobody has ever asked them whether that is fine.

9. **A shared-inbox address is a shared account.** Sign-in is a link or code to
   an email address, so anyone who reads that mailbox can become that member.
   The system has no way to know the difference, and the second factor gates
   STAFF surfaces, not the member surface.

### The one a member would be least surprised by and should be

**There is no restricted-access class.** A fact of the kind WK-SEC-001 test area
3 describes (do-not-admit, a child pickup restriction, a welfare note) is stored
today as an ordinary playbook field governed by sensitivity like a linen
preference. A member telling their house manager something protective would
reasonably assume it is held differently. It is not, and building that is not
scheduled. Carried into the threat model, where it is the hinge of two of the
six scenarios.

---

## 4. What is genuinely strong here, so the assessment is not only a list of worries

Stated separately from the worries rather than mixed in with them, because a
reader should be able to tell which is which.

- **Tenant isolation is structural.** Composite foreign keys on
  `(household_id, id)` make a cross-tenant reference **unrepresentable** rather
  than merely refused: a photo cannot point at another household's registry
  entry, an attention record cannot bundle into another household's situation,
  and an outbox event cannot cause another household's event. Each was proven
  refused in SQL when it shipped.
- **The audit trail stores hashes, never values**, so the log of what changed
  cannot itself become a copy of the data.
- **Erasure coverage is CI-enforced.** A new household-referencing table without
  an erasure treatment fails the build. So does a table missing from the
  child-data census, or from the legal census, or from the staff disclosure.
  Four censuses, each computed from the schema with a count floor, none of them
  a list somebody maintains by hand.
- **Ten tables delete rather than tombstone, and each one has its reason written
  where the deletion happens.** An eleventh needs the same. Deletion is the
  exception with an argument, not the default with a habit.
- **Portability works and was run**, not designed. See
  `DELETION_AND_PORTABILITY_PROOF_2026-09-05.md`.

---

## 5. Gaps, plainly

| Gap | Status |
|---|---|
| No restricted-access class | **Not built, not scheduled.** The largest one. |
| No member-side photo review or per-photo consent | Not built. Client side is frozen at the digest, so it cannot be built until the freeze lifts. |
| No per-room photo scoping | **Unrepresentable today**: `visit_photo` carries no room. Schema change. |
| A staff-only fact can be typed into a member-visible field | **No mechanism can catch this.** Named in `CLAUDE.md`'s guard table as the payload guard's uncovered column. |
| No privacy self-assessment before this one | Closed by this document. |
| Nothing counts member-reaching sends | Queue row Q-11c, now unblocked by the 5 September ruling. |
| Role assignments predating 25 August 2026 carry no audit history | **G-66, and backfill was refused by decision**: it would have to invent an actor and a reason. The silence stands in the register rather than being papered over. |
| Operator access to the database is not itself audited | True and structural: anyone with the connection string reads everything the encryption does not cover. The vault covers `s3`. Nothing covers `s1` and `s2` against a direct query, and nothing logs one. |

**That last row is the honest floor of this whole document.** Every access
control described above is enforced by the application, and the database sits
behind it. The controls are real against every path a person uses and are not a
defence against the connection string. Custody of that string is the control,
and it is a human one.
