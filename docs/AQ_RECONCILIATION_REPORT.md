---
status: frozen
---

# Session AQ: reconciliation report

Executed 1 August 2026 in the working session, from `SESSION_AQ_RECONCILIATION.md`.
Read-only; nothing was reconciled silently. Filed 2 August 2026 because the
commissioning package's housekeeping item 5 found the bundle documents
disagreeing about whether AQ had run: it had, but its report existed only in
the session transcript, with its findings scattered into the gap register.
This document is the durable record, and its existence opens AR's gate.

## The six disagreements

**1. Section 0 and the section count.** The code is stale against the
1 August REQ-011 correction: `playbook_field.section` is documented 1..24
(`tables.ts:98`), no Section 0 slot exists, and field-level decline as a
confirmed state distinct from `N/A-confirmed` is not representable. No
category-decline or Record Preview mechanism exists. `WK-DEV-005`'s
"24-section record" glossary line is also stale against its own sibling
document. Engineering once the decline value's meaning is decided; partly a
founder call.

**2. Membership shape.** Neither side was right. `household.tier` is a live
NOT NULL column written once at creation; `membership_event` is append-only
and captures every change, so the spec's feared history destruction does not
apply. The real defect was that nothing kept the column in sync with the
log. Fixed 1 August (PR #105, reconcile-on-write in the same transaction);
the live-data read (G-60, 1-2 August) then confirmed no drift had occurred
and that three of four households carry a tier with no event history at all
(seeded directly, no `start` event).

**3. Deletion and the erasure tool.** Not a code-vs-document disagreement;
the real disagreement was inside the repo's own `CLAUDE.md`, which claimed
the vault crypto-shred was the single hard-delete exception when
`erase-household.mjs` documents six. Fixed in PR #104. No non-client table
exists for the tool to reach, consistent with the G-56 gate. The
REQ-076-vs-WK-DEV-005 framing was resolved 1 August by counsel: no
statutory obligation; WK-STD-026's rules stand as company policy.

**4. Horizon substrate.** The spec's "cannot run today" was stale for
exactly the class it names: `registry-sweep.ts:120-121` already computes
replacement dates from `installedAt` + `lifespanMonths` for
appliance/horizon kinds. No substrate exists for people, documents,
policies, vehicles, schools, or activities; those fields genuinely do not
exist (G-57). Phase-1 work is an extension of a working mechanism, not a
new build.

**5. Trigger storage.** No disagreement. Rules are rows
(`createTriggerRule`, corporate_admin-gated, read at match time by
`run.ts`); a trigger is a data change with no deploy. The documents and the
code agree, and WK-APP-008 Phase 4's acceptance criterion was already met.

**6. The two never-auto-surfaced Moments.** The documents asked for a hard
exclusion the code did not have; the absence was harmless only because no
diagnosis- or elder-care-adjacent trigger binding existed. Closed 1 August
by the decline-class guard (PR #107, Ruling 1): a rule matching a
decline-class field with no reviewed exclusion now throws at match time,
and new Section 1/3 fields must be explicitly classified.

## The two general questions

**Citations.** Code citations resolve cleanly except `WK-STD-000`,
`WK-STD-014`, and `WK-STD-023`, which belong to the numbered
service-standard series behind `standard_provision`, a different corpus
than the 25-document developer bundle. Unverifiable from the bundle alone;
not a renumbering casualty on the evidence available.

**Code with no document behind it.** The offline queue's failure-recovery
design (dead-letter, backoff, atomic tab handoff), the G-53 reveal-outcome
fix, and the refusal-visibility guard exist only in the repo's own gap
register, not in the library. Conversely `condition_flag`, `deferral`, and
`paused_decision` are correctly grounded in WK-STD-016 at their definitions.

## Temptations reported

Two, both caught: reassuring away finding 2 by pointing at
`membership_event` (which would have buried the sync defect), and passing
over `CLAUDE.md`'s own stale exception count as out of scope in finding 3.
