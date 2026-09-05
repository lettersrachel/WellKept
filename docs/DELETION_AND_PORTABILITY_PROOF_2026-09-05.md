---
status: living
---
# Proof of deletion and portability

**Part Four item 4 of the comprehensive instruction, 4 September 2026.** Run, not
designed. Every number below came out of a command on 5 September 2026 against
the local development database at migration 67, and the commands are written out
so the run can be repeated rather than believed.

**Both halves ran, and the second one only after a founder ruling.** Portability
ran end to end. Deletion stopped at `CLAUDE.md`'s first never-rule, which this
document's first version reported rather than worked around; the founder then
**authorized the run as the second exception in that rule's history**, and it
went ahead the same day under her stated limits. Section 4 carries it.

**The run found two real defects, one of them in a tool nobody could have
caught any other way**, and that is the substance of this document rather than
a footnote to it.

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

**A scope correction on this section, added after the erasure run, because the
result above is narrower than it first read.** This archive's structured values
are all JSON OBJECTS. A later restore of a different fixture refused on a jsonb
ARRAY, a defect described in section 4: **the round trip was proven for one of
the two shapes and read as if it were proven for both.** The result stands and
its scope did not. Re-verified after the fix.

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

## 4. Deletion: RUN, under the second authorized exception

**Authorized by the founder on 5 September 2026**, after this document's first
version reported the collision between the instruction and `CLAUDE.md`'s first
never-rule. The authorization and its limits, as given: one `--commit` run
against a disposable database created for it, seeded solely from fixture
archives, before-and-after counts recorded, destroyed afterwards and stated as
destroyed, **never against production, a branch of production, or any database
containing a real household at any scope**.

**Her reason is recorded in `CLAUDE.md` beside the exception because it is the
general rule and not the special case: an irreversible path that has never
executed anywhere is not a proven capability, and the first real run must not
be the first run.**

### The subject: three fixtures, not one

A single-household database can prove that erasure removes things. **It cannot
prove that erasure removes only the right things**, which is the property that
actually matters. So the disposable database was seeded from THREE fixture
archives and exactly one was erased:

| Restored as | From | Role |
|---|---|---|
| `...00000000000a` | Smoke Test Fixture | **the subject** |
| `...00000000000b` | The Training Household | control |
| `...00000000000c` | HO Twin (synthetic) | control |

### Preconditions, asserted before anything ran

A proof asserts what its conclusion silently rests on. These printed first:

```
PRECONDITION current_database                    wk_erasure_proof
PRECONDITION households                          3
PRECONDITION non-fixture households (must be 0)  0
PRECONDITION real emails (must be 0)             0
```

**The precondition check immediately earned its place**: the first attempt
reported **2 households, not 3**. The Training Household restore had failed and
the loop that ran it had not surfaced the error. Had the counts been trusted,
the run would have gone ahead with one control instead of two and nothing would
have said so.

### DEFECT 1, found by that failure: the importer cannot restore a jsonb ARRAY

```
REFUSED and rolled back: invalid input syntax for type json
```

The refusal and rollback were correct. The cause is that **node-postgres
serializes a JS OBJECT to JSON and a JS ARRAY to a POSTGRES ARRAY LITERAL.** So
`registry_entry.detail` (an object) round-tripped and
`decision_record.alternatives` (an array) arrived as `{Ask each visit,Batch a
weekly confirmation}`, which Postgres refuses as invalid json.

**The two failure modes are not symmetric, and that is what hid it.** Every
archive restored before today happened to carry objects only, **including the
one this document's own section 3 used**, so the portability proof published
hours earlier passed while exercising one of the two shapes. The section 3
result stands; its SCOPE was narrower than it read.

Fixed in `import-household.ts`: the json and jsonb columns are computed from
`information_schema` the same way the nullable columns already were, and their
values are stringified explicitly rather than left to the driver's guess.
Verified by reading the restored value back as jsonb rather than by watching the
insert succeed:

```sql
select jsonb_typeof(alternatives), jsonb_array_length(alternatives), alternatives->>0 ...
array | 2 | Ask each visit
```

### DEFECT 2, found by the commit run itself, which is the whole argument

The first `--commit` invocation **printed its complete plan and then failed**:

```
FAILED - rolled back, nothing changed:
column "updated_at" of relation "anticipation_exclusion" does not exist
```

`erase-household.mjs` stamps `updated_at=now()` on twenty-five tables.
**`anticipation_exclusion` is the one that has no such column**, and the stamp
was written from the house pattern rather than from the table. A census
confirmed it is the only instance of the class.

**This is the finding the authorization existed to produce.** The statement sits
past the plan and inside the transaction, so **every dry run ever performed
printed a correct plan that this statement could not carry out**. No amount of
dry running reaches it. The rollback also means the tool's whole-or-nothing
property held under a real failure, which is the one consolation and is itself
worth having observed rather than assumed.

Fixed, with the reason written at the line.

### The run, and the counts

Fourteen measures per household, before and after.

| Measure | Subject before | Subject after | Treatment, as documented |
|---|---|---|---|
| household name | Smoke Test Fixture | **Erased household 0199bbbb** | renamed, never deleted |
| playbook_field rows | 1 | 1 | skeleton kept |
| playbook_field **with a value** | 1 | **0** | cleared |
| playbook_field tombstoned | no | **yes** | tombstoned |
| deferral | 1 | 1, `noticed` and `reason` both empty | blanked, kept |
| paused_decision | 1 | **0** | DELETED (internal staff research) |
| client_edit | 1 | 1, blanked | blanked |
| household_role_assignment | 3 | **0** | deleted, sessions revoked |
| audit_event | 36 | **37** | kept intact, **plus one**: `household_erased` |
| attention_record | 59 | 59 | kept |

**The audit count going UP is the strongest single line in the table.** The
erasure is itself an audited event, so the record of the deletion survives the
deletion.

### The controls, checked on CONTENT and not on counts

Both controls were identical on all fourteen counts. **Counts are a weak
control**, so the two control households' playbook content was digested and
compared against **an independently rebuilt database** created from the same two
archives and never erased against:

```
post-erasure  HO Twin              09a7a601a4a51d9c95315876606e473f
rebuilt       HO Twin              09a7a601a4a51d9c95315876606e473f
post-erasure  The Training House.  03c5abab5a0c483c7fcd3db251012a24
rebuilt       The Training House.  03c5abab5a0c483c7fcd3db251012a24
```

**Byte-identical. The erasure was scoped.** Recorded as a method note because I
got this wrong first: I originally compared the controls only against
themselves after the fact, which proves nothing at all, since a value that was
never read before cannot be shown to be unchanged. The rebuild is what makes it
a control.

### What the erased household still says about itself

**The surviving `playbook_field` row is still named `medication`.** Its value is
gone and it is tombstoned, and the FIELD NAME remains, because the documented
treatment keeps the skeleton. So the erased record still discloses **which
questions were asked**, and not the answers.

That is the documented posture working, and it is a real disclosure with a
narrow shape. Named here rather than left for someone to discover, because "the
household is erased" and "nothing about the household remains" are not the same
sentence and this proof is the place where the difference becomes concrete.

### Branches this run did NOT exercise, and why

Stated so the pass is not read wider than it is.

- **The vault crypto-shred.** `vault_item` is excluded from every archive by
  design, so a database seeded solely from archives can never contain one. The
  shred branch ran against zero rows. **Exercising it would require seeding
  outside an archive, which the authorization does not cover**, so it is
  reported rather than done.
- **The photo purge.** Same reason: photo bytes do not restore.
- **`--erase-incidents` and `--erase-time-and-costs`**, the two counsel-directed
  flags. Not run; not authorized; and each deletes records inside a retention
  window, which is the one place this tool should stay hard to invoke.

### Standing after the run

| Claim | Standing |
|---|---|
| The tool names every household-referencing table and states a treatment | **Proven**, CI-enforced |
| The tool reaches a household and enumerates only its rows | **Proven** |
| **A household, committed, is actually erased** | **PROVEN**, 5 September 2026 |
| **The erasure is scoped: other households are untouched** | **PROVEN** on content, against an independent rebuild |
| **The erasure is itself audited** | **PROVEN**: `household_erased`, audit count 36 to 37 |
| **The tool is whole-or-nothing under a real failure** | **PROVEN**, by the failure |
| The crypto-shred deletes vault rows | **NOT PROVEN.** Unreachable from an archive-seeded database. |
| The photo purge clears bytes | **NOT PROVEN.** Same reason. |

### Teardown, as required

Both disposable databases (`wk_erasure_proof` and the control rebuild
`wk_control`) were **dropped**, and their absence was confirmed by query rather
than by the drop command's own report. The three archive files were deleted. The
development database was re-read afterwards and still holds its six households.
**No production system was touched and none is reachable from this session.**

## 4b. The vault shred and the photo purge, under the THIRD exception

**Authorized the same day**, after section 4 reported both branches unreachable
from an archive-seeded database: same conditions, plus permission to seed
outside an archive so a real sealed value and real image bytes exist to destroy,
**under a throwaway KEK rather than `WK_KMS_KEY`**.

**The KEK was generated inside the proof process with `randomBytes(32)`, used
only there, and never written to a file, an environment variable or this
document.** `WK_KMS_KEY` was not read and is not required by any step below. A
key that protects nothing real is the only kind that belongs in a proof.

### What was seeded, and why in that shape

- An `s3` playbook field whose `value` is EMPTY, which is the vault's contract:
  the plaintext never lands on `playbook_field`. Asserted as a precondition
  rather than assumed.
- A `vault_item` holding a real AES-256-GCM sealed box of a known secret, with
  the household data key wrapped by the throwaway KEK, written through the same
  `sealValue` the application uses.
- A `visit_photo` carrying a real minimal JPEG: correct magic bytes, a random
  256-byte body so a search for it is decisive, and its sha256 recorded.

### Before, with a real decrypt rather than a claim about one

```
[before] vault_item rows: 1
[before] DECRYPT SUCCEEDED, plaintext matches seeded value: true
[before] visit_photo rows: 1
[before]   data length=360 bytes_col=270 purged_at=NULL sha256=2f19df59...
```

**The decrypt is the point.** A ciphertext that was never readable proves
nothing when it stops being readable.

### After the commit run

```
[after] vault_item rows: 0
[after] DECRYPT IMPOSSIBLE: no ciphertext and no wrapped key remain to decrypt.
[after] visit_photo rows: 1
[after]   data length=0 bytes_col=270 purged_at=set sha256=(no bytes)
```

**The photo row survives as a tombstone with its byte COUNT and no bytes**,
which is the documented treatment: the record that a photo existed outlives the
photo.

**And the shred is a true shred rather than a deletion of ciphertext**, because
`key_ref` holds the household's wrapped data key on the same row. Deleting the
row removes the ciphertext AND the only wrapped copy of the key that opens it.

### The whole-database search

`pg_dump` of the erased database, searched for the plaintext, for a distinctive
phrase inside it, and for the base64 JPEG magic prefix:

```
plaintext "ALARM 4417" anywhere in the logical database: 0
"side door code" anywhere:                               0
base64 JPEG magic "/9j/" anywhere:                       0
```

**Zero on all three.** Nothing survived into another column, another table, an
audit row, an event payload or a jsonb blob.

---

### THE FINDING: "cleared" and "gone from storage" are not the same, and this run separates them

The founder's instruction asked for the bytes to be **gone from storage, not
only from the table**. Taken literally, that is a question about the disk, and
the answer is not the comfortable one.

**The check was tested against a control first**, because a heap-file search
that can never find anything reports zero for the wrong reason. A photo row was
planted carrying a recognizable marker, and after a `CHECKPOINT` the marker was
findable in `visit_photo`'s heap file. The detection is real.

Then the erasure was run against it:

| Stage | Marker in the heap file on disk |
|---|---|
| seeded, after CHECKPOINT | **present** (the control: the check can find things) |
| **after the erasure committed** | **STILL PRESENT** |
| after a plain `VACUUM` | **STILL PRESENT** |
| after `VACUUM FULL` (relation rewritten) | **gone**, old file removed |

**The same test on the vault, run separately because DELETE and UPDATE are
different paths and inferring across them is exactly what this repository's
rules forbid**: a `vault_item` was planted with recognizable ciphertext and
wrapped key. After the shred committed, **both were still in the heap file**.
After `VACUUM FULL`, both gone, and `pg_dump` clean throughout.

**What this means, stated carefully.**

- **Logically, erasure is complete and immediate.** No query, no export, no
  restore of the logical database, and no application path can reach the value.
  Every claim in section 4 stands.
- **Physically, the bytes persist in the table's heap until the page is reused
  or the relation is rewritten**, and a plain `VACUUM` does not clear them: it
  marks space reusable without zeroing it.
- **For the vault this weakens the word "unrecoverable" in a specific way.**
  The ciphertext and its wrapped data key live in the SAME deleted tuple, so
  they survive together or not at all. Anyone with raw disk access AND the KEK,
  before that page is overwritten, could read the value the shred was meant to
  destroy.
- **This is not a new class of exposure**, and that is the honest framing: the
  tool's own output already carries the footnote that inside the Neon PITR
  window a restore can reconstitute shredded values (G-04), and PITR is a much
  wider door than a dead tuple. **What is new is that the same is true of the
  live heap**, which nothing had said.

**Nothing is changed in the tool on the strength of this**, and the reason is
that the remedy is a decision rather than an obvious fix. Forcing `VACUUM FULL`
on erasure takes an exclusive lock and rewrites a table, which on a shared
production database is an availability decision, not a cleanup. And it would
still not touch the PITR window, which is the larger term. **So this is
reported, with the two questions it raises named**: whether the retention floor
should be stated to members as what it is (deletion is complete at the
application layer immediately, and at the storage layer within the backup
retention window), and whether the vault's crypto-shred should say
"unrecoverable" without that qualification anywhere it currently does.

**A queue row is deliberately NOT opened for this**, because both questions are
the founder's and counsel's rather than engineering's, and opening a row would
imply the answer is a build.

### Standing after this run

| Claim | Standing |
|---|---|
| The crypto-shred deletes the vault row, ciphertext and wrapped key together | **PROVEN** |
| A shredded value cannot be decrypted afterwards, with the KEK in hand | **PROVEN**: the decrypt succeeded before and had nothing to operate on after |
| The photo purge clears the bytes and keeps the tombstone with its byte count | **PROVEN** |
| Neither value survives anywhere in the logical database | **PROVEN** by a whole-database search on three distinct strings |
| **Neither value survives on disk** | **FALSE as stated, and now measured.** Both persist in the heap until the relation is rewritten; a plain VACUUM is not enough |

### Teardown

The database was dropped and its absence confirmed by querying `pg_database`.
The proof script was removed from the tree. The throwaway KEK existed only in
that process and is gone with it; it protected one synthetic secret in one
database that no longer exists.

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

Three disposable databases were created for this record and **all three were
dropped**: `wk_portability` (section 3), `wk_erasure_proof` (section 4), and
`wk_control` (section 4's independent rebuild). Their absence was confirmed by
querying `pg_database` rather than by trusting the drop commands. Every archive
file was written into a session scratchpad and deleted.

**No production system was touched**, and no production connection is reachable
from this session at all.
