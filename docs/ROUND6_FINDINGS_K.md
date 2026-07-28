---
status: frozen
---
# Round six, session K: which rendered strings are also identifiers?

Read-only survey, 28 July 2026, at main `b7026dd` plus the docs-only #62.
Every claim carries file and line. The question, from the round-six brief:
enumerate every string that is both rendered to a user and used for
matching, dedup, attribution, or any other behavioural comparison; state
what breaks when it changes; report whether the copy guard styles it.

## Summary

The class is real and has six members, not one. F3's packName is the
smallest of them. The largest is `itemText` itself: every prompt's rendered
sentence is simultaneously an exclusion-matching surface for three scopes,
the identity input to both deterministic item ids, and the W-9 display
collapse key. Two members are not strings in the repo at all but
user-maintained names (playbook field names, observance names) matched by
containment. One member is a vocabulary convention ("none") whose teaching
copy is style-guarded while the matcher is not.

The dangerous combination the brief predicted exists today: the copy guard's
COPY_SOURCES list styles `registry-sweep.ts` and `engine.ts`, the exact
files whose string literals become `itemText` and `packName`. The item-6
voice pass (e4462dc) already rewrote matched strings in both
`registry-sweep.ts` and `cascades.ts`. No behaviour changed only because no
household, no exclusion row, and no real prompt exists yet. The mechanism
is confirmed; the damage window opens with the first real exclusion.

## The class, member by member

### 1. `itemText` (the largest member)

Rendered: visit page (`(hm)/visit/page.tsx:191,230`), role previews
(`preview/[role]/page.tsx:199,212`), mobile briefing
(`api/mobile/briefing/route.ts:65-66`), oversight prompt table
(`oversight/[householdId]/page.tsx:663`).

Behavioural:
- Exclusion matching, three scopes. `topic`:
  `contains(draft.itemText, target)` (exclusions.ts:53). `person`:
  exclusions.ts:55. `field`: exclusions.ts:51 falls back to `itemText`
  whenever the draft carries no fieldName, and every sweep draft carries
  none (run.ts:122 passes no ctx), so field-scope exclusions match sweep
  prompts BY THEIR RENDERED TEXT.
- Identity. `deterministicItemId` hashes it (engine.ts:129);
  `sweepItemId` hashes it (registry-sweep.ts:175, called run.ts:126).
  Rewording a template re-mints ids: pending items under the old text
  stay, the next sweep inserts duplicates under the new text.
- The W-9 collapse key. `collapseItemText(f.itemText)`
  (oversight/triggers/page.tsx:75) derives the "objects" count from the
  rendered sentence.

Source literals: `WINDOWS` templates and the observance template
(registry-sweep.ts:59-86, 219), cascade item texts (cascades.ts:22-61),
authored rules typed by corporate (actions.ts:829-850).

What breaks on change: an exclusion the household already gave stops
matching (the client hears about the excluded topic), or starts matching
prompts it never named; pending prompts duplicate under new ids; the W-9
object count splits one object into two.

### 2. `packName` (F3's instance)

Rendered: visit page (:192,232), previews (:200,213), mobile
(App.tsx:625,637), oversight (:662), rule pickers
(oversight/[householdId]/page.tsx:282). Behavioural: `topic` exclusion
matching (exclusions.ts:53). Also written into audit detail
(actions.ts:547,854), which is attribution but not comparison. Defined in
registry-sweep.ts:161,218 (`${kind}-radar`), cascades.ts:19,37,56, and
authored rules.

### 3. Playbook field names

Rendered: the playbook surfaces, client and staff. Behavioural, three ways:
- Rule binding: `event.fieldName.toLowerCase().includes(rule.bindsToFieldName...)`
  (engine.ts:82). The seeded cascades bind to "school", "medication",
  "important-dates" (cascades.ts:16,34,53). Renaming a field silently
  unbinds every cascade that matched it; no error, prompts just stop.
- `field`-scope exclusions match the field name when present
  (exclusions.ts:51, ctx from run.ts:72).
- The observance sweep finds its input field by name prefix:
  `like(playbookField.name, "Movable-date observances%")` (run.ts:116).
  The name lives in data, seeded from
  tooling/seed/fernbrook_template_seed.json:2312. Rename the field, the
  radar silently never fires again.

### 4. Observance names

`movable_observance.name` is matched by containment into the household's
free-text observances field (registry-sweep.ts:214) and rendered into the
item text (:219). Renaming an observance in the calendar table (or the
household editing its field wording) silently changes which households get
the radar. User data on both sides; no repo guard can see it.

### 5. The "none" vocabulary convention

`detectLoadSignal` breaks its three-consecutive run on the literal answer
"none" or blank (registry-sweep.ts:238-240); the exhibit page uses the same
literal (exhibit/page.tsx:67). The answer is free text typed by the HM
(VisitWizard.tsx:325), and the string that TEACHES the vocabulary is the
placeholder "photo id (required unless 'none')" (VisitWizard.tsx:326),
which sits inside the copy guard's staff scope. A style pass that rewrites
the instruction ("unless nothing needs noting") changes what HMs type and
silently disables the load signal, which is a floor-adjacent capacity
indicator. The J1 sweep touched three strings in this file and left the
placeholder alone (verified in 6e257eb's diff).

### 6. Season recall summaries

`recallExcluded` matches topic/person exclusion targets against the
generated summary by containment (season.ts:104-115). The summary template
is repo copy in season.ts, which is NOT in COPY_SOURCES: a template rewrite
changes which memories the exclusion filter withholds, in the privacy
direction this time (an excluded topic could resurface in recall).

### Enum-like, noted and bounded

`statusTag` values ("LIFE-EVENT", "WATCH") are compared (engine.ts:99,
registry-sweep.ts:146,221, mail/index.ts:49,52) and rendered raw in the
digest table (mail/index.ts:55). Registry `kind` strings key `WINDOWS`,
`SWEEP_RULE_IDS`, and the packName construction, but their display is
already split through `KIND_LABELS` (RegistryCard.tsx:3-11), which is the
correct pattern the M fix should generalize. Enum validation lists in
actions.ts are value vocabularies, not rendered copy; excluded from the
class.

### Verified safe by design

Rule identity everywhere it matters is UUID: `rule` scope exclusions match
`triggerRuleId` (exclusions.ts:49), rule health and fired counts key on
`triggerRuleId`, `prompt_outcome` keys on (promptId, userId) with rule_id
carried directly (0014 migration, ROUND4_FINDINGS_A confirmed no
orphaning), `MULTI_WINDOW_RULE_IDS` are UUIDs, `seasonObservationId` hashes
anchor UUIDs (season.ts:118-123). methodRef is a provision id, a public
API by standing rule.

## Did the sweeps already touch matched strings?

- **Item 6 voice pass (e4462dc): yes.** It rewrote WINDOWS templates
  (registry-sweep.ts) and two cascade item texts (cascades.ts), all class
  member 1. Consequence today: none. Zero households, zero exclusion rows,
  zero pending real prompts; the id re-mint was called harmless pre-pilot
  at the time, correctly. The same edit after the first real exclusion row
  would have been a silent behaviour change under green CI.
- **W-10 (6a-series): yes, same member, same no-damage reasoning.** The
  digest subject rewrites were display-only.
- **J1's 51 substitutions (6e257eb): display-only.** The one matched-string
  edit in that commit was F1's commitment template, which was the
  deliberate fix, made with the template-collapse guard added beside it.

## Does the copy guard style any of them?

Yes, and this is the finding. COPY_SOURCES (client-copy.test.ts:47-54)
includes registry-sweep.ts and engine.ts, whose literals are member 1 and
member 2. STAFF_ROOTS covers VisitWizard.tsx, whose placeholder is member
5's teaching copy. So the guard actively invites style edits to strings
whose bytes are load-bearing. Two adjacent coverage facts, noted for M
rather than fixed here:

- cascades.ts carries rendered prompt copy and is in no guard scope;
  COPY_SOURCES lists seed-rules.ts, which no longer contains copy (it
  imports CASCADES). The guard entry followed the file, not the strings.
- season.ts (member 6's template) is in no guard scope either.

The right fix is not unguarding: it is M's split, so style work has a safe
surface and matching has a stable one. The split should cover members 1,
2, and 3 (repo-controlled), give member 5 an enum or a checkbox instead of
a vocabulary convention, and accept 4 as data-side (guardable only by an
advisory on the observance admin surface). Member 6 rides on member 1's
fix if exclusion matching moves to structured targets.

## One adjacent defect, noted, not chased

Field-scope exclusions falling back to itemText for sweep drafts
(exclusions.ts:51) means a field exclusion like "pool" suppresses any
sweep prompt whose sentence mentions the word, which is broader than the
scope's name suggests. Possibly intended (fail-toward-suppression), but it
makes member 1's surface larger. Belongs to M's scoping discussion.
