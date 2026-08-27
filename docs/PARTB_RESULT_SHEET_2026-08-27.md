---
status: living
---
# Part B v5 result sheet, 27 August 2026

Run against production (`7bcbb16`) on the Smoke Test Fixture,
`8a4b9786-9698-4200-95b9-91abec7a40ef`.

**PART B IS CLOSED, 27 August 2026.** All eight steps passed on the
screen, and the database half then passed on every assertion. Both halves
are recorded below and the screen half is kept as written, because the
standing constraint is that the screen is never the evidence: those eight
passes proved a page composed, and only the queries proved rows
committed. The sheet keeps both so a later reader can see which claim
rests on which.

## The screen half: eight of eight

### A. Preference rules

| Step | Result |
|---|---|
| A1, empty state | PASS. The card rendered its empty state. |
| A2, record | PASS. `PARTB-0057-2026-08-27-do-not-move-the-blue-bin` recorded. Banner: "preference recorded; it is in the table below and in the audit trail." Provenance rendered as **explicit**. |
| A3, retire | PASS. Retired with reason `PARTB-retire-check`. Banner: "preference retired." **Rule text reads back character for character.** Reason rendered on its own line as `retired: PARTB-retire-check`. Row still present. |
| A4 | See the render-versus-empty-state note below. |

### B. Situations

| Step | Result |
|---|---|
| B1, empty state | PASS. The card rendered its empty state. |
| B2, open | PASS. `PARTB-0056-2026-08-27-front-gate-latch` opened. Banner: "situation opened; it is in the table below and in the audit trail." |
| B3, resolve | PASS. Resolved with note `PARTB-resolve-check`. **Label reads back character for character.** Note rendered on its own line. Row still present. Card shows `0 bundled · resolved`. |
| B4 | See the note below. |

### The render-versus-empty-state note, which the script asks for by name

The script asks which behaviour A4 and B4 exercise. **The answer is
render, not empty state.**

Both cards KEEP the record visible after retirement or resolution rather
than removing it. So the reload-for-empty-state step does not apply: it
would be testing for a disappearance that is not the designed behaviour,
and a card that emptied itself would be the defect.

That is the correct posture and matches the standing rule that nothing
hard-deletes by default. Retirement and resolution are state changes on a
row that remains readable, which is what makes the retired reason and the
resolution note worth rendering at all.

## The database half: PASS on every assertion

Run against production by the founder, 27 August 2026, read-only.
`tooling/verify/partb-db.sql` is the file; the values below are hers.

**PRECONDITION 0, five CHECK constraints present**, which is what makes
everything under it mean what it appears to mean:

| Constraint | Enforces |
|---|---|
| `preference_rule_confidence_is_whole` | explicit implies confidence NULL |
| `preference_rule_retirement_is_whole` | retired implies reason, at and by all present |
| `preference_rule_status_known` | active or retired |
| `situation_resolution_is_whole` | resolved implies resolution, at and by all present |
| `situation_status_known` | open or resolved |

Five, not fewer. G-72's point exactly: a whole state group and an
ENFORCED state group are identical in the data, and only this query
separates them.

**A. `preference_rule`, every assertion true.**

| Assertion | Reading |
|---|---|
| A1 rule byte-identical | `PARTB-0057-2026-08-27-do-not-move-the-blue-bin`, 46 chars / 46 bytes, md5 `cfcbca52...` |
| A1 reason byte-identical | `PARTB-retire-check`, 18 / 18 |
| A2 retirement group whole | true |
| A3 provenance explicit, confidence NULL | true |
| A4 household is the fixture | true |

Created 22:30:19.253, retired 22:31:08.992.

**B. `situation`, every assertion true.**

| Assertion | Reading |
|---|---|
| B1 label byte-identical | `PARTB-0056-2026-08-27-front-gate-latch`, 38 / 38, md5 `46a452e5...` |
| B1 resolution byte-identical | `PARTB-resolve-check`, 19 / 19 |
| B2 resolution group whole | true |
| B4 household is the fixture | true |

Created 22:34:19.275, resolved 22:35:13.602.

**4b, household scoping from the other direction.** Exactly one Part B
row per table, both on the Smoke Test Fixture, no row on any other
household. A4 and B4 can only speak about a row that was found; this is
the half that would have shown a write landing on the wrong tenant as an
extra line rather than as silence.

**Two things the readings say that no single assertion states.**

**Chars equal bytes on every string.** Nothing was mangled in transit:
the operator's bytes are the stored bytes. That is precisely the claim a
screen render cannot make, and it is why the length columns ride beside
each equality rather than the equality standing alone.

**Both lifecycle groups moved WHOLE**, about a minute after creation:
retired and resolved each arriving with reason, timestamp and actor set
together. That is the accepting direction of both new CHECKs, proven on
live production data for the first time. Their refusing direction was
proven in SQL when 0056 and 0057 landed; this is the other half.

**One citation corrected rather than carried.** The 4b block was
described in the run report as "the G-23 check". It is not. G-23 is the
smoke checklist becoming unsafe once demo data is archived
(`GAP_REGISTER.md:571`), and no register entry covers cross-tenant
scoping at all. The check is real and unnamed, which is better than
named wrongly: a wrong pointer survives longer than a missing one,
because following it costs more than not following it.

## What this run could NOT close

**Neither negative check was run.** The four-character minimum's
server-side enforcement is therefore **still unproven in production**. It
is proven in the journeys (a short rule refuses, a short label refuses),
so this is an unexercised path in one environment rather than an unknown
behaviour, and the distinction is worth keeping: a journey proves the
code refuses, and only a production run proves the deployed build does.

That follow-up stays OPEN and is not closed by this sheet.

**And the runner was not the one that shipped.** `psql` is not installed
on the machine holding the production connection, so
`apps/web/scripts/run-sql-readonly.mjs` was written to remove that
dependency. It arrived one merge after the founder's pull, so she wrote
an equivalent to the same contract (strip comments, refuse any
non-SELECT, execute read-only) and ran the queries through that. The
results are the file's, unchanged; the shipped runner is on `main` and
still unexercised by the person it was written for. Recorded because
"the tool exists" and "the tool was used" are different claims and the
sheet should not imply the second.
