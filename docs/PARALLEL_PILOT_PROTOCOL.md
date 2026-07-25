# Parallel Pilot Protocol: paper and app, side by side

Paper is the system of record; the app is the harness under test.

Per visit: (1) the HM runs the visit entirely on the paper system;
(2) within 24h the same visit is mirrored into the app (briefing reviewed,
close flow re-entered, dots re-logged); (3) any point where the app made the
mirror harder, easier, or different from paper goes in the friction log with
a verdict: APP DEFECT (fix in code) or SPEC CANDIDATE (route to the
methodology library, WK-QA series).

**The friction log** (G-20): lives in ⟨name the location — a dedicated
sheet in the WK_PLAY_002 workbook is the natural home, since paper is the
system of record⟩, written by ⟨owner — the HM logs friction at mirror time;
Rachel assigns the verdicts⟩. Both decided before the first mirrored visit,
not after; the exit test below makes this log's completeness load-bearing.

Weekly: diff the app's household record against the workbook — mechanically,
in two steps (G-20):

    pnpm --filter @wellkept/schema db:dump -- <household-uuid> dump.json
    python3 tooling/import/wk_import.py WORKBOOK.xlsx --against dump.json

The `--against` report shows the field-by-field delta; zero silent drift
allowed — every delta is either a mirror miss (fix the mirror) or a
friction-log entry.

Quarterly: the app's exhibit tables are reconciled against the hand-built
WK_SBA workbook figures before any number is shown to a lender — and the
reconciliation leaves evidence (G-21): one dated sign-off row per quarter.

| Quarter | Reconciled by | Workbook version | Exhibit period | Deltas found | Date |
|---|---|---|---|---|---|
| | | | | | |

## Exit test for the parallel phase

Promotion is proposed by ADR only when ALL of the following hold in a
single calendar month (G-16 — the volume guard exists because zero defects
across a handful of visits is equally consistent with a sound app and with
nobody logging anything; Addendum A2's retirement flag applies the same
reasoning to trigger rules, and retiring the paper system of record
deserves no less rigour):

1. Zero APP DEFECT entries in the friction log;
2. At least ⟨N — suggest 12⟩ mirrored visits in the month;
3. At least ⟨M — suggest 8⟩ of them carrying at least one friction-log
   entry of ANY kind — a month with an empty log is INCONCLUSIVE, not
   clean; it means the log was not kept, and the month does not count;
4. Weekly diffs clean all month (four consecutive clean `--against` runs).

The bracketed numbers are founder policy; the guard is the point. Only
then does an ADR propose promoting the app to system of record.
