---
status: living
---

# Task Inventory v1.4 DRAFT (derived catalog, for founder review)

Drafted 25 August 2026 under the founder's proceed instructions
(register A581 item 5). DRAFT until the founder adopts it; adoption is
the event that resolves provisional task_definition flags, freezes
this document with a manifest hash, and admits the Inventory loader.

## Lineage note (read first)

**Task Inventory v1.3 remains unlocated, and this document does not
reconstruct it.** The premise check
(TASK_INVENTORY_RECONSTRUCTION_FINDING.md) found that the catalog's
citation trail is not repository-side: no task rows, no id-to-name
mapping, no per-task standard links exist here, and the only in-repo
citation names the range T-001..T-344 without content. A
"reconstruction" would therefore have invented 344 identities, which
is fabrication wearing reconstruction's name. This draft is the
finding's second way forward, which A581's own safety language
matches (provisional flags resolving on adoption; any later-found
v1.3 reconciled by register entry):

- **Derived, not reconstructed.** Every row below is derived from the
  two sources that exist in this repository: the Standards Store
  (1,146 provisions across 24 documents, STD-000..STD-023, read whole
  for this draft) and the live product task list (the four seeded
  close-flow definitions, the only task rows in the product).
- **The ids are NEW**, in a distinct namespace (WKT-###) that can
  never collide with or silently claim the catalog's T-### identities.
  The forecasting brief's do-not-alter rule on the 344 T-ids is
  honored by never minting one.
- **The count differs from 344 because the grain cannot be
  recovered.** This draft derives 65 recurring work units at the
  grain the live close-flow list already uses ("Kitchen reset to zone
  standard"); v1.3's finer grain, if it is ever found, reconciles by
  register entry.
- Provisional task_definition rows resolve against this document ON
  ADOPTION, not before. Until then WL Gate 1 objects keep building
  against the provisional list per WK-DEV-008 section 4.

## Method, so the derivation is checkable

The store's own structure is the source: each STD document covers one
work domain and its sections are coherent units (a visit sequence, a
done-state checklist, a care method, a never-do list, a report list).
Task rows are derived only where a section set describes a REUSABLE
UNIT OF RECURRING WORK a requirement could instantiate and an
estimate could price. Doctrine sections (STD-000.1), method references
(STD-007 materials, STD-000.3 room sequence, STD-000.4 folding),
never-do lists, floors that constrain conduct rather than schedule
work (STD-022 emergencies, STD-014 observance separation rules), and
report lists attach to rows as governing references instead of
becoming rows themselves. Nothing below invents content: every row
cites the store sections it derives from.

## What the founder decides at review

1. **Row acceptance and names.** Accept, rename, merge, or split any
   row; the WKT ids renumber freely until adoption.
2. **Service levels.** Deliberately blank everywhere: which tier gets
   which task is the revenue model's taxonomy, never derived.
3. **Pack and category assignment.** The category taxonomy is the
   Inventory's to own (WK-DEV-008); this draft groups by the store's
   own domains and proposes nothing beyond that grouping.
4. **Cadences.** The store repeatedly says "on the documented
   cadence"; the documented cadence is per household (the
   household_task_profile's job), so no cadence column exists here.
5. Whether the four rule-shaped rows flagged "(rule-shaped)" belong in
   a task catalog at all or in conduct standards only.

## The catalog

### Visit structure (STD-000, STD-018)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-001 | Pre-visit preparation | STD-018.1, STD-000.3.1 | Playbook notes, last report, open flags, calendar, before arrival |
| WKT-002 | Opening walkthrough | STD-018.2 | two minutes, every room, touching nothing |
| WKT-003 | Thirty-second corrections | STD-000.2 | (rule-shaped) the standing micro-task rule with its four exclusions |
| WKT-004 | Full walkthrough close | STD-018.2, STD-003.10, STD-013 | LIVE as "Full walkthrough, rear gate latch checked" (db:tasks) |
| WKT-005 | Visit report and photo record | STD-000.9, every document's report section | includes changes-noticed every visit and the photo boundaries |

### Kitchen and food (STD-001, STD-002; materials via STD-007.3)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-006 | Kitchen reset to zone standard | STD-001.1, STD-001.2; floors STD-002 | LIVE (db:tasks) |
| WKT-007 | Perishables and delivery handling | STD-001.1.2, STD-002.3, STD-003.6 | first work of every visit; the clock rule |
| WKT-008 | Refrigerator organization and rotation | STD-001.4, STD-002.4, STD-002.5 | shelf discipline, raw-protein floor |
| WKT-009 | Food storage placement | STD-001.3 | counter vs ripen-out vs refrigerated |
| WKT-010 | Leftovers portioning and labeling | STD-001.1.4, STD-002.4 | dated, ceilinged |
| WKT-011 | Cookware and specialty dish care | STD-001.5, STD-007.3 | cast iron, nonstick, boards |
| WKT-012 | Dishwasher cycle | STD-001.6, STD-001.2.2 | load, run or empty, never full and idle |
| WKT-013 | Kitchen staples and lows watch | STD-001.8, STD-015.1 | feeds the purchasing rows below |

### Bathroom (STD-004)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-014 | Bathroom reset to done state | STD-004.1, STD-004.2; cloth floor STD-004.4; materials STD-004.3 | every surface dry |
| WKT-015 | Bathroom moisture sentinel check | STD-004.6, STD-004.10 | under-sink, toilet base, grout and seal over time |
| WKT-016 | Towel rotation | STD-004.5 | cadence documented per household |
| WKT-017 | Bathroom hazard-storage check | STD-004.8 | products, razors, bath toys |

### Bedroom and closet (STD-005)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-018 | Bedroom reset | STD-005.1, STD-005.3; privacy floor STD-005.6 | |
| WKT-019 | Bed making and linen change | STD-005.2, STD-000.4, STD-015.2 | |
| WKT-020 | Closet maintenance | STD-005.4 | maintains, never reorganizes |
| WKT-021 | Child-room safety check | STD-005.5, STD-008.4 | small parts, cords, same-day flag |

### Laundry (STD-006)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-022 | Laundry cycle service | STD-006.1, STD-006.2, STD-006.3, STD-006.5, STD-000.4 | collect, sort, wash, dry, fold, return |
| WKT-023 | Stain treatment | STD-006.4 | never through the dryer |
| WKT-024 | Delicates and specialty garment care | STD-006.6 | wool, silk, structured items |
| WKT-025 | Laundry machine upkeep | STD-006.5, STD-006.7 | lint every load, dispenser, housing |
| WKT-026 | Linen rotation, primary and guest | STD-015.3, STD-004.5 | LIVE (db:tasks) |

### Living spaces (STD-008)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-027 | Living-room reset to ready | STD-008.1, STD-008.2, STD-008.7 | ready, not styled |
| WKT-028 | Screens and electronics cleaning | STD-008.3, STD-010.3 | dry microfiber; never unplug |
| WKT-029 | Toy reset and small-parts check | STD-008.4 | to the household's own system |
| WKT-030 | Hearth care | STD-008.5 | cold-ash rule; sweep cadence |
| WKT-031 | Dining table and linens reset | STD-008.6 | leaves, pads, linens on their own cadence |

### Entryway and arrivals (STD-003)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-032 | Entryway reset and path clearing | STD-003.3; egress floor STD-003.10 | |
| WKT-033 | Inbound and outbound zone processing | STD-003.4, STD-003.6, STD-003.12 | mail sorted unread; returns staged |
| WKT-034 | Wet-weather and shoe-practice handling | STD-003.5, STD-003.2 | |
| WKT-035 | Seasonal gear rotation and child sizing | STD-003.8, STD-013.4 | before the season, not during |
| WKT-036 | Unhomed-item landing and pattern watch | STD-003.7 | three visits running is a system gap |
| WKT-037 | Bins staged for collection | STD-001.2.6, STD-013.1 | LIVE (db:tasks) |

### Home office (STD-010)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-038 | Office cleaning around paper and devices | STD-010.2, STD-010.3, STD-010.4, STD-010.5 | paper squared in place, never sorted; devices untouched |

### Storage, garage, and mechanicals (STD-012)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-039 | Storage-area path and floor upkeep | STD-012.1, STD-012.4; safety floor STD-012.2 | paths, shutoffs, exits clear |
| WKT-040 | Mechanical-room sentinel sweep | STD-012.3, STD-016.6 | water heater, HVAC, panel, described not diagnosed |

### Outdoor transition zones (STD-013)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-041 | Entry approach and porch reset | STD-013.3 | the first thing every visitor touches |
| WKT-042 | Ice and snow same-day clearing | STD-013.2 | safety, same-day, where documented |
| WKT-043 | Seasonal outdoor preparation | STD-013.4, STD-016.3 | booked ahead: gutters, heating, outerwear |

### Pets and plants (STD-009)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-044 | Pet care visit | STD-009.3; floors STD-009.1, STD-009.2 | documented food, portion, time, route; door protocol |
| WKT-045 | Plant care | STD-009.4 | documented schedule, never instinct |

### Linen, consumables, and guest readiness (STD-015)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-046 | Par-level consumables check | STD-015.1 | house-wide; kitchen lows (WKT-013) feed it |
| WKT-047 | Linen closet upkeep | STD-015.2, STD-000.4 | |
| WKT-048 | Guest room readiness | STD-015.3, STD-019.4 | fresh whether or not used |

### Products, supplies, and equipment (STD-011)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-049 | Product set conformance and gap logging | STD-011.1, STD-011.2; mixing floor STD-011.3 | |
| WKT-050 | Equipment care | STD-011.6 | vacuums checked before, emptied between households |
| WKT-051 | Cross-household kit turnover | STD-011.5 | (rule-shaped) nothing crosses households unlaundered |

### Purchasing and subscriptions (STD-017)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-052 | Standing replenishment ordering | STD-017.3, STD-017.4; credentials floor STD-017.2 | authority tiers govern |
| WKT-053 | Purchase logging and receipt capture | STD-017.6 | not in the app, did not happen |
| WKT-054 | Order follow-through and returns processing | STD-017.7, STD-003.4 | tracked to arrival; deadlines logged |
| WKT-055 | Subscription observation and proposal | STD-017.5 | never acts; notes and proposes |

### Vendors and third parties (STD-020)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-056 | Vendor booking and reconfirmation | STD-020.2 | 24-48 hour reconfirm as routine |
| WKT-057 | Vendor access handling | STD-020.4 | (floor-governed) documented in advance or real-time approval |
| WKT-058 | Vendor work verification and record | STD-020.5, STD-020.3 | before and after photographs |

### Events, guests, and occasions (STD-019; observance via STD-014)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-059 | Event run-of-show planning | STD-019.2; traditions rule STD-019.1 | contingency at every key risk point |
| WKT-060 | Post-event close-out | STD-019.3, STD-019.10 | returns, payments, thank-yous, debrief |
| WKT-061 | Visiting-children preparation | STD-019.5 | childproof kit staged; allergy-checked for the visitor |
| WKT-062 | Gesture preparation with cultural check | STD-019.8, STD-014.5 | the cultural check comes first, always |

### Anticipation and observance upkeep (STD-016, STD-014)

| Id | Task | Governing standards | Note |
|---|---|---|---|
| WKT-063 | Flag lifecycle upkeep | STD-016.5, STD-000.9.6-9.8 | revisit triggers, re-observation, promotion |
| WKT-064 | Observance calendar watch | STD-014.3, STD-014.8, STD-016.4 | moving dates confirmed yearly; preparation weeks ahead |
| WKT-065 | Environmental assessment sweep | STD-023.1, STD-023.2, STD-023.6 | reset situations; environment, never the person |

## Deliberately NOT rows (so their absence reads as decided)

- **STD-007 (materials), STD-000.3/000.4 (sequence, folding):** method
  references cited by the room tasks; a reference is not a task.
- **STD-022 (emergencies and medical boundaries):** floors governing
  conduct in the moment; emergency response is never scheduled work,
  and certification currency is a corporate obligation, not a
  household task.
- **STD-021 (requests and communication), STD-014 conduct floors,
  STD-000.5/000.6/000.7 (never-touch, notice-note-propose, leave no
  trace):** standing conduct over every task; they govern rows rather
  than being rows.
- **Emergency events (event:emergency scope):** incident response has
  its own machinery (incident_report, WK-SOP-013).

## The live product list, mapped

| task_definition (db:tasks, provisional) | Draft row |
|---|---|
| Kitchen reset to zone standard | WKT-006 |
| Linen rotation, primary and guest | WKT-026 |
| Bins staged for collection | WKT-037 |
| Full walkthrough, rear gate latch checked | WKT-004 |

On adoption, the Inventory loader flips these four from provisional to
canonical against the adopted ids, and every future definition enters
through the loader rather than the app (the 0049 structural rule).
