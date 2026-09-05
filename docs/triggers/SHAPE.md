---
status: living
---
# The trigger YAML target shape

**Authorized 5 September 2026** (`FOUNDER_RULINGS_2026-09-05_Items5and6.md`,
item 5) as its own instruction, so that filling WK-APP-002 into this form is
filling a known shape rather than inventing one at the desk.

## READ THIS BEFORE USING IT

**This shape is DERIVED FROM THE SCHEMA, not from WK-APP-002.** Every required
field below comes from `trigger_rule`'s own columns and from the `definition`
jsonb the engine actually reads (`packages/trigger-engine/src/engine.ts`,
`TriggerRuleRow`). The five judgment fields come from the preparation batch's
own list. **WK-APP-002 is not in this repository and this form has never been
checked against its seven life-domain sections.**

**So if the document does not fit this shape when it arrives, that is a finding
about the shape and not a reason to bend the document** (the founder's own
words, and the reason this warning is at the top rather than in a footnote).
The likeliest mismatches, named in advance so they are recognised rather than
worked around: a section that needs more than one THEN step ordering, a
condition that is not a field binding, or a rule that spans two families.

---

## The form

```yaml
# docs/triggers/<section-slug>.yaml
# One file per life-domain section.
section: "3.2"                      # the document's own section number, verbatim
section_title: "Seasonal transitions"

rules:
  - family: winter_prep             # REQUIRED. trigger_rule.family, NOT NULL.
                                    # The engine groups and reports by this.

    binds_to_field_name: >          # OPTIONAL (nullable column). The playbook
      Heating system: last service   # field whose CHANGE fires the rule. Must
                                    # resolve against a real field NAME, so an
                                    # IF that names a human description rather
                                    # than a field is marked, never guessed.

    household_id: null              # null = fleet-level library rule (the
                                    # normal case). A household id here makes
                                    # it that household's rule only.

    enabled: true                   # trigger_rule.enabled, NOT NULL DEFAULT true

    definition:                     # trigger_rule.definition, NOT NULL jsonb.
      pack_name: "Winter preparation"   # display copy. May be reworded freely.
      pack_key: winter_preparation      # THE IDENTIFIER. Exclusion matching
                                        # keys on this (M, round six), so it is
                                        # never edited for copy reasons.
      items:                            # the THEN steps, in order
        - text: "Confirm the heating system service is booked"
          offset_days: -30              # relative to the trigger date;
                                        # negative is BEFORE
          method_ref: STD-011.4.2       # optional. The provision a step's
                                        # implicit method resolves to. ABSENT
                                        # is a finding, never an error.

    # ---- THE FIVE JUDGMENT FIELDS: LEAVE BLANK ----
    # These are the founder's and are deliberately null in every generated
    # file. A plausible value here would read exactly like a decided one.
    lead_time: null                 # how far ahead the rule should reach
    stage: null                     # pipeline_stage: anticipate | identify |
                                    #   decide | monitor  (trigger_rule.stage,
                                    #   nullable, no producer today)
    consequence_class: null         # editorial | behavioral | high_consequence
    suppression_class: null         # no vocabulary exists yet; the validator
                                    #   accepts any string and requires none
    materiality: null               # safety_access | money_legal | convenience
```

## What is required, and where each requirement comes from

| Field | Required | Source of the requirement |
|---|---|---|
| `family` | yes | `trigger_rule.family` is NOT NULL |
| `definition.pack_name` | yes | the engine reads it; `packName` is the display copy |
| `definition.pack_key` | yes here, optional in the DB | Older stored rules predate the split and fall back to `packName`. **New rules always carry it**, because exclusion matching keys on it and a copy edit must never change which exclusions fire |
| `definition.items` | yes, at least one | a rule with no steps fires nothing |
| `items[].text` | yes | the prompt a HOM reads |
| `items[].offset_days` | yes, integer | the engine computes `fireAt` from it |
| `binds_to_field_name` | no | nullable column |
| `household_id` | no | nullable; null means a fleet-level library rule |
| `enabled` | no, defaults true | column default |
| `method_ref` | no | absent is a FINDING (a step asking for work no standard defines), never an error |
| the five judgment fields | **no, and must be null on delivery** | founder taxonomy |

## The two vocabularies that are real, and the two that are not

**Real, from the schema, and the validator checks them:** `stage` against
`pipeline_stage` (anticipate, identify, decide, monitor) and `materiality`
against the signed enum (safety_access, money_legal, convenience).
`consequence_class` likewise (editorial, behavioral, high_consequence).

**Not real: `lead_time` and `suppression_class`.** No column, enum or written
vocabulary exists for either. **The validator accepts any value and requires
neither**, deliberately: inventing a unit for lead time (days? visits?
seasons?) or a suppression vocabulary would be choosing a taxonomy, and a
plausible one would be indistinguishable from a decided one afterwards.

## Running it

```
node tooling/triggers/validate-shape.mjs docs/triggers/*.yaml
```

It reads no database and writes nothing. It reports per file: rules parsed,
errors, and **the judgment fields left blank, which is the expected state and
is reported rather than warned about.**
