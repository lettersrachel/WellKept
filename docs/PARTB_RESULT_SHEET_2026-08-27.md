---
status: living
---
# Part B v5 result sheet, 27 August 2026

Run against production (`7bcbb16`) on the Smoke Test Fixture,
`8a4b9786-9698-4200-95b9-91abec7a40ef`.

**Part B is NOT CLOSED by this sheet.** All eight steps pass on the
screen and the database half is outstanding. The standing constraint is
that the screen is never the evidence, so everything below the line is a
render observation until the queries return.

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

## The database half: OUTSTANDING

**This is what closes Part B**, and it has not been run. The queries are
in `partb-db.sql`.

Four assertions on each row, plus one precondition the register's own
doctrine requires:

0. **PRECONDITION: the CHECKs exist in production.** Printed from
   `pg_constraint` before anything else. G-72: six CHECK refusals once
   reported a clean REFUSED with Postgres down, and a whole state group
   proves nothing if the constraint that makes it whole is absent. A
   passing group and an absent constraint look identical in the data.
1. **Byte-identical**, not similar on screen. Equality against a
   dollar-quoted literal, with `length`, `octet_length` and `md5`
   alongside, so trailing whitespace and encoding differences cannot hide
   behind a visual match.
2. **Every member of the state group populated together.** A partial
   group would mean the CHECK is not doing its job on the serving path,
   which is the failure this step exists to catch.
3. **`provenance = 'explicit'` and `confidence IS NULL`** on the
   preference rule. Anything else is a STOP and its own register entry
   about who else can write to that table, because the app's action takes
   no provenance input at all and can only create explicit rows.
4. **`household_id` is the fixture on both**, and a grouped count proves
   nothing was written under any other household.

**One column-name correction, caught before the queries were written.**
The preference rule's text column is `rule`, not `rule_text`. The
screen-half report above uses the phrase "rule text", which is the right
description and the wrong identifier; the queries use `rule`.

## What this run could NOT close

**Neither negative check was run.** The four-character minimum's
server-side enforcement is therefore **still unproven in production**. It
is proven in the journeys (a short rule refuses, a short label refuses),
so this is an unexercised path in one environment rather than an unknown
behaviour, and the distinction is worth keeping: a journey proves the
code refuses, and only a production run proves the deployed build does.

That follow-up stays OPEN and is not closed by this sheet.
