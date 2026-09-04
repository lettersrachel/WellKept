---
status: frozen
---
# Part C · Review of Session Q-0b and rulings on its ground-truth items

Date: 4 September 2026. Author: Rachel Letters, CEO (founder ruling). Paste as a second review on PR #282. Register under the same WK-QA-018 entry as Parts A and B.

## 1. Q-0b is accepted
The intake, the twelve-commit merge with standing wording winning, the register flips, RFC-ATTR-01 Amendment 1, and the re-cut queue are accepted as reported. The four disagreements named in the report are ruled below; the remaining eleven in `docs/sessions/2026-09-04_Q-0b.md` are ruled in §3.

## 2. Rulings on the four named items
1. **Nine tables, not six.** The ruling's "six-table delete" was a stale count from the 24 August library. The repository's CI-enforced list of nine is authoritative. Correct the number wherever Part A's text was merged; intent unchanged: the rows delete by design and are never converted to tombstones. Lesson recorded under the intake rule: counts and lists come from the tree, never from a document about the tree.
2. **The WK-DEV-007 digest freeze governs.** It was adopted under two keys and a single-founder review does not lift it. Q-6, Q-8b and Q-9 are split, not deferred:
   - Freeze-safe halves proceed in their queue positions: Commitment Ledger state and the Handled invariant as server-side state; M-25 computation; plain-language Decision Rights mapping with provenance; the export archive and its importer round-trip; inbound routing into the corporate surface with no member-facing change; response-time capture.
   - Freeze-gated halves (any member-facing surface: the decision inbox view, the member-facing export control, the auto-acknowledgment copy the member receives) carry the `FREEZE-GATED` label and wait for a two-key decision. That decision is scheduled with the COO for the 25 September session: whether the digest freeze is lifted for exactly these three surfaces at E1, and nothing else. Until then the queue does not assume either outcome.
3. **Q-1's `mail_outcome` migration.** Accepted. It is Q-1's single migration; the package row was wrong. One migration per session still holds.
4. **`latest_safe_start` is derived.** It follows the repository's own precedent for derived values: a materialized value stamped with its derivation, recomputed by the worker on outbox events, read-only to every actor, never hand-edited, with a corporate-admin recompute action that logs. If the repo precedent stores derived values differently, the precedent wins and this row says so; if the precedent is silent, the rule above is the precedent from here on.

## 3. The other eleven disagreements
For each item the session log marks as non-blocking with a proposed disposition, the proposed disposition is adopted and the log is the record. For any item marked blocking, or any item that touches a two-key adoption, the E1 gate, WK-STD-026, or a member-facing surface, the disposition is not adopted here: list those items by number in the next report with the proposed ruling and its consequence, and I will rule on them individually. Nothing in the log is reconciled by silence.

## 4. Merge and start
1. Apply §2.1 and §2.2 as two further commits on the #282 branch (the count correction; the freeze split with `FREEZE-GATED` labels and the 25 September pointer).
2. Then PR #282 is approved for merge by me. Merge it.
3. Q-1 starts after the merge, under the re-cut queue, with the `mail_outcome` migration as its single migration. Report and stop at the end of Q-1 as always.

## 5. Unchanged
The E1 gate; the two-key adoptions including WK-DEV-007; WK-STD-026; the A133 closure; the three founder tasks (fixture content, A2P registration, WK-APP-002 conversion). The name decision remains 25 September.
