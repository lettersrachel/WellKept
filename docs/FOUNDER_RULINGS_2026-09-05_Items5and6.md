---
status: frozen
---
# Founder rulings, 5 September 2026: items 5 and 6

Author: Rachel Letters, CEO. Paste to Claude Code. Register under WK-QA-018.

## Item 5 was my error, and the shape is authorized separately
The spec register at `SPEC_REGISTER.md:34` already records the YAML conversion as founder-side, and Q-19's dependency column says the same. So the preparation batch asked this session to perform a task the tree had already assigned to me. Record that as the reason the item was blocked, rather than recording it as a missing document alone: the block was correct and the instruction was wrong.

Authorized as its own instruction: **define the YAML target shape ahead of the document.** Derive it from `trigger_rule`'s columns plus the five judgment fields (lead time, stage, consequence class, suppression class, materiality), with a validator and one worked example, so that when I sit down with WK-APP-002 I am filling a known form rather than inventing one.

State on the row, in the row itself and not only in a session log, that the shape is derived from the schema and not from WK-APP-002, so nobody later reads it as having been validated against the seven life-domain sections. If the document, when it arrives, does not fit the shape, that is a finding about the shape and not a reason to bend the document.

## Item 6: is_fixture becomes a required argument
Q-11y takes the required-argument pattern rather than a default, for the same reason the rate limiter's failure mode is required: a default lets a household become non-fixture without the caller saying so, and that distinction is the entire purpose of the flag. A real household will go through `db:seed` one day, which is exactly why the caller must state which kind it is loading.

Record the reasoning on the row rather than only the fix, and note what the defect would have cost had it shipped unnoticed: three fixture households counted as real in fleet roll-ups, the reconciliation knob, the capacity calculation and every covenant figure. The deliverable was correct and the loader was wrong, and only loading it rather than trusting it surfaced that.

## Two notes on what you did around these
The three workbooks being generated from the instrument template rather than authored is right: re-classifying a field would have been deciding on my behalf which household facts are secured. Keep that constraint on any future fixture work.

Leaving the Decision Rights block and the registries out, because `db:seed` ingests households and playbook fields only, is also right. A workbook the importer silently ignores is worse than one that plainly lacks a section.

## Continue
Item 7, the empty Household Green workbook, carrying item 6's finding: Green is a real household and must not carry the flag. Then items 8 through 12 in order.
