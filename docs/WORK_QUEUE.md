---
status: living
---
# Work queue

Updated 28 July 2026. Supersedes the open-item lists in
`ANTICIPATION_SESSIONS.md`, `CORPORATE_CAPTURE_SESSIONS.md`,
`POST_DEPLOY_SESSIONS.md` and `POST_DEPLOY_SESSIONS_2.md`. Those four remain in
`docs/` as the detailed briefs; **this file is the index of what is open.** Paste
a single session's detail, not this file.

Standing rules live in `CLAUDE.md` and load automatically. Do not restate them
in a session prompt.

---

## State

Production serves `b7026dd` (2026-07-28, the first deploy through
tooling/deploy.sh's full gate). 29 migrations (0000 to 0028; 0028 not yet
deployed). Eight CI guards. Gap register at G-49. G-13 founder-approved,
awaiting counsel review and the hire's acknowledgment.

The Railway worker is Git-connected and auto-deployed `b7026dd` (founder
confirmed in the Railway dashboard, 2026-07-28), so the swept sweep-template
copy is live from the worker as well. No Railway CLI or config exists in the
repo; the dashboard is the only control surface.

**Nothing has a real household yet.** Every gate below that says "pilot" or
"first household" is genuinely closed, not deferred.

---

## Closed

- **W-1 observation supersede posture** (0025). Landed inside its window.
- **W-2 health denominator dedup.** Answered: repeat firings are not
  deduplicated, and both minimums count from answers, so they do not protect the
  displayed rate at pilot scale. Superseded by W-9 below rather than by a dedup.
- **W-3 cascade-shape read.** Answered: the gate belongs on
  `definition.items[]`, needs no migration, and authoring collapses to a handful
  of pack items. Follow-through is W-11.
- **W-4 sizes default and scale direction** (0026).
- **W-9 firing visibility** (2026-07-28). Derived families' health line now
  reads "fired N (across H households, O objects)"; households from the
  item rows, objects by collapsing each item text's varying date. No metric
  changed.
- **W-10 + W-13 copy guard widened and documents swept** (2026-07-28). The
  two prompt-text and two digest-subject em dashes rewritten; docs/legal
  swept (76 instances); the guard now covers client pages, six templated
  copy sources, and every docs/legal document. The rewrites were
  punctuation-level; a true voice pass over prompt copy remains a good
  session once real prompts have fired for a while.
- **W-12 guard manifest** (2026-07-28). guards-manifest.test.ts asserts the
  guard files exist, the sizes CHECK survives in the latest migration
  snapshot, and ci.yml still runs the fan-out entrypoints. Proved red on
  its own first run (a wrong manifest path) before going green.

---

## Open now: no gate

### W-9. Make the firing artifact visible, without changing the metric (CLOSED, see above)

W-2 confirmed that one delinquent object re-firing monthly enters `fired`
repeatedly. Deferring the dedup until real numbers exist is right, but the
displayed rate **is the calibration input** for `informativeRateFloor`, which is
deliberately unset so it can be set from real data. A rate systematically
depressed by a single object, at one-to-three household scale, sets that floor
wrong permanently and under-retires forever.

**Do:** alongside `fired`, show the distinct household and distinct registry
entry counts for derived families. "Fired 12 times across 2 objects" changes no
metric and makes the number readable. Smaller than the dedup, and it preserves
seeing real numbers first.

### W-10. Widen the copy guard, and cover the gap both readings missed (CLOSED, see above)

The standing rule is unqualified: no em dashes in any document or string. The
guard covers client-visible pages only.

- Widen to staff-facing prompt text, including the sweep's radar items. A House
  Manager is a user, and templated prompt copy is the surface most at risk of
  drifting into machine voice. While rewriting, read for voice rather than
  punctuation: STD-016's fourth pruning question is whether a House Manager
  still trusts the prompts a year in.
- **Neither reading covers the client report email or notification text.** Not
  pages, not staff-facing, reaches clients, currently unguarded.

### W-11. Drop `membership_tier_gate`, with its spec (CLOSED 2026-07-28, 0027)

An always-null column that looks like a feature is worse than an absent one: a
reader concludes provision-level tier gating exists, which is a false claim
about the system living in the schema. The loader's update-set omission is
corroboration that it was never really adopted.

**Condition:** update WK-APP-003 Addendum A1 §S3 in the same change, or the
drift moves from schema to spec rather than closing.

**Done (0027).** Column dropped; zod, seed mapping, and the standards page
display line removed with it; the loader's update-set omission is moot.
The S3 column list's IN-REPO encoding (standards.test.ts) is updated in
the same commit with a dated note. The Addendum A1 document itself is NOT
in the repo (only SPEC_AUDIT references it), so the founder makes the
matching one-line edit in her copy of WK-APP-003 Addendum A1 §S3: remove
membership_tier_gate from the standard_provision column list.

### W-12. Does CI notice when a guard stops running? (CLOSED, see above)

Four guards now hold what used to be memory. A renamed job, a moved file, or a
test quietly dropping out of collection turns four guards back into four
memories, and nothing would say so. The guard-must-fire doctrine applied one
level up.

**Do:** assert the expected guard set is present and collected, and fail if one
is missing.

### W-13. Em-dash sweep over documents (CLOSED, see above)

The sweep covered pages. The rule covers documents. `docs/legal/`, counsel
packet rev 6, and the G-13 disclosure were all written or revised after the last
manual pass.

### W-14. Decide whether child data is a kind or a category

**Decision first, then build.** The `sizes` CHECK covers `kind = 'sizes'`.
School names, schedules and rosters are the Phase 0 child-data categories in
packet §6(g), and each new child-related kind would need its own constraint,
which is the depends-on-remembering pattern again.

Decide before the Phase 0 form creates three more of them: is child data a
property of a kind, or a named set of kinds with a safe default?

---

## Gated

### W-5. Flags. The unlock for three other items

STD-016 §5: every sentinel check produces a flag; every flag carries a revisit
trigger, a date or a condition, set at the moment of flagging; flagged
conditions are re-observed at every visit; anything degrading faster than its
flag assumed is promoted.

No flag entity exists. `object_observation` supplies the series and currently
has no consumer. **This is the consumer.**

**Gate:** before a House Manager starts noticing things, or the pilot's first
months of observations have nowhere to live.

### W-6 and W-7 are downstream of W-5, not independent

Correcting the previous version of this file, which implied all of W-5 through
W-8 were independently gated.

- **W-6 deliberate deferral** ("noticed and left, with the reason and the
  intended timing") needs an intended timing, which is a revisit trigger, which
  is W-5's mechanism. It is small and the most client-visible item in either
  review, but it is not buildable first.
- **W-7 paused decisions** needs the same revisit mechanism.

### W-8 is independent, and has no gate at all

Also correcting the previous version. Trigger overlap detection and consequence
weighting need neither flags nor the series. They are buildable now, and worth
little until enough rules have fired to have overlaps and consequences to
weigh. Left here rather than above for that reason, not because anything blocks
them.

Also confirm rule retirement is versioned and attributed the way
`provision_versions` is, since STD-016 §7 requires a later reader to see what
was pruned and why.

### Round-four gated sessions (ROUND4_SESSIONS.md)

- **Session D, concerns_minor on definitional playbook fields:** gated on
  the FOUNDER'S FIELD LIST (the brief forbids choosing the fields). Build
  the marker for definitionally-child fields, keep policy for free text.
- **Session E, seasonal voice pass:** gated until the seasonal prompts can
  fire; apply item 6's four-tell signature (jargon prefix, nominalization,
  passive, internal citation), read as rendered.
- **Session A follow-ups (ROUND4_FINDINGS_A.md):** commitment T-3 never
  collapsed (bare date in key); multi-window families count per-window
  keys, not objects; "radar" renders to House Managers via packName and
  two prompt texts. Each fix its own session, none yet authorized.

### Round-five follow-ups (ROUND5_SESSIONS.md)

- **Real object key for W-9 + fired dedup:** gated together on the first
  calibration read against real household data. Until then multi-window
  families' count is labeled "series" (F2), which is what it is.
- **packName rename (F3): REPORTED AND STOPPED per the brief** - packName
  is an IDENTIFIER, not display-only: exclusions.ts:53 matches exclusion
  targets against it, so a rename changes which exclusions fire. The fix
  is a display-name-vs-key split; its own session, not yet authorized.
- **G3: CLOSED 2026-07-28.** The happy path executed for real: deploy.sh
  ran its full sequence clean deploying `b7026dd`, migrations agreeing
  three ways (28/28/28), the link check passing against the pinned project
  id, and the build id verified three times with JSON extraction. Both
  guards fixed after the first run's wrongful refusal did their jobs.

### Round-six items (brief external, from the WK_ROUND5_READOUT review)

- **K, string-as-identifier survey: CLOSED 2026-07-28.** Read-only; findings
  frozen in ROUND6_FINDINGS_K.md. Six class members, itemText the largest
  (exclusion-matched three ways, id input twice, W-9 collapse key). The
  copy guard styles two members' source files today; the item-6 voice pass
  already rewrote matched strings, harmless only because no exclusion rows
  exist yet.
- **Doctrine correction: folded into CLAUDE.md** (verification section and
  the guard-section line): a guard is proven in both directions, red on a
  violation and green on a known-good case.
- **N, selftest green-path coverage: CONFIRMED, no change needed.** Case 5
  exercises the pinned-link acceptance end to end through --preflight
  (deploy.sh:64-66); case 6 exercises extract_build_id on a synthetic
  JSON body carrying the real sha (deploy.sh:68-71). Those are the two
  checks that shipped broken, each now proven in its passing direction.
  The step-7 wiring beyond the extractor is only exercised by a real
  deploy, and was, three times, deploying b7026dd.
- **M, display-name/key split: CLOSED 2026-07-28 (0028), on the
  close-out's corrected premise (build on fixtures before the first
  household).** `pack_key` is the stable identifier topic-scope exclusion
  matching uses; `pack_name` is display copy. Keys minted equal to names
  everywhere (migration backfill, sweep, cascades, authored rules), so
  the set of matching exclusions did not change; proven at the fixture
  level, including the display-rename-does-not-change-matching property
  and a mechanism check against the real post-rewrite templates. Member
  3 (field-name bindings) and member 5 (the no-drift vocabulary) are held
  by the new seed-binding guard; cascades.ts and season.ts joined
  COPY_SOURCES (the guard found and fixed one em dash on arrival, in
  sanitizeSummary's own regex). Members 1-id (sweep id text-keying and
  the W-9 real object key) stay gated on the calibration read; member 4
  is data-side, recorded in K.
- **R, floor-review merge script: CLOSED 2026-07-28
  (tooling/import/wk_floor_review.py).** The workbook's DECISION
  vocabulary reaches the tested loader through a disposable merge script,
  never a loader extension. The three rules are enforced and were each
  proven by refusal: unsure never imports (listed as a queue with current
  tier and text); blank is not keep (a partial import requires
  --allow-partial); seed_reviewed flips only via --flip-reviewed at zero
  blanks and zero unsure across all three tabs. Dry run is the default;
  every tier change goes through load-provisions.ts --supersede so
  provision_versions records it. Proven against synthetic workbooks in
  the brief's shape on the local session P database, including the case
  the first proof run caught: undecided rows now carry the STORE's
  current tier, so an import can never silently revert a row the review
  made no decision about. The connection comes from DATABASE_URL or
  .neon-connection, by name, never printed.
  **Review-stamp answer (report only, per the brief): no per-provision
  place exists to record who reviewed a row and when.** standard_provision
  has review_date (future scheduling) and provision_versions has
  actor_user, but a keep produces no write, so a 341-row review's only
  durable evidence is the store-level seed_reviewed boolean. Adding one
  would touch: a migration (reviewed_at, reviewed_by on
  standard_provision), the loader or this script's write path, the
  standards page if displayed, and the S3 column-list encoding in
  standards.test.ts plus the founder's matching Addendum A1 S3 edit (the
  W-11 pattern). Not added; a decision.
- **S, the M baseline: dispositioned.** `.neon-connection` does not exist
  in the cloud container (gitignored, founder's machine only), so the two
  production reads fall to the founder's local session; per the close-out
  they only confirm fixture-only data. The half that matters, the
  mechanism still matching after the rewrites, is now a fixture assertion
  in exclusions.test.ts and ran green before M landed.
- **L, frozen-pattern-to-property: CLOSED 2026-07-28 (decision:
  frontmatter).** Every .md under docs/ now carries `status: frozen` or
  `status: living`; an unmarked file fails CI at creation. The name
  pattern and its LIVING allowlist are removed. Hashes cover content after
  frontmatter is stripped, per the decision's condition, so classifying a
  doc never burns the reviewed-hash-update hatch; all six pre-existing
  manifest hashes survived unchanged (proven: K's stripped hash equals its
  pre-frontmatter hash). Proven red four ways (unmarked doc; frozen status
  without manifest entry; tampered frozen content; manifest entry
  demoted to living) and green on the clean tree.
- **P, floor review preflight: CLOSED 2026-07-28, frozen in
  ROUND6_FINDINGS_P.md.** (1) kind enum accepts table_row; documented
  drift (SPEC_AUDIT row 1), not silent. (2) Loader round-trip EXERCISED
  on a local Postgres: five tier changes landed at version 2 with both
  snapshots in provision_versions, verified by SQL. But the floor-review
  workbook cannot reach the loader as-is: wk_provisions.py wants the
  original full sheet; `keep`/`unsure` are hard errors and a 471-row
  subset fails the completeness check. A mapping step (keep to Y, unsure
  to blank, merge over the full sheet) is required and is a decision.
  (3) seed_reviewed=true unlocks DISPLAY ONLY. Floor enforcement exists
  as a tested library nobody calls; the STD-000 S1 path (same-day visit
  report marking, CEO ownership in one business day) does not exist in
  software. Review and flip are safe; the enforcement gap is its own
  sprint.
- **Q, git history secret scan: CLOSED 2026-07-28, frozen in
  ROUND6_FINDINGS_Q.md.** History is clean to share with an external
  reviewer: no secret file ever committed, zero live credentials in 190
  commits of content and messages, dev secret fenced at boot. Bounds
  stated in the record (pattern-based; gitleaks adds entropy breadth if
  wanted).

### Briefs already written

| Item | Brief | Gate |
|---|---|---|
| Anticipation C (briefing budget) | ANTICIPATION_SESSIONS | 3 households, or a briefing that felt long |
| Anticipation D (field age) | ANTICIPATION_SESSIONS | intake exists as a process |
| Anticipation E (external signals) | ANTICIPATION_SESSIONS | none; school and activity calendars first, ahead of weather |
| Anticipation F (cold start) | ANTICIPATION_SESSIONS | D shipped, 3+ households |
| Capture 4 (unit economics) | CORPORATE_CAPTURE_SESSIONS | ~1 month of time and cost data |
| Capture 5 (HM entity) | CORPORATE_CAPTURE_SESSIONS | G-13 **acknowledgment**, not approval |
| Capture 6, 7 (continuity, turnover) | CORPORATE_CAPTURE_SESSIONS | capture 5, second HM |
| Capture 8, 9 (satisfaction, declined requests) | CORPORATE_CAPTURE_SESSIONS | 60 days of a real household |
| G-47 tier gating | register | when it trips, build the per-item gate (W-3) |
| Phase 0 portal form | INTAKE_CAPTURE_GAP_REVIEW §3 | counsel on children's data (packet §6g), and W-14 |
| Transcript ingestion | INTAKE_CAPTURE_GAP_REVIEW §4 | counsel on the AI subprocessor (packet §8) |
| Kits, object relationships, override taxonomy | INTAKE_CAPTURE_GAP_REVIEW | pilot makes them concrete |
| Mileage `purpose` and `destination` | G-46 | founder field list, plus the erasure interaction |
| Room-level intake granularity | INTAKE_CAPTURE_GAP_REVIEW §7 | after the calibration study runs |

---

## Not software

0. **Branch protection: DONE 2026-07-28** (founder; gates and airplane
   both required on main). The #60 hole is closed: a PR that never
   triggers CI can no longer merge. Remaining from the same chore: check
   whether the dormant well-kept-web Vercel project carries environment
   variables, specifically a production DATABASE_URL; it auto-builds
   every pushed branch, and the answer decides G-35 (and, if
   uncomfortable, opens the security review).
1. **The 300-row floor review.** Column I of the provision workbook is empty, so
   `seed_reviewed` stays false, so the entire standards library renders nowhere
   for anyone. Filter column E and review the floor rows: 189 `floor_1` plus 111
   `floor_2`. An afternoon, not a week. **Everything provision-related is dark
   behind this.**
2. Counsel outreach, then the custody sitting (three drills, one throwaway
   branch). Lifts the no-real-s3 guardrail.
3. Insurance: workers' compensation, which attaches from the point of employment
   in Virginia, plus the G-48 hired and non-owned auto question. Same broker
   call. Before the first pilot signature.
4. Hire a House Manager. Recruit and consent the first household.
5. Chores (Upstash budget alert, Vercel project rename, DMARC, and the
   `tsbuildinfo` untrack), the pilot protocol's friction-log brackets, the two
   LAUNCH signatures with §2.4 after the restore drill.
6. **Consider putting one pilot household on a non-Concierge tier.** If every
   pilot household runs the same tier, the pilot ends with no evidence about
   tier differentiation, and the tiers are load-bearing in the revenue model.
   A recruiting decision, not a build.
