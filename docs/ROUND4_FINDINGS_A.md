# Round four, session A: the W-9 object collapse, re-verified

Run 2026-07-28 against main `079e930`, read-only, per ROUND4_SESSIONS.md.
Nothing fixed; each defect's fix deserves its own session per the brief.

**Verdict: item 6's rewordings did NOT break the collapse. The check
found two defects that predate the rewordings, present since W-9
shipped, plus the confirmed "radar" leak.**

## 1. The mechanism

`oversight/triggers/page.tsx:69`:

    h.firedObjects.add(f.itemText.replace(/\s*\(([^)]*)\)|\son\s.+$/g, "").trim());

Two alternations: strip any parenthesized segment, and strip from the
first " on " to end of text. The premise: dates appear either in
parentheses or after " on ".

## 2. Executed against every current template (not read, run)

| Template | Normalized key | Collapses? |
|---|---|---|
| dates T-14 | `Occasion radar: {label}` | yes |
| dates T-3 (reworded) | `{label} is three days out. Is the plan in motion?` | yes |
| commitment T-14 | `Prep window opens: {label}.` | yes |
| **commitment T-3** | `Final prep: {label} is July 30.` | **NO — the date is bare, neither parenthesized nor after " on "; it survives normalization, so every annual cycle mints a new "object"** |
| subscription | `Renewal ahead: {label}` | yes |
| horizon (reworded) | `Coming due: {label}. Start planning...` | yes |
| appliance (reworded) | `Maintenance due: {label}; it has been...` | yes |

Both defects below predate item 6; the reworded templates themselves all
normalize to stable keys.

**Defect 1 — commitment T-3 never collapsed.** `Final prep: ${l} is ${w}.`
(registry-sweep.ts, unchanged by item 6) leaves the date in the key.
Overcount begins the second year an object fires. Fix options: reword the
template to put the date in parentheses (voice-neutral), or teach the
regex a third pattern; the template fix is smaller and self-documenting.

**Defect 2 — the collapse keys on (object × window-template), not
object.** A birthday inside both the T-14 and T-3 windows in one 90-day
span produces two distinct keys ("Occasion radar: Mia" and "Mia is three
days out..."), counting one object as two. Affects the two multi-window
families (dates, commitment); the one-window families are immune. This
was equally true of the original texts. The honest fix is a real object
key (the sweep knows the entry id; prompt_pack_item does not carry it),
which is the column W-9 deliberately avoided; short of that, the display
line should say "series" rather than "objects" for multi-window
families, or the count should divide by live windows. Decision-shaped;
reported, not chosen.

## 3. The id boundary

No orphaning: `prompt_outcome` rows carry `rule_id` directly and
`ruleHealthByRule` groups answers by it (page.tsx:72), so outcomes
recorded against old-text items stay in every numerator and denominator.
`fired` counts rows regardless of id, so old-text items also remain
counted. One transient artifact: an occurrence whose window was OPEN at
rewording time gets both its old-text and new-text items inserted
(deterministic ids differ), inflating `fired` by one for that occurrence
only. Fixture-only data today; self-heals as windows close.

## 4. "radar" is rendered, twice over

Not internal-only. The pack name reaches the House Manager verbatim:
visit page lines 192/232 render `{i.packName}` ("dates-radar · due
today"), and the drill-in's anticipation panel and rule dropdown render
it too. Separately, the word appears inside two rendered prompt texts
("Occasion radar: ..." in the sweep and the seeded cascade). The
architecture-vocabulary class the T-3 fix removed, confirmed present.
A fix would rename the rendered form, not the family key (sweep ids and
packName-derived grouping are load-bearing); own session.
