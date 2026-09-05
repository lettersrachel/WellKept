---
status: living
---
# The backup restore drill: exactly what to run, and what you should see

**Part Five item 2 of the comprehensive instruction.** Today the honest
answer to "has a restore ever been tested" is no. This converts that
assumption into a fact, once, with evidence.

**The repo-side half is BUILT and proven in both directions. The Neon
half is yours**, because it needs the console and a paid-plan feature,
and because creating a branch from a point in time is an act on the
production project.

**Nothing in this drill writes to production, and nothing writes to the
restored branch either.** `db:restore-drill` is read-only in both modes,
deliberately, because the second mode runs against the very thing being
verified.

---

## Before you start, one warning that matters more than the rest

**Do NOT point the test suite at the restored branch, or at production.**
The integration tests write, mutate and TRUNCATE. The suite is hermetic
by design and CI runs it against containers it throws away. Set
`DATABASE_URL` deliberately for each command below and read it before
you press return.

The only commands in this drill are `db:restore-drill`, and it cannot
write.

---

## Step 1. Take the baseline, against PRODUCTION

```
DATABASE_URL=<production> pnpm --filter @wellkept/schema db:restore-drill \
  --baseline --out restore-baseline.json
```

**What you should see**, with your own numbers in place of these:

```
Baseline written to restore-baseline.json.
  migrations 67 (through 0066_decision_right)
  58 tables, 3319 rows
  audit anchor 200 row(s), sha256 <16 hex chars>
  vault_item <n>
NOTHING was written to the database.
```

**Read two things before continuing.** The migration count should match
what the last deploy reported three ways. And **note the time**: the
baseline is a photograph, and step 2 restores to a point AFTER it, so
the restore is a superset rather than a stranger.

`restore-baseline.json` is a census with no household content in it
(table names, counts, and a hash), but it is not committed: it is a
scratch artifact of one drill.

## Step 2. Create the restore branch, in the Neon console

1. Open the Neon project, **Branches**, **New Branch**.
2. Parent: your production branch.
3. **Include data up to:** choose **a specific date and time**, and set
   it to **a few minutes AFTER the baseline in step 1**. Neon calls this
   point-in-time restore, and it is why the baseline is taken first.
4. Name it something you will recognise and delete: `restore-drill-<date>`.
5. Create it, then copy its connection string from **Connection Details**
   with that branch selected.

**What you should see:** a new branch, its own connection string, and a
size close to production's. A branch that reports near-zero data means
the point in time was set before the database had content, which is the
one mistake worth checking for before moving on.

## Step 3. Verify the restore, against the BRANCH

```
DATABASE_URL=<the restore branch> pnpm --filter @wellkept/schema db:restore-drill \
  --verify --from restore-baseline.json
```

**What a good restore prints**, and every line is a check rather than a
summary:

```
Verifying a restore against the baseline taken <timestamp>.
  PASS  migration count: restored 67, baseline 67, this build expects 67
  PASS  every table present: 58 tables
  PASS  no table came back empty that had rows: none emptied
  PASS  audit history intact (content hash over the oldest rows): restored 200 rows <hash>, baseline 200 rows <hash>
  PASS  vault rows present: restored <n>, baseline <n>. Presence only; the DECRYPT check is the next one.
NOTHING was written to the database.
Every check passed. The restore is verified against the baseline.
```

**Exit code 0 on success, non-zero on any failure**, so this can be run
unattended later without anyone reading the output.

**What each check actually proves, so a PASS is not over-read:**

- **Migration count** proves the restored schema is the same schema, not
  an older one. This is the check that would have caught G-120's skew
  from the other side.
- **Every table present** proves the restore is structurally whole.
- **No table came back empty** is the one that catches the failure people
  actually get: a restore that returns a correct, complete, EMPTY schema.
  It looks like success in every way except the rows.
- **The audit content hash** is the real assertion. `audit_event` is
  append-only by law, so its oldest rows cannot legitimately differ. Equal
  counts prove nothing about content; a matching hash proves the history
  came back byte-identical.
- **Vault rows** is a presence count only, and says so. Whether a
  restored ciphertext still DECRYPTS is a different question and is
  step 4.

## Step 4. The check that decides whether the restore is USABLE

Row counts and hashes prove the bytes came back. They say nothing about
whether the vault still opens, and a restore that returns unreadable
ciphertext has returned bytes and lost the record.

**Do this by hand, once, against the branch:** sign in to a deployment
pointed at the restored branch, or run the existing vault round-trip
against it, and reveal ONE seeded fixture s3 value. **It must decrypt
with the same `WK_KMS_KEY`.** If it does not, the restore is intact and
useless, and that is worth knowing before an incident rather than during
one.

**Not automated here on purpose.** Doing it in this script would mean
handing `WK_KMS_KEY` to a drill tool and decrypting a real secured value
to prove a point. The manual version costs two minutes, once.

## Step 5. Delete the branch

A restore branch is a full copy of household data with its own
connection string. **Delete it when the drill is done**, and record in
the drill log below that you did.

---

## The drill log

One line per run: date, the branch name, what the verify printed, and
whether the vault decrypt worked. **This is the artifact**, not the
branch; the value of the drill is the record that it was done and what
it showed.

| Date | Branch | Verify result | Vault decrypt | Branch deleted |
|---|---|---|---|---|
| *pending* | | | | |

---

## How the repo-side half was proven, before anyone trusts it

**Both directions, on real databases, not sentinels.**

- **Green:** baseline taken against the seeded local database, then
  verified against that same database. All five checks pass, which is the
  trivially-true direction and the one that proves the comparison runs at
  all.
- **Red:** a fresh database migrated to the same count and verified
  against the same baseline. **Migration count and table presence PASS,
  and the two content checks FAIL by name**, listing thirty tables that
  had rows and came back empty, with the audit hash differing. That is
  precisely the empty-schema restore, and the fact that two checks pass
  in that scenario is why the other three exist.
- **Refusals:** no mode, `--baseline` without `--out`, `--verify` without
  `--from`.

**The proof caught a real defect in the tool on its first run.** The
first version used `--baseline` as both the mode flag and the file
argument, so the documented `--verify --baseline <file>` set both modes
and the script refused its own instructions. Fixed to `--from`, and
recorded here because it is the argument for running a proof rather than
reasoning about one.
