---
status: living
---
# Parallel Pilot Protocol: paper and app, side by side


> **Gate note (post-deploy review, 2026-07-27):** the friction log's
> ⟨home⟩ and ⟨owner⟩ brackets below are a GATE on the pilot starting,
> not a tidy-up — this protocol is what makes the pilot produce evidence
> rather than activity, and an unowned friction log produces neither.
Paper is the system of record; the app is the harness under test.

Per visit: (1) the HM runs the visit entirely on the paper system;
(2) within 24h the same visit is mirrored into the app (briefing reviewed,
close flow re-entered, dots re-logged); (3) EVERY mirrored visit gets a
friction-log row (G-24), with one of THREE verdicts: APP DEFECT (fix in
code), SPEC CANDIDATE (route to the methodology library, WK-QA series), or
NO FRICTION (the mirror ran clean — a row that proves the log was kept,
which is different from proving friction existed).

**The friction log** (G-20): lives in ⟨name the location — a dedicated
sheet in the WK_PLAY_002 workbook is the natural home, since paper is the
system of record⟩, written by ⟨owner — the HM logs friction at mirror time;
Rachel assigns the verdicts⟩. Both decided before the first mirrored visit,
not after; the exit test below makes this log's completeness load-bearing.

Weekly: diff the app's household record against the workbook — mechanically,
in two steps (G-20):

    pnpm --filter @wellkept/schema db:dump -- <household-uuid> /tmp/wk-drift-dump.json
    python3 tooling/import/wk_import.py WORKBOOK.xlsx --against /tmp/wk-drift-dump.json
    rm /tmp/wk-drift-dump.json

The `--against` report shows the field-by-field delta; zero silent drift
allowed — every delta is either a mirror miss (fix the mirror) or a
friction-log entry. Dump hygiene (G-27): the dump carries NO vault
material — s3 values are structurally absent from field rows, that is the
vault law — but it IS a plaintext household record outside every control
the system enforces, the exact artifact staff confidentiality clause 4
forbids staff to create. So: corporate runs this, to a temp path, and the
`rm` is part of the procedure — the week ends where it started.

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
2. At least 12 mirrored visits in the window;
3. EVERY mirrored visit has a friction-log row (G-24: NO FRICTION is a
   valid row) — missing rows mean the log was not kept, and the window is
   INCONCLUSIVE, not clean;
4. Four consecutive clean `--against` diffs inside the same window;
5. At least one mirrored visit in the window performed by a backup HM —
   the record must work for someone other than the person who wrote it
   (the Stranger Test's thesis, and A2's distinct-users guard).

The window is a ROLLING 30 DAYS, not a calendar month (G-25: partial
first/last weeks broke criterion 4 for reasons that had nothing to do
with the software).

N=12 is a STRUCTURAL GATE, chosen deliberately (founder decision,
2026-07-25): at weekly cadence it means promotion off paper requires
roughly THREE households running concurrently. That is on purpose — A2
will not retire a single trigger rule on evidence from fewer than three
households and two users, and retiring the paper system of record cannot
rationally clear a lower bar; single-household evidence cannot
distinguish "the app is sound" from "the app fits this one house"; the
mirror costs about an hour a week while premature promotion risks the
pilot's purpose; and three households is the business milestone the
economics need anyway, so the app earns system-of-record status exactly
when the business earns its next stage. If the mirroring burden ever
itself threatens the pilot, revisit N with the reason written down here.
