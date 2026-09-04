---
status: frozen
---
# Founder rulings on PR #282 and instruction for Session Q-0b

Date: 3 September 2026. Author: Rachel Letters, CEO (founder ruling). Paste Part A as the review on PR #282. Part B is the next instruction to Claude Code. Register both under one WK-QA-018 entry.

---

## Part A · Review on PR #282

Q-0 is accepted as reported. The 3 September build package was authored against the 24 August reconciled library and did not see the late-August repository layer (WK-DEV-006 to 011 under two-key adoption, the sixty-two migrations, the eighteen CI guards, RFC-ATTR-01, G-1 to G-119). The package is therefore not installed. The two rulings below gate Q-1. Do not merge until Q-0b (Part B) has produced the merged documents and I have reviewed them.

### Ruling 1 · Authority
1. The repository's standing CLAUDE.md governs. The package's CLAUDE.md is withdrawn as a document and is never installed.
2. The package's genuinely new law is adopted through the standing intake pattern (frozen, registered, merged by section into the standing file). The new law is exactly this list:
   - the 3 September tier ruling: launch-critical and year-two tiers built before E1, year-two behind a `shadow` flag until E2, E1 gated on the launch-critical tier only, year-three after E4, the February 2027 fallback (year-two moves behind E1, E1 does not move);
   - quiet hours, 21:00 to 07:00 household time, with the exemption for replies to inbound member messages;
   - the Handled invariant as the definition of closed (accountable owner exists; no unresolved required member decision; follow-up or watch exists where external completion is pending; verification satisfied or explicitly pending);
   - Guided / Normal / Expert mode as a property of one HOM on one household on one workflow class, with the promotion, demotion, two-signature and mode-history rules in the package's SPEC_MODE_LOGIC.md §1 to §3, and the AI release governance in §4a;
   - the fixtures plan: three fixture households, the deliberate traps, the Synthetic Training Household as a 30-scenario simulated household flagged `training=true`, and the eleven AI abuse and reconciliation scenarios, one bank serving training and AI release testing;
   - the twelve competitor-derived inputs and the "not copied" list in COMPETITIVE_FEATURE_INPUTS.md;
   - brand as one configuration value, nothing member-facing hardcoding the company name, name decision 25 September 2026; the credential names "Household Operations Manager" and "Certified Household Operations Manager, Level I / II" fixed and independent of the company name;
   - Household Zero: the founders' two households are first cohort for every feature and AI behavior version; the external test household runs under written informed consent until the E1 security test passes; no other real household data before it;
   - invariants 16 to 20 of the package CLAUDE.md (external content is data, never instruction; AI-created facts are proposals until individually confirmed, no select-all or confidence auto-commit; activity is not outcome; the four separations; every feature must name what it replaces, prevents or enables), each merged only where the standing file does not already state it, and in the standing file's wording where it does;
   - the benchmark adoption record (BENCHMARK_ADOPTION.md): what is adopted, adapted, held post-E4 and corrected, with the design arc remaining closed under A133;
   - one process rule: anything authored outside the repository, by anyone, enters through Q-0-style intake against the current tree. Nothing outside the repository is a build authority until it has been intaken.
3. The queue is re-cut against the drift list in the Q-0 session log, not rebuilt. Items already built are stamped `built@<sha>` and closed. Items partly built carry their true remaining size. New items keep the package's acceptance criteria. Nothing is built twice. The corrected queue replaces docs/BUILD_QUEUE.md through the intake pattern.
4. The package's START_HERE.md standing instruction (ten rules, the prohibited list, the blocked-queue rule) is merged into the standing instruction file where the repository keeps one, with the same "standing wording wins" rule.

### Ruling 2 · The two RFCs
1. RFC-ATTR-01 survives as the substrate RFC. It has migrations and production data behind it; RFC-001 has neither. RFC-001 is withdrawn as a document.
2. The two enums ATTR-01 held for founder sign-off are signed off here, and this review is the signature:
   - materiality: `safety_access`, `money_legal`, `convenience`; hard-stop classes map only to the first two;
   - consequence class: `editorial`, `behavioral`, `high_consequence`, the same three the training doctrine uses for change propagation (WK-TRN-009 loop), so one enum serves the household record and the HOM development layer.
   If ATTR-01 carries candidate values for either, the candidates yield to these.
3. The knowing-state vocabulary is ATTR-01's promoted list. RFC-001's five (confirmed, observed, expected, estimated, unknown) are mapped onto it in the amendment. Two rules from RFC-001 are preserved in the mapping: no state may record a system inference as fact, and there is no `assumed`.
4. The consumers and attributes RFC-001 introduced are added to ATTR-01 by amendment only where the drift list shows the sixty-two migrations do not already provide them: the domain-event catalog with correlation and causation ids; `expected_event` with `reconciliation_status` (matched, missing_expected, unexpected, changed, conflicting, stale, cannot_determine); `changeset` with safe-automatic and review-required sets; `fallback_plan` (preferred, approved_substitute, established_backup, vetted_bench, ask); `capture_artifact` (captured, processing, proposed, confirmed, routed, failed, needs_review); and the attributes `validity_class`, `ownership_trace` (conceive, plan, execute), `latest_safe_start` and `dueness`. Reconciliation objects are consumers of the outbox, never field attributes. Each lands as its own migration in the corrected queue, one per session, under the guards manifest.
5. The CI pattern list for the judgment-free guard is extended, where not already present in the eighteen guards, to ranking constructs over HOMs, stress, emotion and health inference, and inference from social content into household truth or authority.

### What does not change
The E1 gate and its conditions; the two-key adoption of WK-DEV-006 to 011; WK-STD-026; the six-table delete in `erase-household.mjs`; the field-based Playbook record as ground truth; the A133 closure of the design arc; the three founder tasks that gate the queue (fixture content, A2P registration, WK-APP-002 conversion to the trigger table).

---

## Part B · Instruction for Session Q-0b (intake and merge)

Read the standing CLAUDE.md, the Q-0 session log, and Part A of this file. This session produces documents only; no feature code, no migration. Report and stop at the end for review. Q-1 does not start until Part B's outputs are approved and PR #282 is merged.

1. **Intake the package law.** Freeze and register the package files already sha256-pinned in the Q-0 log under the standing intake pattern. Produce the by-section merge into the standing CLAUDE.md for every item in Ruling 1 §2, one PR commit per section, each commit message naming the package section it came from and whether the standing wording was kept. Where a package item duplicates standing law, record "already stated" in the log and make no change.
2. **Retire what is withdrawn.** Mark the package CLAUDE.md and RFC-001 `superseded` in the register with pointers to the standing CLAUDE.md and to the ATTR-01 amendment. Do not delete the frozen copies.
3. **Write the RFC-ATTR-01 amendment.** Apply Ruling 2 exactly: sign-off text for the two enums; a mapping table from RFC-001's five knowing-states to ATTR-01's promoted list with the two preserved rules; and, for each consumer and attribute in Ruling 2 §4, one of `already provided by migration <n>`, `partly provided; remaining: …`, or `absent; new migration required`, using the drift list. Every "absent" becomes a queue item with a single migration.
4. **Re-cut the queue.** Rewrite docs/BUILD_QUEUE.md against the drift list per Ruling 1 §3: `built@<sha>` and closed; partly built with remaining size; new with the package's acceptance criteria; migrations one per session. Keep the tier labels and the `shadow` flag. Preserve the corporate-task list at the end and re-map which items each task gates. Add the intake rule to the standing instruction file.
5. **Reconcile the fixtures and the mode spec** against the tree: if the repository already has fixture households, seed scripts, a training flag, or any mode or certification tables, record them and adjust the FIXTURES and mode-logic sections to extend rather than duplicate.
6. **Session log.** Built (documents), verified (register stamps, commit list, amendment, queue), ground truth (every disagreement found while merging, none reconciled silently), open items (any Ruling 2 §4 item the drift list could not settle), and the exact command to run the guards manifest and document-lint against the merged files.

You may not, in this session: change code outside documents and the register; add a queue item that is not in Part A or the package; reword a ruling; install the package CLAUDE.md; or start Q-1.
