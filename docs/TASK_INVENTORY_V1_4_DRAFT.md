---
status: living
---

# Task Inventory v1.4 DRAFT rev2 (operational inventory, with the proposed MAPS_TO)

Rev2 drafted 25 August 2026 under the founder's Task Inventory
adoption-path instructions (register A582), superseding rev1 in
place; amended the same day per register A584 (the v1.3.1 supersession
and the four converted mappings), so the review block sees the
finished join.
DRAFT until the founder's row verdicts return from the combined review
afternoon; the freeze, the provisional-flag flip, and the Inventory
loader all wait on that review (A582 section 4).

## Lineage note (read first)

**Task Inventory v1.3 is FOUND** (A582): the master library holds the
complete catalog under the Level 1-5 x 17-pack taxonomy.
**AMENDED to v1.3.1 per register A584** (25 Aug 2026, the
commercial-gap decision resolved as option (a), amendment by register
entry): T-345..T-348 appended (Bedroom reset to standard; Living and
family room reset; Bathroom clean and reset; Home office weekly reset
and service; all Level 1, Universal, Rooms & resets, the catalog's own
idiom), and T-206 retired as a data artifact, its id never reused and
its row excluded from the repo edition. Row count 344 to 347. The
figure-free repo extract is committed beside this document as
`TASK_INVENTORY_V1_3_1_REPO_EDITION.csv`
(sha256 d71e27e0d17bd9480da9540b6ebc0e3d5cbbda3a30c5bcd48dfa8a258e74bfb5;
the superseded v1.3 pin, sha256 8dc63328..., survives in git history;
the full workbook stays library-side and is never requested or
committed). The freeze rules are unchanged: T-ids never altered or
renumbered by the product; this amendment happened where amendments
happen, in the register. The confirmed architecture:

- **v1.3 is the canonical COMMERCIAL inventory.** T-ids are FROZEN:
  never altered, renumbered, or extended by the product; Level and
  Pack values change only by register event. The product treats the
  CSV as read-only reference.
- **v1.4 (this document) is the canonical OPERATIONAL inventory.**
  WKT rows are the execution grain that task_definition, the close
  flow, estimates, and Task Evidence bind to.
- **MAPS_TO joins them**: each WKT row lists the T-ids whose work it
  executes; one-to-many is expected in both directions. The mapping
  below is the developer's PROPOSAL per A582 section 3; UNCERTAIN
  rows are the founder's to rule.

Rev1's derivation stands unchanged underneath: every WKT row derives
from the Standards Store (1,146 provisions, read whole) and the live
close-flow list, and no row invents content. The earlier
premise-check refusal to fabricate T-ids is endorsed and registered
in A582; the found catalog and the WKT namespace coexist by design.

## The five review decisions, applied (A582 section 2)

1. **WKT-003 (thirty-second corrections) is REMOVED as a task row**;
   it moves to the not-rows conduct set below, and its execution
   surfaces in the close flow as the standing micro-task
   confirmation, never a schedulable task. The id is retired, not
   reused. WKT-051 stays IN as estimable between-household work;
   WKT-005 and WKT-057 stay as drawn.
2. **No service-level column in v1.4, permanently**: scoping DERIVES
   through MAPS_TO from v1.3's Level values.
3. **Categories**: the store-domain grouping below stands; the
   commercial taxonomy lives in v1.3's Category column and is not
   duplicated here.
4. **Cadences**: confirmed absent; cadence belongs to
   household_task_profile only.
5. **Row acceptance**: the founder reviews these rows in the same
   protected block as the 300-row floor review; nothing freezes
   before that review returns.

## Reported on intake of the CSV (observations, not edits)

- The intake findings are DISPOSITIONED by A584: T-206 ("Total
  tasks: 192", a data artifact) is RETIRED, its id never reused and
  its row excluded from the repo edition. The eleven
  flattened-header rows (T-019, T-049, T-060, T-066, T-095, T-102,
  T-159, T-169, T-185, T-192, T-193) are UNCHANGED, awaiting
  individual founder rulings in the review block, and stay in the
  reference meanwhile; none receives a mapping, since none is
  executable work. The T-194..T-205 never-list is CONFIRMED
  standing, with the commercial and operational conduct sets now
  agreeing from both sides.
- The unclaimed v1.3 families (end of this document) are CONFIRMED
  as future-WKT candidates, no action; the asymmetry is expected
  (commercial breadth vs the store-governed operational core). The
  four room-reset gaps rev2 surfaced are CLOSED by the A584
  amendment (T-345..T-348), mapped above.

## MAPS_TO vocabulary

- `T-###[, ...]`: the proposal, the T-ids whose work the row executes.
- `NO-MAP: <one line>`: no defensible counterpart, with the reasoning.
- `UNCERTAIN (T-###...)`: a candidate exists but choosing would be a
  guess; the founder rules.

## The catalog

### Visit structure (STD-000, STD-018)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-001 | Pre-visit preparation | STD-018.1, STD-000.3.1 | NO-MAP: v1.3 carries no pre-visit read row; the professional-practice rows (T-061..065) are duties, not this preparation | Playbook notes, last report, open flags, calendar |
| WKT-002 | Opening walkthrough | STD-018.2 | T-001, T-002, T-003, T-004, T-005, T-009, T-047 | the watch pass: the walkthrough executes the state checks and safety glances |
| WKT-004 | Full walkthrough close | STD-018.2, STD-003.10, STD-013 | T-001, T-002 | LIVE as "Full walkthrough, rear gate latch checked" (db:tasks) |
| WKT-005 | Visit report and photo record | STD-000.9, every document's report section | T-039, T-044, T-045, T-046, T-059, T-065, T-106, T-107 | stays as drawn per A582 |

### Kitchen and food (STD-001, STD-002; materials via STD-007.3)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-006 | Kitchen reset to zone standard | STD-001.1, STD-001.2; floors STD-002 | T-014, T-015, T-016, T-022 | LIVE (db:tasks) |
| WKT-007 | Perishables and delivery handling | STD-001.1.2, STD-002.3, STD-003.6 | T-029, T-101 | first work of every visit; the clock rule |
| WKT-008 | Refrigerator organization and rotation | STD-001.4, STD-002.4, STD-002.5 | T-011, T-013 | |
| WKT-009 | Food storage placement | STD-001.3 | T-012 | counter vs ripen-out vs refrigerated |
| WKT-010 | Leftovers portioning and labeling | STD-001.1.4, STD-002.4 | UNCERTAIN (T-011) | v1.3 may fold this into the fridge audit; the founder rules |
| WKT-011 | Cookware and specialty dish care | STD-001.5, STD-007.3 | NO-MAP: no cookware-care row exists; the method lives standards-side | |
| WKT-012 | Dishwasher cycle | STD-001.6, STD-001.2.2 | T-014 | |
| WKT-013 | Kitchen staples and lows watch | STD-001.8, STD-015.1 | T-010, T-017 | feeds the purchasing rows |

### Bathroom (STD-004)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-014 | Bathroom reset to done state | STD-004.1, STD-004.2; cloth floor STD-004.4 | T-033, T-347 | T-347 added by the A584 amendment; the earlier no-distinct-row note is resolved |
| WKT-015 | Bathroom moisture sentinel check | STD-004.6, STD-004.10 | T-003 | |
| WKT-016 | Towel rotation | STD-004.5 | T-021, T-276 | |
| WKT-017 | Bathroom hazard-storage check | STD-004.8 | UNCERTAIN (T-052) | child-safeguarding compliance is the nearest row; whether it covers hazard storage is the founder's call |

### Bedroom and closet (STD-005)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-018 | Bedroom reset | STD-005.1, STD-005.3; privacy floor STD-005.6 | T-345 | commercial counterpart added by the A584 amendment |
| WKT-019 | Bed making and linen change | STD-005.2, STD-000.4, STD-015.2 | T-021, T-034, T-276 | |
| WKT-020 | Closet maintenance | STD-005.4 | NO-MAP: v1.3 carries seasonal closet turns (T-134, T-142), a different grain; weekly closet upkeep has no row | maintains, never reorganizes |
| WKT-021 | Child-room safety check | STD-005.5, STD-008.4 | T-052 | |

### Laundry (STD-006)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-022 | Laundry cycle service | STD-006.1, STD-006.2, STD-006.3, STD-006.5, STD-000.4 | T-020, T-275 | |
| WKT-023 | Stain treatment | STD-006.4 | NO-MAP: folded into the laundry cycle rows; no distinct row | never through the dryer |
| WKT-024 | Delicates and specialty garment care | STD-006.6 | UNCERTAIN (T-085) | T-085 is the out-of-house dry clean circuit; in-home delicates care may or may not be inside it |
| WKT-025 | Laundry machine upkeep | STD-006.5, STD-006.7 | UNCERTAIN (T-025) | T-025 is filter changes on cycle; whether it includes laundry machines is the founder's call |
| WKT-026 | Linen rotation, primary and guest | STD-015.3, STD-004.5 | T-021, T-276 | LIVE (db:tasks) |

### Living spaces (STD-008)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-027 | Living-room reset to ready | STD-008.1, STD-008.2, STD-008.7 | T-346 | ready, not styled; commercial counterpart added by the A584 amendment |
| WKT-028 | Screens and electronics cleaning | STD-008.3, STD-010.3 | NO-MAP: no electronics-care row exists | |
| WKT-029 | Toy reset and small-parts check | STD-008.4 | T-030 | T-144 (toy rotation service) is the deeper build, a different grain |
| WKT-030 | Hearth care | STD-008.5 | T-009 | |
| WKT-031 | Dining table and linens reset | STD-008.6 | NO-MAP: table linens fold into the linen rows; the dining reset has no row | |

### Entryway and arrivals (STD-003)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-032 | Entryway reset and path clearing | STD-003.3; egress floor STD-003.10 | T-031 | |
| WKT-033 | Inbound and outbound zone processing | STD-003.4, STD-003.6, STD-003.12 | T-028, T-029, T-086, T-279 | |
| WKT-034 | Wet-weather and shoe-practice handling | STD-003.5, STD-003.2 | NO-MAP: method within the entry reset; no distinct row | |
| WKT-035 | Seasonal gear rotation and child sizing | STD-003.8, STD-013.4 | T-026, T-036, T-099, T-142, T-245, T-246 | |
| WKT-036 | Unhomed-item landing and pattern watch | STD-003.7 | UNCERTAIN (T-281) | T-281 stages decluttering for member decision; the weekly landing habit may be inside or beside it |
| WKT-037 | Bins staged for collection | STD-001.2.6, STD-013.1 | T-022, T-023 | LIVE (db:tasks) |

### Home office (STD-010)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-038 | Office cleaning around paper and devices | STD-010.2, STD-010.3, STD-010.4, STD-010.5 | T-348 | commercial counterpart added by the A584 amendment; T-139 remains the standing-up build, a different grain |

### Storage, garage, and mechanicals (STD-012)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-039 | Storage-area path and floor upkeep | STD-012.1, STD-012.4; safety floor STD-012.2 | NO-MAP: T-134 is the seasonal turn; weekly path upkeep has no row | |
| WKT-040 | Mechanical-room sentinel sweep | STD-012.3, STD-016.6 | T-004, T-005, T-055 | |

### Outdoor transition zones (STD-013)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-041 | Entry approach and porch reset | STD-013.3 | NO-MAP: weekly approach care has no row; T-006 is the post-storm check, T-153.. the seasonal property builds | |
| WKT-042 | Ice and snow same-day clearing | STD-013.2 | UNCERTAIN (T-006) | whether the post-storm exterior check includes clearance is the founder's call |
| WKT-043 | Seasonal outdoor preparation | STD-013.4, STD-016.3 | T-027, T-239 | booked ahead, not done at the season |

### Pets and plants (STD-009)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-044 | Pet care visit | STD-009.3; floors STD-009.1, STD-009.2 | T-067, T-068, T-069, T-070, T-071 | the appointment-payload rows (T-233, T-234) are separate work, unclaimed below |
| WKT-045 | Plant care | STD-009.4 | T-008 | |

### Linen, consumables, and guest readiness (STD-015)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-046 | Par-level consumables check | STD-015.1 | T-010, T-033, T-244 | |
| WKT-047 | Linen closet upkeep | STD-015.2, STD-000.4 | UNCERTAIN (T-021) | the closet's own upkeep vs the linen change |
| WKT-048 | Guest room readiness | STD-015.3, STD-019.4 | T-032, T-125, T-138 | |

### Products, supplies, and equipment (STD-011)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-049 | Product set conformance and gap logging | STD-011.1, STD-011.2; mixing floor STD-011.3 | NO-MAP: corporate/method row, the class A582 expects unmapped | |
| WKT-050 | Equipment care | STD-011.6 | NO-MAP: equipment row, the class A582 expects unmapped | |
| WKT-051 | Cross-household kit turnover | STD-011.5 | NO-MAP: between-household corporate work; v1.3 is member-facing | stays IN per A582 as estimable work |

### Purchasing and subscriptions (STD-017)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-052 | Standing replenishment ordering | STD-017.3, STD-017.4; credentials floor STD-017.2 | T-096, T-097, T-098, T-100, T-109, T-111, T-244 | |
| WKT-053 | Purchase logging and receipt capture | STD-017.6 | T-041, T-075 | |
| WKT-054 | Order follow-through and returns processing | STD-017.7, STD-003.4 | T-086, T-101, T-279 | |
| WKT-055 | Subscription observation and proposal | STD-017.5 | UNCERTAIN (T-092, T-115) | renewal executions and standing-instruction proposals are each half of it |

### Vendors and third parties (STD-020)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-056 | Vendor booking and reconfirmation | STD-020.2 | T-072, T-076, T-214, T-238 | |
| WKT-057 | Vendor access handling | STD-020.4 | T-053, T-056, T-073, T-230 | stays as drawn per A582 |
| WKT-058 | Vendor work verification and record | STD-020.5, STD-020.3 | T-074, T-231, T-232 | |

### Events, guests, and occasions (STD-019; observance via STD-014)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-059 | Event run-of-show planning | STD-019.2; traditions rule STD-019.1 | T-137, T-178, T-179, T-180 | |
| WKT-060 | Post-event close-out | STD-019.3, STD-019.10 | T-137 | the strike half; rental returns ride WKT-054's rows |
| WKT-061 | Visiting-children preparation | STD-019.5 | T-125, T-299 | |
| WKT-062 | Gesture preparation with cultural check | STD-019.8, STD-014.5 | T-113, T-119, T-120, T-131 | |

### Anticipation and observance upkeep (STD-016, STD-014, STD-023)

| Id | Task | Governing standards | MAPS_TO | Note |
|---|---|---|---|---|
| WKT-063 | Flag lifecycle upkeep | STD-016.5, STD-000.9.6-9.8 | T-046, T-047, T-048 | |
| WKT-064 | Observance calendar watch | STD-014.3, STD-014.8, STD-016.4 | T-252, T-253 | the observance EXECUTION rows (T-254..T-261) are unclaimed below |
| WKT-065 | Environmental assessment sweep | STD-023.1, STD-023.2, STD-023.6 | NO-MAP: internal referral machinery (reset situations), never member-sold work | |

## Deliberately NOT rows (so their absence reads as decided)

- **Thirty-second corrections (formerly WKT-003, removed per A582):**
  standing conduct (STD-000.2); its execution surfaces in the close
  flow as the standing micro-task confirmation. The id is retired,
  never reused.
- **STD-007 (materials), STD-000.3/000.4 (sequence, folding):** method
  references cited by the room tasks; a reference is not a task.
- **STD-022 (emergencies and medical boundaries):** conduct floors;
  emergency response is never scheduled work, and certification
  currency is a corporate obligation.
- **STD-021 (requests and communication), STD-014 conduct floors,
  STD-000.5/000.6/000.7:** standing conduct over every task. Note
  that v1.3's T-192..T-205 never-list states the same boundaries from
  the commercial side; the two lists agree and neither is a task.
- **Emergency events (event:emergency scope):** incident response has
  its own machinery (incident_report, WK-SOP-013).

## v1.3 families with no WKT counterpart yet (reported, not force-mapped)

The operational inventory derives from the Standards Store, which
governs the in-home service core; v1.3's commercial breadth reaches
work the store does not yet govern and product surfaces that do not
yet exist. These families therefore have no WKT row today, and each
is a candidate for future WKT rows as its standards or surfaces land:

- Calendar and family ops (T-079..T-088); queues and windows
  (T-089..T-094); communication rows (T-103..T-108).
- Substitutions and standing instructions (T-109..T-116); discovery
  and delight beyond gestures (T-117..T-118, T-121..T-124,
  T-126..T-130).
- Builds and turns (T-132..T-144 except T-138's mapping above);
  inventory and records (T-145..T-151); seasonal property
  (T-152..T-158).
- Projects, life arcs, events-and-travel programs (T-159..T-191
  except the event rows mapped above).
- Appointment preparation (T-207..T-218); vehicle, warranty,
  government, school obligations (T-219..T-229); pet obligations
  (T-233..T-234); windows, leads, and cycles (T-235..T-251).
- Observance and tradition execution (T-254..T-266); hobby cycles
  (T-267..T-274); travel support (T-277..T-278); errand stacking
  (T-280); decluttering (T-281).
- The pack-specific families (Federal, Military, Diplomatic,
  Immigrant, AgingParent, Disability, Custody, LaterLife, Estate,
  Waterfront, Historic, HOA, SecondHome: T-282..T-335).
- Reconciliation (T-336..T-344), which is the workload layer's own
  territory (WK-DEV-008) rather than a field task.

## The live product list, mapped

| task_definition (db:tasks, provisional) | Draft row |
|---|---|
| Kitchen reset to zone standard | WKT-006 |
| Linen rotation, primary and guest | WKT-026 |
| Bins staged for collection | WKT-037 |
| Full walkthrough, rear gate latch checked | WKT-004 |

After the founder's row verdicts return (A582 section 4): verdicts
apply through the floor-importer discipline (dry-run plan first, audit
rows, no inference on blanks); then v1.4 freezes with its manifest
hash, the four provisional rows flip to canonical against their WKT
ids, the Inventory loader is admitted, and WL Gate 2's estimator work
unblocks. The freeze hash and final row count go to the weekly note.
