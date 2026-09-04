---
status: frozen
---
# Extraction test · FCPS 2026-27 Standard School Year Calendar

Source: https://www.fcps.edu/system/files/forms/2025-04/2026-2027-standard-school-year-calendar.pdf (updated 10 April 2026). Method: text-layer extraction only, as the capture pipeline's first pass would do. No vision pass and no coordinate parsing was possible from this environment (the district blocks the direct download); those are the two methods the result argues for.

## What text extraction recovered cleanly
Labeled entries with explicit dates, suitable to land as `expected` facts for HOM confirmation:
- Labor Day break: 4 to 7 September 2026
- Rosh Hashanah 12 September (sundown 11 to 13); Yom Kippur 21 September (sundown 20 to 21)
- Indigenous Peoples' Day 12 October; Election Day 3 November; Veterans Day 11 November; Diwali 8 November
- Thanksgiving break: 25 to 27 November 2026
- Winter break: 21 December 2026 to 3 January 2027
- MLK Day 18 January; Presidents' Day 15 February 2027
- Ramadan from 8 February; Eid al-Fitr 10 March; Nowruz 20 March; Passover 21 to 29 April; Eid al-Adha 17 May; Orthodox Easter 2 May
- Spring break: 22 to 26 March 2027; Good Friday 26 March
- Memorial Day 31 May; Juneteenth observed 18 June 2027
- Quarter end dates and lengths: Q1 30 October (46 days), Q2 28 January (48), Q3 16 April (47), Q4 16 June (39)
- Five-day instructional weeks per quarter: 6, 7, 7, 5
- The note that lunar observances may shift

## What text extraction lost
The grid codes (F first day, QE quarter-end early release, YE last day, TW teacher workday, SD staff development, SP planning day, NT new-teacher training) are positional cells. In the text layer they arrive as bare tokens ("TW SP", "TWSD", "QE TW") detached from their day. So the first day of school, every two-hour early release, every student holiday that is a teacher workday, and the last day of classes are all unrecoverable from text alone. These are exactly the days a family most needs anticipated (childcare gaps, pickup changes).

## What this means for the capture pipeline (Q-7) and the horizon layer (Q-12)
1. Do not extract district calendars from PDFs as the primary source. FCPS publishes a subscribable Standard School Year Calendar and per-school ICS feeds (webcal://<school>.fcps.edu/subscribe/<id>/calendar.ics) plus a Tandem calendar with filters. Ingest the ICS feed read-only into the horizon layer; it carries the dated events the PDF encodes positionally and it updates when the district changes a date, which the PDF never will.
2. Keep PDF extraction as the fallback for schools and programs without feeds (private schools, camps, activity flyers), and make it two-pass: text layer first, then a vision pass over the rasterized page for grid-coded or tabular documents. Any date that only the vision pass produced lands as `estimated`, not `expected`, and is confirmed by the HOM.
3. Source revision intelligence matters here: the FCPS PDF is already on its second revision (April 2026). Every calendar-derived commitment should carry the source version so a re-issue triggers a changeset rather than a silent drift.
4. For the fixture corpus, include this PDF, the same year's ICS feed, and one private-school calendar with no feed. The three together test the three paths.
