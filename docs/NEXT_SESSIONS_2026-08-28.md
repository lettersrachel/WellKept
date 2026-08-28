---
status: living
---
# Next sessions, as of 28 August 2026

Written at the end of the Fernbrook demo-prep session. Ordered by value,
not by size. Each item says what it is, why it is worth doing, and what
would make it go wrong, because the last of those is the part that gets
lost.

**Read `CLAUDE.md` and `WORK_QUEUE.md` first; this file does not repeat
standing rules.** Items marked FOUNDER need a ruling before any code.

---

## 1. The `registry_entry` display-name/key split

**The highest-value item on this list, and it closes two things at once.**

`registry_entry.label` is simultaneously display copy and the idempotency
key `db:demo` matches on. That is the F3 finding, closed for prompt packs
in 0028 with `pack_key` / `pack_name` and never done here. Today it caused
G-101: a rewrite of ten labels inserted ten duplicate rows instead of
renaming, and Fernbrook rendered both spellings until an audited cleanup.

**What it buys:** the ten em dashes currently live on registry labels
become editable, the `CENSUS_EXCUSALS` entry naming them comes out (its
removal is how the session proves it finished), and the duplication class
cannot recur.

**Shape:** a migration adding `entry_key`, keys minted equal to labels so
nothing changes on day one, every matcher moved to the key, label freed
for voice. 0028 is the worked example; follow it rather than re-deriving.

**What would make it go wrong:** minting keys that are not equal to
today's labels, which silently changes what matches. 0028 proved the
display-rename-does-not-change-matching property explicitly; do the same.

---

## 2. The outbox drain orders on a column that ties

**Small, real, and currently failing CI intermittently.**

`run.ts:219` drains with `orderBy(asc(eventOutbox.createdAt))`.
`event-outbox.integration.test.ts` inserts four rows in ONE statement, so
`created_at` defaults to the transaction timestamp and all four are
identical. `ORDER BY` with a tie has no defined result, so the test asserts
a sequence the executor is free to vary. It passes most runs and fails
under parallel load.

**Two fixes and they are not equivalent.** Distinct timestamps in the test
makes the test deterministic. A total order in the drain
(`createdAt, id`) makes the SYSTEM deterministic, which is the one that
matters if ordering is a contract. **That is a change to shipped ordering
semantics and is FOUNDER's call**, so report both and take the ruling.

---

## 3. FOUNDER: should seed scripts write audit rows?

`db:hg` did not, G-64 was filed and fixed it: `--by`, a corporate_admin
gate, and audit rows with ADR-006 subject tokens. `db:demo`,
`db:playbook-fill`, `db:demo-history` and `db:demo-primitives` do not
follow that precedent.

**The argument for leaving them:** these are demonstration households and
seeded content is stated to anyone who sees it. Writing 181 audit rows for
a playbook fill would manufacture history that did not happen, which is
the thing this record must not do, and would bury the change log.

**The argument against:** `audit_event` carries `field_id`,
`old_value_hash` and `new_value_hash`, so field changes are auditable by
design, and the drill-in shows `field_merged` as ordinary operations. A
household showing 214 fields with a value and no history of how 181 of
them arrived is a seam in the exact place the record is strongest.

**Not a defect either way. It is a decision, and it should be made rather
than inherited.**

---

## 4. The four remaining unordered `LIMIT 1` household reads (G-95)

`dump-seed.ts` and `services/worker/src/fire-test-event.ts` pick an
arbitrary household; the two e2e specs at least use `ORDER BY created_at`.
`apps/web/src/lib/data.ts` is already fixed (`anyHouseholdExists`).

**No guard is proposed and the reason is in G-95:** a static rule against
`LIMIT 1` fires on every legitimate single-row read and gets allowlisted
into silence. The distinguishing feature is whether the row identifies a
TENANT, which no static reader knows.

---

## 5. Proxy 1, the recipient census

Long-standing from the client-payload work. The shape assertion
(`client-payload-shape.test.ts`) checks which KEYS reach a member; the
recipient census asks who a payload is ADDRESSED to. Still unbuilt.

---

## 6. The `refused` outcome in the offline queue (G-88)

Filed and unbuilt. A command the server refuses is currently
indistinguishable at the queue from one that has not drained.

---

## 7. The column-scoped erasure census (G-83)

`erasure-coverage.test.ts` names TABLES. G-83 is about columns: a new
column on a covered table inherits coverage it was never assessed for.
Named as its own session in that entry.

---

## 8. Accessibility, two triggers, neither inheriting the other

No axe, no a11y assertions, no keyboard path anywhere, verified by search.
**Staff surface** revisits at the first HOM who is not the founder or
Lauren, which is before February training. **Client surface** revisits when
the client side unfreezes. The staff trigger was missing from the original
ruling and would have let that surface inherit a client deferral by
silence.

---

## 9. FOUNDER: W-16, three part-log part-document files

`ANTICIPATION_SESSIONS.md`, `CUSTODY_SITTING.md`, `ROUND4_D_FIELD_MAP.md`.
Deliberately unclassified. The founder's test is recorded in W-16 as INPUT
and explicitly not as law: would a reader be misled by a changed word.

---

## 10. The voice pass over living documents

The dated-log ruling settles that closed entries keep their wording.
`LAUNCH.md` and `SPEC_AUDIT.md` are named in scope. The remaining
`docs/*.md` em dash residue belongs to that pass, not to a sweep.

---

## Two loose ends worth naming rather than losing

**An unexplained census failure.** One full-suite run reported
`client-copy.test.ts`'s census failing; it did not reproduce in the two
runs after, package-alone and full with `--force`, and no cause was
established. G-90's addendum already widened the timeout for the walker
class. **If it recurs it belongs there, and it should not be re-run to
green without a cause.**

**Turbo replays cached failures.** A cached FAIL and a live FAIL are
identical in the log. `pnpm test --force` is the only way to know which
one is on screen, and that cost a wrong diagnosis once today.
