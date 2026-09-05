---
status: living
---
# Data minimization: every field we store about a person

**Part Four item 3 of the comprehensive instruction, 4 September 2026.** Every
field the system stores about a person, why each exists, and what it
deliberately does not store, **provable from the schema rather than asserted**.

**Method, stated because a census is only as good as its query.** Every number
and every list below was read from `information_schema` against the local
development database at migration 67 on 5 September 2026, not from any document
about the schema. The queries are written out beside their results so a reader
can re-run them rather than trust them. Where a claim is NOT computable, it says
so and says who holds it.

**The counting unit is the COLUMN**, and that is deliberate. A table-level answer
is the shape that hides things: `playbook_field` is one table and eighteen
columns, and exactly one of them is the reason this document is hard to write.

---

## 1. The shape of the answer, before the tables

The schema holds **56 base tables and 643 columns**.

```sql
select count(*) from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE';        -- 56
select count(*) from information_schema.columns c
  join information_schema.tables t using (table_name, table_schema)
  where c.table_schema='public' and t.table_type='BASE TABLE';    -- 643
```

Of those 643, the number that are a **typed fact about an identified person** is
**four**, and all four are on one table.

That is the headline and it is also misleading on its own, so both halves go in
the same breath:

- **The typed surface is tiny.** There is no phone column, no postal address
  column, no date of birth, no gender, no health field, no income or wage-rate
  field, no government identifier, no IP address, no user-agent string, and no
  location or coordinate column **anywhere in the schema**.
- **The untyped surface is large.** What the company knows about a family lives
  as prose in `playbook_field.value` and in a handful of jsonb detail columns.
  A database cannot read those, so no census can characterise them, and this
  document does not pretend otherwise.

**Minimization is real in the first half and is a matter of practice in the
second.** Saying only the first half would be the more flattering document and
the less true one.

---

## 2. The four typed person columns

Every one is on `auth_user`, the table that exists so somebody can sign in.

```sql
select column_name, data_type, is_nullable
  from information_schema.columns where table_name='auth_user';
```

| Column | Type | Null | Why it exists |
|---|---|---|---|
| `id` | text | no | The identifier every other reference points at. Carries no meaning: it is a uuid, not a name or an email. |
| `email` | text | **no** | The **only** authentication factor's address. Sign-in is a magic link or a typed code sent to this address; there is no password column, so this is what a person proves they hold. |
| `name` | text | yes | Display, so an operator sees a colleague rather than a uuid. Nullable, and the archive exporter proves it is not load-bearing: a restored household reads three people with `name` NULL and works. |
| `image` | text | yes | An avatar URL from the auth provider. **Currently written by nothing and read by nothing.** Named here as a column with no producer rather than quietly listed as if it were in use. |

`email_verified` (timestamptz) and `is_tester` (boolean) are also on the table
and are **not facts about the person**: the first records an event, the second
is a fixture-exclusion flag the company set about an account.

### What follows from there being no password column

There is no password hash, no security question, no recovery email, and no
password-reset flow to attack. The second factor is TOTP (`user_totp`, holding
`secret_box` and `wrapped_key`, both encrypted) with backup codes stored as
hashes (`user_backup_code.code_hash`). **Nothing in the authentication path
stores a secret in a form the company can read.**

---

## 3. Where the rest of what we know actually lives

Not in typed columns about a person. In **free text on a household**.

```sql
select c.table_name, count(*) from information_schema.columns c
  join information_schema.tables t using (table_name, table_schema)
  where c.table_schema='public' and t.table_type='BASE TABLE'
    and c.data_type in ('text','jsonb') group by 1;
```

The load-bearing one is `playbook_field`: a row is a named prompt from the
24-section instrument and a `value` a person typed. **A member's allergies,
their children's schedule, who may be admitted to the house and who may not, all
of it is that one column.** It is governed by SENSITIVITY on the row (`s1`, `s2`,
`s3`) rather than by column type, which is what lets one mechanism carry
everything and is also why no static analysis can tell a harmless field from a
dangerous one.

Named honestly, because it is the live limit of every guard in the system: **the
client payload guard checks which KEYS a member-facing payload carries and can
never check what a permitted key CONTAINS.** A staff-only fact typed into a
correctly client-visible `s1` field reaches the member, and nothing in this
system catches it. That is recorded in `CLAUDE.md`'s guard table as
`client-payload-shape.test.ts`'s uncovered column, and it is repeated here
because a minimization document that omitted it would be advertising.

The other free-text carriers, each holding a person's words rather than a typed
attribute: `condition_flag.concern`, `deferral.noticed` and `.reason`,
`paused_decision.decision` and `.research`, `capture_artifact.content`,
`incident_report.description`, `work_item.detail`, `preference_rule.rule`,
`visit.report_sentence_1..3`, `object_observation.note`, `registry_entry.detail`
(jsonb), `household.membership_terms` (jsonb) and `household.referral_note`.

---

## 4. What we deliberately do not store, and how each is enforced

This is the section that earns the word "provable". Each row is a thing the
schema **cannot** hold, with the mechanism that makes it so, not a policy that
says it should not.

| Not stored | Mechanism, and where |
|---|---|
| **Who performed a task** | `task_occurrence` has **no performer column at all**. Not nullable, absent. The journey asserts its absence against `information_schema`, so re-adding it fails a test rather than passing review. WK-DEV-008 section 1's no-speed-coefficient guardrail held in the schema instead of in a rule. |
| **A stopwatch, or per-segment manual timing** | `time_segment.source` admits three derivations plus one sanctioned HOM refinement and **no manual value exists to claim**, proven refused in SQL. Duration is COMPUTED from an ordered window, so there is no minutes column to drift. |
| **Stress, emotion, cognitive load, health inference, social-content inference, or any person-characterizing word as a column name** | `judgment-free.test.ts` computes the column census and refuses any name matching the founder-editable pattern list without a written exception. The exception list is **empty**. Proven red on a planted `stress_score`. |
| **A ranking construct over HOMs** | Same guard, same list. Ruling 1's boundary, held at the schema rather than at the dashboard. |
| **A second household on one row** | Same guard's two-household refusal: no table defines two household columns, so a row cannot straddle tenants. Proven red on a planted `other_household_id`. |
| **A duration on any member-reaching surface** | `client-duration.test.ts` walks client routes and client-reaching copy builders and refuses a duration-typed column or D7 staffing-wall quantity. |
| **An undeclared key in a member payload** | `client-payload-shape.test.ts`: member-reaching payloads carry only declared keys, so a column added tomorrow throws rather than publishing. |
| **A member-visible pipeline stage** | The stage tags are refused twice: `assertNoAnticipationRows` gained a single-key clause, and `FORBIDDEN_CLIENT_KEYS` throws even when the key is declared, because a declared list is a hatch a person may widen and widening is not the remedy here. |
| **The internal flag vocabulary on a member's record** | As of 5 September the member view carries a resolved label or nothing; the raw `field_flag` is projected out of the payload, not merely unrendered. The journey reads the emitted HTML, so the word cannot return through the RSC payload the way it did before. |
| **A secured value in a log, an event or a telemetry frame** | `telemetry-discipline.test.ts` (the Sentry scrubber, `sendDefaultPii` false, and no console call interpolating a sensitive identifier); the audit trail stores value HASHES; and the one outbox payload carrying plaintext labels itself `s2` and names its writer. |
| **An email address in an audit row** | ADR-006: audit rows carry a subject TOKEN, and `audit_subject_token` holds the mapping. Deleting the mapping is the erasure mechanism, so the trail survives and stops naming anybody. |
| **A person's identity in an archive** | The exporter pseudonymises: every referenced person exports as an id and the role they held, never a name or an address. Verified this session on a real restore, below. |

### One thing NOT on that list, named so its absence is not read as coverage

**There is no restricted-access class.** WK-SEC-001 test area 3 defines one
(do-not-admit, child pickup, welfare notes, enforced server-side with
visit-sheet-only visibility and access logging) and **the tree has no
mechanism for it**: searching the schema and the source finds the phrase only in
demo fill data and in the decline-class taxonomy, which is a different question.
Such a fact today is an ordinary `playbook_field` row governed by sensitivity
like any other. That is the sharpest gap in this document and it is carried into
the threat model, where it has consequences.

---

## 5. Who inside the company can see what

Six roles (`role` enum): `client`, `house_manager`, `backup_hm`,
`corporate_ops`, `corporate_admin`, `cfo_readonly`.

Access is **per identity, per household**, through
`household_role_assignment`, with a unique index making it one role per person
per household. There is no company-wide "see everything" role that bypasses
assignment; `getPrincipal` resolves the assignment or resolves nothing.

Sensitivity is the second axis: `s1` reaches a member, `s2` is staff, `s3` is
vaulted and **is not readable at all without a decrypt that writes an audit row
first**. The audit row is written BEFORE the value is decrypted, and if the
insert fails the reveal aborts and returns nothing.

**What a member would be surprised to learn** is answered in the privacy
self-assessment beside this document, because it is a question about
expectations rather than about columns.

---

## 6. What this census cannot see, stated rather than left implicit

1. **The contents of free text.** No query can tell whether a member's `s1`
   field holds a preference or a medical fact somebody typed in the wrong box.
2. **The inside of a jsonb column.** `registry_entry.detail` and
   `household.membership_terms` are each one column to every guard here.
3. **Whether a stored value is still true.** Minimization is about what is
   held, not about accuracy or staleness.
4. **What the company knows outside the software.** Paper remains a system of
   record in places (ADR-001), and this document describes the database.

---

## 7. The gap this document leaves behind

**Everything above is a reading taken on one date.** Nothing recomputes it, so
it is a hand-maintained list sitting next to the thing it counts, which is the
drift shape this repository has caught five times.

**Opened as queue row Q-11m rather than fixed here** (guard findings are rows,
per the 4 September standing authority): a computed person-column census in the
pattern of the four existing ones, with a count floor on COLUMNS, failing when a
person-shaped column appears that this page does not name. The four negatives in
section 4 are already guarded; the POSITIVE list in section 2 is the half held
only by this paragraph.
