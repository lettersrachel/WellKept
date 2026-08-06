---
status: living
---

# Library index (repository slice)

Created 5 August 2026 (housekeeping item 9). The operating library's system
of record is the founder's library under WK-SOP-000 and WK-SOP-029; this
index covers only what is mirrored INTO the repository and what a code
session needs to know exists elsewhere. When this index and the library
disagree, the library wins; report the disagreement, do not reconcile it.

## Adopted and ratified documents mirrored in docs/library/ (ruling A121, 2 August 2026)

Verbatim founder-issued copies, checked free of financial figures before
commit. The .docx files are the authoritative text; nothing in the repo
paraphrases them.

| Document | File | Status |
|---|---|---|
| WK-STD-027 Household Fit Standard | `library/WK-STD-027_Household_Fit_Standard_2026-08-02.docx` | ADOPTED |
| WK-STD-028 Response Architecture and Member Communication Rhythm | `library/WK-STD-028_Response_Architecture_2026-08-02.docx` | ADOPTED (requirements appended to WK-DEV-001 as REQ-078..082) |
| WK-PLAY-003 Addendum C, Fit Diagnostics v1.2 | `library/WK-PLAY-003_AddendumC_Fit_Diagnostics_2026-08-02.docx` | ADOPTED |
| Four-Stage Application Spec | `library/WK_Four_Stage_Application_Spec_2026-08-02.docx` | ADOPTED (target architecture; post-AR proposal, nothing implements against it yet) |
| WK-PLAY-001 Addendum F Part One, The Social Horizon | `library/WK-PLAY-001_AddendumF_The_Social_Horizon_2026-08-02.docx` | RATIFIED |
| WK-PLAY-001 Addendum F Part Two, Environment Library | `library/WK-PLAY-001_AddendumF_PartTwo_Environment_Library_2026-08-02.docx` | RATIFIED |
| WK-SOP-030 Addendum A Part One, Operating Horizon | `library/WK-SOP-030_AddendumA_Operating_Horizon_2026-08-02.docx` | ADOPTED |
| WK-SOP-030 Addendum A Part Two, Grid Elsewhere | `library/WK-SOP-030_AddendumA_PartTwo_Grid_Elsewhere_2026-08-02.docx` | ADOPTED |

## Governance and commissioning records in docs/

- `SESSION_COMMISSIONING_BRIEF.md`, `FOUNDER_RULINGS_2026-08-02.md`,
  `DURABILITY_REQUIREMENTS_2026-08-02.md`: the 2 August commissioning
  package, frozen. Every code session reads the rulings before AR-era work.
- `WK-DEV-001_Requirements.md`: the requirements list, living, carrying the
  REQ-076 withdrawal, REQ-077, and the adopted REQ-078..082 with gates.
- `WK-APP-008_Making_Anticipation_Functional.md`: the anticipation
  implementation spec, living, corrected copy per register A124 (the AQ
  supersession banner, the REQ-076 withdrawal in Part 3's table, and AQ
  correction 4: the client access-log 30 July 2026 date floor, which is
  now a ships-only-with condition in Part 10 phase 10).
- `WK-DEV-005_Developer_Handbook.md`: living, carrying the corrected
  Section 3 deletion wording and the stage-enum design-review rule.
- `PROVISIONAL.md`: the counsel-pending and pilot-calibrated register,
  enforced by `provisional-markers.test.ts`.

## Numbering notices (WK-QA-018 A107/A108)

- WK-STD-027 and WK-STD-028 are NEW documents. They are not WK-STD-025
  (Before Not After) or WK-STD-026 (Records About People Who Are Not
  Clients), both of which stand unchanged; WK-STD-026 remains load-bearing
  for G-56, REQ-077 and ADR-006.
- WK-STD-029 is RESERVED (records under legal exposure, unissued).
- Any file named WK-STD-025_Household_Fit or WK-STD-026_Response_Architecture
  is a WITHDRAWN A107 filename: report it, never read it as current.
  Checked 5 August 2026: none exists in this repository.

## Adopted-track, September list, NOT mirrored here

WK-STD-030 (learning membrane), WK-STD-031 (regional events), the Watch
Panel (WK-SOP-030 Addendum B), WK-HR-006 Addendum A: adopted-track
documents whose software touches, if any, are routed in September. Held in
the library only until then.
