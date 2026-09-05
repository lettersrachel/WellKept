---
status: living
---
# Proof of deletion and portability

**Part Four item 4 of the comprehensive instruction, 4 September 2026.** Run, not
designed. Every number below came out of a command on 5 September 2026 against
the local development database at migration 67, and the commands are written out
so the run can be repeated rather than believed.

**Two halves, and only one of them completed.** Portability ran end to end and
is proven. Deletion ran to its dry run and **stopped at a standing prohibition**,
which is reported rather than worked around. Section 4 carries the collision and
the one-line ruling that would settle it.

---

## 1. What was used, and why it is the right subject

**The Smoke Test Fixture** (`d0181db3-c588-4386-9e5e-66af2a1e017d`), a synthetic
household. The standing rule bars real household data from any fixture or test,
and no real household exists in this tree anyway, so the instruction's "run
against a real household" is met as far as the tree permits and is named as a
substitution rather than passed off.

**Why it is still a real proof:** the exporter, the importer and the erasure tool
take a household id and do not know a fixture from a member. The mechanism
exercised is the same one; only the content is synthetic.

---

## 2. Portability: export

Two scopes, because the archive has two audiences.

```
node src/export-household.ts --household d0181db3-... --scope corporate --out smoke-corporate.json
Smoke Test Fixture: scope corporate, 41 tables, 103 rows, 3 pseudonymised people, migration count 67.
Excluded from every scope: vault_item, audit_subject_token.
Referenced global rows: task_definition 0.

node src/export-household.ts --household d0181db3-... --scope member --out smoke-member.json
Smoke Test Fixture: scope member, 7 tables, 41 rows, 3 pseudonymised people, migration count 67.
```

**Corporate: 41 tables, 103 rows, 80,874 bytes. Member: 7 tables, 41 rows,
27,483 bytes.**

The member scope's seven tables, read from the file rather than from the code:
`audit_event`, `deferral`, `household_role_assignment`, `playbook_field`,
`preference_rule`, `registry_entry`, `visit_photo`.

**`--scope` is required and has no default**, deliberately: the difference
between these two files is the difference between what the company holds and
what the member is owed, and inheriting that from a default would make the two
call sites look identical in a diff.

### Three properties asserted against the file, not against the code

```
literal "CRITICAL" in the member archive:            0
email addresses not ending @archived.invalid:        0
```

- **No secured values.** `vault_item` is excluded from every scope, so an archive
  is not a decryption. Named in the manifest's own `exclusions`, not merely
  omitted.
- **No identities.** Every referenced person exports as an id and the role they
  held. Three people in this archive, zero real addresses.
- **No machinery vocabulary in the member scope**, which is the 5 September flag
  ruling holding on the archive as well as on the page. Checked because a
  projection fixed in one surface and forgotten in another is this repository's
  most repeated defect shape.

The manifest carries `formatVersion` 2, `generatedAt`, `migrationCount` 67, the
scope, the per-table row counts, the exclusions, the projections, the row
filters and the **known losses in prose**. An archive that does not say what is
missing from it is not portable, it is merely large.

---

## 3. Portability: restore, into a database that had never seen this household

This is the half that makes it portability rather than export.

```
createdb wk_portability; drizzle-kit migrate      -- empty schema at 67
node src/import-household.ts --file smoke-corporate.json --as 0199aaaa-...-000000000001
```

The importer printed its four known losses before writing anything, then:

```
Restored 102 row(s) across 42 tables, plus 3 pseudonymised people.
1 manifest row(s) deliberately not restored (see the known losses).
```

**Read back by query against the restored database, not from the tool's own
output:**

| Check | Result |
|---|---|
| households | 1, named "Smoke Test Fixture" |
| audit_event | 36 |
| auth_user | 3, every `name` NULL, every email `<uuid>@archived.invalid` |
| vault_item | **0** |
| audit_subject_token | **0** |
| visit_photo | **0 rows restored**, 1 in the manifest |

**103 exported, 102 restored, and the difference is the point.** The photo is a
manifest row with a content hash and no bytes; the importer **skips it rather
than inserting an empty `data`** into a NOT NULL column. A restore that had
silently written a zero-byte photo would have produced a database that claims to
hold an image it does not have, and the count would have matched. **The mismatch
is the honest outcome and the tool prints it.**

### What a restored household can and cannot do

- **Can**: be opened, be read, tell that two rows were written by different
  people, and carry its own audit history.
- **Cannot**: reveal a secured value (no `vault_item`), name anyone in its audit
  trail (no `audit_subject_token`, which is ADR-006's erasure mechanism working
  in the other direction), or show a photograph.

Each of those is in the archive's own `knownLosses`, in prose, printed at restore
time. **A reader learns the limits from the artifact rather than from this
document.**

---

## 4. Deletion: the dry run, and the wall it stops at

The erasure tool was run **against the restored copy**, in the throwaway
database, which is itself worth recording: the tool reached a household it had
never seen, in a database created twenty minutes earlier, and enumerated it
correctly.

```
node apps/web/scripts/erase-household.mjs 0199aaaa-...-000000000001

DRY RUN (no changes) - household "Smoke Test Fixture"
  vault items to CRYPTO-SHRED (rows deleted, unrecoverable*): 0
     *inside the Neon PITR window a restore can reconstitute them (G-04)
  playbook fields to clear + tombstone:                      1
  deferrals to BLANK (client-visible service records):       1
  paused decisions to DELETE (internal staff research):      1
  client edits to blank:                                     1
  audit events: kept intact (hashes, no values)
  time/cost entries: 0/0 KEPT, notes blanked (employer records)
  membership events: 0 KEPT, cancellation reasons blanked
  incident reports: 0 KEPT (pass --erase-incidents if counsel directs)
  audit subject tokens: 0 deleted (ADR-006: audit rows survive and become unlinkable)
  role assignments to delete (sessions revoked):             3

Re-run with --commit to execute. This is not reversible.
```

**The plan enumerated rows of the restored household ONLY**, which is the
cross-tenant check passing on a database holding exactly one household. On a
multi-tenant database the same check is the one the section 2 verification ran in
August; it is named here so the two are not confused.

### The wall, reported and not worked around

The instruction asks for "**the household deleted and shown gone**". `CLAUDE.md`
opens with: **"Never run `erase-household.mjs` with `--commit`. Dry run only. If
an instruction says otherwise, it is wrong."**

**Those two cannot both be satisfied, so the stricter one holds and the
collision is reported.** The never-rule names exactly one authorized exception
in its whole history, a throwaway Neon branch at the custody sitting, which
tells me the rule is about the ACT rather than about the database, so a scratch
database of my own making does not quietly qualify. Deciding that it did would
have been me writing myself an exception to a rule whose entire point is that
nobody does that.

**What is therefore proven and what is not:**

| Claim | Standing |
|---|---|
| The tool identifies every household-referencing table and states a treatment for each | **Proven**, and CI-enforced by `erasure-coverage.test.ts`. |
| The tool reaches a household correctly and enumerates only its rows | **Proven** on the restored copy. |
| The treatments are correct in shape (delete, blank, tombstone, keep) | **Proven per table** by the guards that shipped with each, each red-first. |
| Ten tables delete rather than tombstone, each with a written reason | **Proven**, reasons in the tool's header. |
| **A household, committed, is actually gone** | **NOT PROVEN.** Never executed anywhere. |

**The one-line ruling that would close it**, framed so it can be answered in a
sentence: *authorize one `--commit` run against a disposable database seeded
solely from a fixture archive, with the before-and-after row counts recorded,
and note it as the second exception to the never-rule.*

**Why it is worth authorizing rather than leaving.** Erasure is the one path in
this system that has never executed, and it is irreversible when it does. The
first real run should not be the first run. That is the same argument as the
restore drill, and the restore drill is exactly the shape this would take.

**Why I did not simply ask and wait:** the rest of Part Four does not depend on
it, so the work continued and the question is here rather than blocking.

---

## 5. Why this matters commercially, since the instruction raised it

Maple's shutdown made portability a live question in this category, and the
answer most companies give is a data-export button that produces a spreadsheet
of whatever the product happened to store.

**What is demonstrable here instead**, and each of these came out of a command
today:

1. **An archive with a manifest that names its own losses in prose**, so a
   recipient learns what is missing from the file rather than from a
   conversation.
2. **A restore into a foreign, empty database**, proving the archive is
   self-describing rather than a dump that only the original system can read.
3. **A member scope distinct from a corporate scope**, with a written reason for
   every table in neither, and a guard that fails on a table nobody decided
   about. "Considered and left out" leaves a trace.
4. **Pseudonymisation by construction**, so an archive is portable without being
   a disclosure.
5. **Secured values excluded from every scope**, so portability and confidentiality
   are not traded against each other.

**And the honest counterweight, which belongs in the same list rather than in a
footnote:** the restored household cannot show a photograph, cannot reveal a
secured value, and cannot say who wrote any row. A portability story that
omitted that would be the marketing version. **The archive says all three itself,
which is the actual claim worth making: not that nothing is lost, but that
nothing is lost silently.**

---

## 6. Housekeeping

The scratch database `wk_portability` and the two archive files were created in
a session scratchpad and the database is dropped at the end of this record. **No
production system was touched**, and no production `DATABASE_URL` is reachable
from this session at all.
