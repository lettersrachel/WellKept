---
status: living
---
# What is actually in docs/library, and what still has to be pulled

28 August 2026. A full listing and a nine-document check, run wide because the
question behind it is whether today's requests were built on an absence that
was the shape of a query.

**The short answer: the library is NOT mirrored. It is a ten-file slice, and
none of the nine documents asked about is in it.** The three-SOP pull and the
A213 request both stand. The concern behind the question was right in general
and does not hold for these nine.

## 1. docs/library, complete, every file and every extension

Ten files. All `.docx`. No subdirectories.

| File | Size | Added |
|---|---|---|
| `WK-PLAY-001_AddendumF_PartTwo_Environment_Library_2026-08-02.docx` | 16539 | 24 Aug 17:59 |
| `WK-PLAY-001_AddendumF_The_Social_Horizon_2026-08-02.docx` | 12221 | 24 Aug 17:59 |
| `WK-PLAY-003_AddendumC_Fit_Diagnostics_2026-08-02.docx` | 11540 | 24 Aug 17:59 |
| `WK-SEC-001_Application_Security_Audit_Scope.docx` | 39577 | 24 Aug 18:52 |
| `WK-SOP-030_AddendumA_Operating_Horizon_2026-08-02.docx` | 14036 | 24 Aug 17:59 |
| `WK-SOP-030_AddendumA_PartTwo_Grid_Elsewhere_2026-08-02.docx` | 11181 | 24 Aug 17:59 |
| `WK-STD-027_Household_Fit_Standard_2026-08-02.docx` | 16677 | 24 Aug 17:59 |
| `WK-STD-028_Response_Architecture_2026-08-02.docx` | 16394 | 24 Aug 17:59 |
| `WK_Four_Stage_Application_Spec_2026-08-02.docx` | 11811 | 24 Aug 17:59 |
| `Well_Kept_Software_Workload_Forecasting_Developer_Implementation_Brief_2026-08-24.docx` | 82251 | 24 Aug 20:07 |

**The directory calls itself a slice and always has.** `LIBRARY_INDEX.md:8`:
"this index covers only what is mirrored INTO the repository and what a code
session needs to know exists elsewhere." Eight of the ten arrived in one batch
at 17:59; two arrived later the same evening. **The slice grows**, which means
an absence check has a DATE on it, not just a result.

## 2. The nine documents asked about

**None of the nine is in the repository, in any form.** Checked four ways, and
the ways are listed because the point of this census is that a search's reach
is part of its result.

1. **Filenames, whole repo, any extension** (`find`, excluding
   `node_modules`): zero matches for all nine. The single hit on `OPS-002` is
   `docs/K-OPS-002_TRACE_2026-08-28.md`, which is the trace written yesterday,
   not the document.
2. **Inside all ten `.docx` files** (every XML part extracted, not just
   `document.xml`): one hit, and it is informative rather than a find.
   **WK-SEC-001 names "WK-SOP-019 Technology, Photo and Data Security" in its
   Provided-to-the-engineer list.** So WK-SOP-019 is confirmed to exist, is
   confirmed to be something an auditor is handed, and is confirmed NOT to be
   here.
3. **Every tracked text file** (98 `.md`, one `.html`, one `.csv`): each
   identifier is CITED, between one and fourteen times. **Citations are not
   documents.** `WK-SOP-019` appears in fourteen files, including two React
   components and `CHILD_DATA.md`, always as an authority reference of the
   form "Internal-class per WK-SOP-019", never as content.
4. **The standards store in the database**, in case SOP text had been seeded
   rather than filed: it holds `STD-000` through `STD-023` and nothing else.
   No `WK-SOP`, no `WK-FIN`, no `WK-OPS` provisions.

| Document | In docs/library? | Anywhere in repo? | Note |
|---|---|---|---|
| WK-SOP-029 | no | no | cited in 3 files, always as the library's system-of-record authority |
| WK-SOP-005 | no | no | needed for row 8's QA five dimensions |
| WK-SOP-015 | no | no | cited in 4 files, including a demo playbook line about key logging |
| WK-SOP-016 | no | no | needed with 015 and FIN-005 for row 5's purchase limit |
| WK-SOP-018 | no | no | needed with 019 for what row 11 means by feedback |
| WK-SOP-019 | no | no | **named inside WK-SEC-001** as provided to the auditor; cited in 14 repo files |
| WK-FIN-005 | no | no | cited in 2 files |
| WK-OPS-002 | no | no | the trace's own subject; only my trace document matches the string |
| A213 | no | no | cited in 4 files, all of them written yesterday and today |

**So the three-SOP pull and the A213 request are both still necessary**, and
row 4 still needs a device rather than a document.

## 3. What the question did surface, and it is a real one

**`LIBRARY_INDEX.md` is stale, and I quoted it as authority without checking
it.**

The index names **eight** files. Ten are on disk. The two it does not name are
**WK-SEC-001** and the **Workload Forecasting brief**, both added on 24 August
after the index was written, neither ever added to it.

**Which makes yesterday's G-106 correction itself partly wrong.** G-106 said
WK-SEC-001 "is at `docs/library/...`, listed in `LIBRARY_INDEX.md`". The first
half is true. **The second half is false**, and I repeated it in three
documents and twice in conversation.

That is the same error the entry was filed to record, committed inside the
entry recording it, one day later. Filed as **G-107** and corrected in all
three places.

**The mechanism is worth more than the embarrassment.** Having just been
burned by trusting a search, I reached for a document as the authority
instead, and did not check the document against the directory either. **An
index is a hand-maintained count of a thing that can be listed**, which the
conventions already name as the failure mode that produces silent drift: no
error, reads as authoritative, wrong. The directory is the fact; the index is
a claim about it.

**The fix that would hold**: a guard asserting `LIBRARY_INDEX.md` names every
file in `docs/library/`, computed from the directory with a count floor, in
the pattern of the existing censuses. Small, and it is the standing preferred
fix for something currently held by memory. **Not built here**, since this was
a read-and-report task; named as the obvious next session.

## 4. The rule this leaves behind

Yesterday's version was: an absence claim is only as wide as the search that
produced it. Today adds the other half.

> **State the search beside the claim, and prefer the artifact to the index.**
> A directory listing, a `find` across the tree, and a content scan inside the
> binary formats are three different reaches, and a document that describes a
> directory is a fourth thing that can be wrong on its own. Where the artifact
> can be listed, list it.

Both halves of the census in this document are stated with their method for
that reason, so the next reader can see what was looked at rather than
trusting that something was.
