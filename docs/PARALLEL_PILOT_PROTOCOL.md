# Parallel Pilot Protocol: paper and app, side by side

Paper is the system of record; the app is the harness under test.

Per visit: (1) the HM runs the visit entirely on the paper system;
(2) within 24h the same visit is mirrored into the app (briefing reviewed,
close flow re-entered, dots re-logged); (3) any point where the app made the
mirror harder, easier, or different from paper goes in the friction log with
a verdict: APP DEFECT (fix in code) or SPEC CANDIDATE (route to the
methodology library, WK-QA series).

Weekly: diff the app's household record against the workbook (the importer's
--against dry run does this mechanically); zero silent drift allowed.
Quarterly: the app's exhibit tables are reconciled against the hand-built
WK_SBA workbook figures before any number is shown to a lender.

Exit test for the parallel phase: one full month where the mirror produced
zero APP DEFECT entries and the weekly diffs were clean; only then does an
ADR propose promoting the app to system of record.
