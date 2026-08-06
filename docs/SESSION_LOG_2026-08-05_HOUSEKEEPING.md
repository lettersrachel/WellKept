---
status: frozen
---

# Session log: housekeeping, 5 August 2026

Ran per the founder's instruction of 5 August: the commissioning brief's
housekeeping items plus INSTRUCTION_UPDATES_2026-08-05_v2 section 6 items
7 through 10, and nothing further. Queue order preserved; no migration; no
code changed. The reading order was followed: the commissioning brief, then
v1 (sections 1, 2, 5 standing), then v2 (superseding v1 sections 3, 4, 6;
A121/A122 executed, the referenced standards ADOPTED).

## Done this session

1. **Item 7, withdrawn-filename check: CLEAN.** No WK-STD-025_Household_Fit
   or WK-STD-026_Response_Architecture filename exists in the repository
   docs folder, and none exists in the 5 August bundle either (its
   standards carry the reissued A108 numbers).
2. **Item 8, REQ-078..082 appended to WK-DEV-001 as adopted**, each with
   its implementation gate inline (REQ-078/079/080 after AR with the
   SMS/voice provider prerequisite; REQ-081/082 after AR). In the same
   file, brief item 4's verification found the bundle copy still carried
   REQ-076 as an active P0 with no withdrawal and no REQ-077; both were
   applied per the executed 1 August ruling, with the original REQ-076
   text preserved as the dated record.
3. **Item 9, adopted documents mirrored and indexed.** The eight A121
   adopted/ratified documents copied verbatim into `docs/library/` after
   each was checked free of financial figures (all eight CLEAN, including
   the Four-Stage spec, which lives in a strategy folder in the bundle).
   No docs index existed; `docs/LIBRARY_INDEX.md` created, carrying the
   numbering notices and the September adopted-track list that is
   deliberately NOT mirrored.
4. **Item 10, stage-enum design-review rule recorded** in
   WK-DEV-005 section 4 (change control): any feature tagged "decide"
   receives the returned-choice design review before it ships.
5. **Brief item 2, WK-DEV-005 ported into the repo with Section 3
   corrected.** Reported as a disagreement first: the 2 August instruction
   file said the correction was already made in the bundle copy; the copy
   in the bundle still carried the false "nothing hard-deletes" sentence.
   Ported with the correction applied and dated, matching CLAUDE.md's
   PR #104 wording (six documented DELETE exceptions).
6. **Brief items 1, 5, 6: already done in the 1-2 August sessions**, noted
   for the record: the three doctrine lines are in CLAUDE.md (PR #110),
   the READ_THIS_FIRST contradiction is resolved by the filed
   `AQ_RECONCILIATION_REPORT.md` (AQ ran 1 August; AR's gate is open), and
   the Direction 4 tier-drift query ran against production (G-60: no
   drift; three of four households carry a tier with no membership_event
   history; price_cents present but sparse).
7. **The 2 August commissioning package committed to docs/** (brief,
   rulings, durability requirements; all three checked free of em dashes
   and financial figures), because the 5 August instruction's reading
   order describes the brief as "in the repo" and it was not; committing
   the founder-issued copies makes the premise true and gives future
   sessions the rulings they are required to read.
8. **PROVISIONAL.md scrubbed and updated.** The WK-LEG-011 entry seeded on
   2 August carried the pre-amendment founding rate as a literal figure;
   under the standing rule (financial figures never in source control) the
   figure is removed, and the entry now reflects the A106/A108 amendment
   (full list rate plus a service credit; figures live in WK-LEG-011 in
   the library only).

## Disagreements reported, report-and-stop

- **The 5 August instruction says the commissioning brief is "in the
  repo." It was not** (its operative content was in the gap register; the
  file itself was never committed). Resolved by committing it, noted here
  rather than done silently.
- **The 2 August instruction file (entry 5) says the WK-DEV-005 Section 3
  correction was already made in the bundle copy. It was not** in the copy
  this session holds. Corrected during the port, dated inline.
- **WK-DEV-001's bundle copy did not carry the REQ-076 withdrawal or
  REQ-077** despite both being executed 1 August rulings. Applied during
  the port, original text preserved.
- **PROVISIONAL.md briefly held a financial figure** (seeded 2 August from
  the founder's own seed file, which carried it; the never-in-source-
  control rule was restated explicitly on 5 August). Scrubbed this
  session. The seed file itself is not committed, and neither are the two
  instruction-updates files, which carry a dollar figure v1 itself says
  must not enter source control.

## Not done, correctly

- No implementation of REQ-078..082 (gated after AR plus the provider
  prerequisite), the fit-diagnostics schema, the decline register, the
  Decision Rights block, the stage enum, the expectation kind, or M-25
  capture: all adopted, all queued via WK-QA-015 behind the AR gate, one
  migration per session when they come.
- Nothing from v2 section 5's not-unlocked list (payments/ACH, the
  founder-credit ledger, catalog addenda, WK-STD-030/031, the Watch
  Panel, HR-006 Addendum A).
- The financial model files in the bundle were not extracted or read.
- Brief item 3 (deleting the duplicate AO/AP briefs) is library-side; no
  repo copies exist.

## Appended in the same pull request: the gates job broke under this PR for an unrelated reason, fixed here

The first CI run failed on the dependency-audit step, not on anything this
session changed: a new advisory (GHSA-rgw5-rvv9-x895, brace-expansion DoS)
published between PR #110's green run and this one, failing
`pnpm audit --audit-level=high` on every future PR. Fixed with the repo's
established mechanism (`pnpm.overrides`): each minimatch major line is
parent-scoped to its own API-compatible patched brace-expansion line
(minimatch@3 to the 1.x patch, minimatch@9 to the 2.x patch, 5.x consumers
to 5.0.9). The first attempt, a blanket re-resolution to 5.0.9, broke
minimatch@9 at runtime (its build expects the v2 export shape) and was
caught by the permissions suite before push; the parent-scoped form passes
the full suite (11 tasks, 177 tests) and the audit. Eight moderate
advisories remain, below the gate's high threshold, untouched.

## Queue position after this session

Housekeeping is complete. Directions 0, 2, 1a, 3a, AO, AP and AQ all ran
in the 1-2 August sessions and their reports are filed; per the brief's
own sequence, the queue now stands at AR, whose gate (the AQ report plus
the founder rulings) is satisfied. AR's first work is whatever AQ marked
stale in the DOCUMENTS, fixed under WK-SOP-026 before any code moves; its
first code work in the audit area is G-59's tokenisation (Ruling 2), and
the Temporal Layer (Ruling 4) still waits on the founder's August paper
capture validating the field list.
