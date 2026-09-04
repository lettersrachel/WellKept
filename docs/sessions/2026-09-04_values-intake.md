---
status: living
---
# Session · 4 September 2026 · founder values package intake (document-only, the Q-0b shape)

Instruction: the founder, at the Q-3b acceptance: one document-only
intake session for the founder values package (frozen, registered,
stamped plan-of-record; no code), same shape as Q-0b, then report and
stop. Q-4 is authorized after this intake. The same message carried two
rulings, recorded below where they bind.

## Built (documents and the register only)

1. **The freeze.** All nine package files verbatim under
   `docs/intake/2026-09-04-founder-values/`: the four .md files with
   status-frozen frontmatter and stripped-content hashes in the FROZEN
   manifest; the five .csv/.yaml files byte-verbatim with whole-file
   sha256 pinned in `docs/SPEC_REGISTER.md` and here, because the
   manifest is .md-scoped by the L guard's own contract (the
   TASK_INVENTORY csv precedent). Widening the manifest to non-.md
   files is a guard change and out of a no-code session's scope; named
   as a candidate, not done.
   - known_unknowns_values.csv `0be796c57856c90b5862cd82784befa59e8d19547c28320996dcd220decdc7d1`
   - decision_rights_by_tier.csv `4f5ec9c3c95ca039f18228922edd15ead6dd713d4f01551d19446f0225a9f6a7`
   - reconciliation_patterns.csv `f086a004da24e65c76a2a644f3cded4f0536e45dcbf0fb3b31472130bb7edd70`
   - rubric_anchors.csv `f52b56934dee473be9d1651d836b51866a94247dfb547f17086442d4e23e0b13`
   - enums.yaml `c1f3bd1af6855055a23f68740dc839dc9b8242ff9c603e5c7aeadcf1a268182e`
2. **The register row**: one plan-of-record stamp for the package with
   the five pinned hashes, the per-file feeds from the README's own
   table, and the package's own framing preserved (every value a
   planning proxy until its named measurement replaces it).
3. **The two rulings recorded where they bind**: the Q-4 queue row
   carries the conditional event_outbox FK with the condition ANSWERED
   (documents-only: the erasure order permits it, because household
   rows are never deleted, only renamed and archived, so the parent
   side never vanishes; the Q-4 session owes the production census and
   the test-harness parent rows). The Q-18 row carries the
   s4-kind-versus-catalog reconciliation with no renames before it.

## Verified

- Every frozen .md byte-identical under its frontmatter (diff against
  the received bytes); every .csv/.yaml byte-identical (cmp).
- The schema suite green after the manifest extension (70 tests). The
  L guard fired once DURING the work, correctly: the first manifest
  draft listed the five non-.md files and the guard refused each as
  unmanifestable, which is how the pinned-in-register shape was
  reached. A guard refusing its own misuse is the accepting direction
  of its design.
- Zero em dashes anywhere in the received package.

## Ground truth (reconciled against the tree; none resolved silently)

1. **`household_cap_weekly` 6 against the versioned `capacity_gate`
   cap 5.** The CSV recommends a hard maximum of 6 households per HOM
   per week citing a "Founder ruling 2 Sep 2026" this repository has no
   record of; the shipped knob (0055, A578) holds cap=5, band 3..5,
   and A578's own law says a cap change is a TWO-KEY model change
   before it is a config change. Two values cannot feed one knob, and
   this is the G-109 shape (two measurements sharing a name) unless
   "weekly cap 6" and "covenant cap 5" are deliberately different
   quantities. Blocks naive adoption of that row; the two-key path and
   the founder's clarification decide it.
2. **`outbox_dead_letter_attempts` 8 against the shipped drain default
   of 10.** run.ts reads `opts.maxAttempts ?? 10`; the CSV recommends
   8 "matches offline queue" (the offline queue is 8). Changing the
   drain's bound is a drain-semantics change in the A2 ruling's family;
   reported, not changed.
3. **`enums.yaml` `emotional_load_flag` ("Emotional-load flag on
   senior heatmap") sits against Ruling 2 §5**, which extends the
   judgment-free guard to stress, emotion and health INFERENCE, and
   against the standing bar on cognitive-load ranking. Whether a
   senior's human-recorded observation is the barred inference or a
   legitimate observation is a founder distinction this session cannot
   draw. Blocks naive adoption of `stay_risk_signals`; the Q-4 guard
   session and the founder should meet this row deliberately.
4. **`enums.yaml` status tags use underscores (`LIFE_EVENT`,
   `ONBOARDING_90`) where the shipped `statusTagEnum` uses hyphens
   (`LIFE-EVENT`, `ONBOARDING-90`).** Shipped enum values are keyed
   identifiers (the pack_key lesson): adoption MAPS, never renames.
5. **The reconciliation patterns file carries EIGHT patterns where the
   adopted benchmark record names SIX launch patterns.**
   `seasonal_service_not_scheduled` and
   `subscription_renewed_unexpectedly` are new inputs for Q-12b, not
   yet adopted law. Consistency worth noting: the patterns' event
   kinds use the Q-3b catalog families (work.*, vendor.*, capture.*,
   commitment.*), the first outside-authored text to do so.
6. **The figures tension, stated precisely.** The values CSV carries
   v7.0 MODEL figures (labor splits, travel minutes, desk hours,
   turnover target, households-lost, applicant and offer rates) and
   the decision-rights CSV carries dollar authority thresholds. The
   standing rule keeps wage rates, prices and model figures out of
   source as constants; no wages, prices or run-rate amounts appear
   here, and the capacity precedent (cap=5 entered source citing its
   ruling) supports operational figures entering as reviewed
   configuration. Frozen verbatim on the founder's explicit
   instruction, which is hers to give; whether the v7.0-derived rows
   stay in-repo at ADOPTION or move founder-side is flagged for her,
   not decided.
7. **`mail_webhook_silence_hours` 72 against the shipped knob's
   unit.** The Q-1 knob is `mail_webhook_silence` {maxQuietDays},
   days; the CSV recommends 72 HOURS and correctly says leave null
   until email.delivered is subscribed (matching Q-1's ground truth
   5). Adoption either converts to days or changes the knob's field; a
   decision, not assumed.
8. **`utilization_band_low/high` 75/85 percent** is WK-SOP-014's
   utilization metric, the one R26 recorded the board deliberately
   does NOT compute for want of a denominator. The denominator data
   now exists (0059/0060 time records). Adoption stays inside Ruling
   1's two exhaustive purposes; nothing here changes the board.
9. **Alignments found, recorded so adoption sessions need not re-derive
   them**: quiet-hours rows restate the adopted law and say so;
   `mode_promotion_observed_visits` 3 and the Expert quarter match
   SPEC_MODE_LOGIC §2; `hom_ii_quarters` 2 matches §3; the seven
   `workflow_classes` match the mode spec's seven; the rubric's twelve
   domains fit "seven classes, matching the certification domains
   where they are operational"; the decision-rights materiality column
   uses the signed A1.1 enum (two residues: one row says "all", one is
   blank, which the three-value enum cannot store as written);
   surface_copy.md is freeze-gated exactly as Part C §2.2 holds and
   renders the name as the {BRAND} config value exactly as Q-2 built;
   the FCPS extraction test's ICS-first conclusion matches competitor
   input 11 (read-only calendar-feed ingestion).
10. **The vendor decisions are corporate-task inputs, not code**:
    Twilio feeds the A2P task gating Q-9; AWS KMS feeds the funded KMS
    migration (and matches the custody rule that S3 and KMS open clean
    in the entity's name). The G-1..G-119 triage method describes a
    FUTURE document-only session whose input (the marked list) is the
    founder's to produce; nothing of it was started here.

## Adoption rulings applied (same day, at the founder's acceptance)

The founder accepted the intake and ruled on the ground truths; the
rulings are applied as
`docs/intake/2026-09-04-founder-values/ADOPTION_RULINGS_2026-09-04.md`
(frozen, manifested), never by editing the frozen files. In brief:
ground truth 1 resolves as TWO quantities (operating cap 5 enforced by
the software; physical hard maximum 6 in workforce doctrine; lifting 5
to 6 is an E4 two-key decision); ground truth 3's flag adopts as
`load_concern_raised`, human-recorded only with required reported_by,
the Q-4 guard barring the inference and permitting the record; ground
truth 4's tags map to the shipped hyphenated keys; ground truth 2's
dead-letter bound stays at the shipped 10; ground truth 5's two extra
patterns adopt as Q-12b data BEHIND the six launch patterns.

## Open items

- Founder review of this intake; Q-4 is pre-authorized and starts on
  her acceptance (this session reports and stops, the Q-0b shape).
- The adoption sessions the README maps: known-unknowns to
  configuration in one PR (after ground truths 1, 2, 6 and 7 are
  ruled); decision rights to Q-6; patterns to Q-12b; rubric and enums
  to Q-15/Q-16 (after ground truths 3 and 4); surface copy held for
  25 September; the FCPS conclusions to Q-7 and Q-12.
- The founder-side G-triage list, when she produces it, arrives as its
  own document-only session.

## Exact commands

- The manifest and document lint over the frozen set:
  `pnpm --filter @wellkept/schema test`
- Everything: `pnpm test --force`
