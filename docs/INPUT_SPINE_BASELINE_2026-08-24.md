---
status: frozen
---
# Input spine baseline: current state against the WK-DEV-007 section 2 standards

24 August 2026, read-only survey at `05aad20`. The perfection work targets
deltas; this records what the deltas ARE, each standard against the code
with evidence. Verdicts: MET, GAP (build work), DRILL (cannot be judged
statically; a measured run decides), DECISION (meeting the standard
collides with an earlier founder design and needs a call, not a commit).

## Capture cost (3 interactions or fewer per observation; close-flow under 2 minutes)

- A look on an existing flag: condition value plus optional note plus
  submit, 2-3 interactions (`visit/page.tsx:213-214`). MET.
- A new condition flag: subject, location, concern, plus a revisit date or
  condition, plus submit: 5 interactions minimum (`visit/page.tsx:275-287`).
  Exceeds the standard, but the field set IS the W-5 founder design
  ("subject, location, concern in the HM's words" plus the STD-016 revisit
  CHECK). DECISION: progressive disclosure or prefill could cut visible
  interactions without dropping a field; dropping a field changes W-5.
- Close-flow interaction time: DRILL. A timed scripted run (extendable
  from the airplane e2e) produces the number; nothing static does.

## Offline first-class (every input path works in airplane mode)

- The close-flow wizard: MET by design (offline queue, atomic tab
  handoff, dead-letter, the airplane e2e proves submit-offline then
  sync-on-reconnect).
- Every OTHER capture surface on the visit page (new flag, look, close
  flag, deferral resolution, prompt outcomes) is a plain server-action
  form: it needs connectivity at submit and fails in airplane mode. GAP,
  and the largest one in the spine: "every input path" currently means
  "the wizard only."
- The airplane drill standard (capture plus close-flow plus
  sync-on-reconnect as one documented acceptance test): the e2e covers
  the wizard flow; the capture forms are not in it. GAP rides the
  previous item.

## Nothing is lost, ever

- Submitted commands: MET (durable-copy invariant proven in the queue
  suite since AK).
- Un-submitted wizard state: GAP. No draft persistence exists in
  `VisitWizard.tsx` (no autosave, no resume); a crash mid-close-flow
  loses every step not yet submitted, which is exactly the case the
  standard names.
- Explicit undo for every edit: GAP. No undo surface exists; correction
  is re-entry (the audit trail records both, which is the recovery path
  but not an undo).
- Dedupe on import: MET at the id level (photo upload idempotent on
  photoId, `upload/route.ts:34-37`; queue dedupes on idempotencyKey);
  workbook import validates before writing and exits on any error with
  an enumerated list, never a partial silent import
  (`wk_import.py:161-165`, `sys.exit(2)` precedes every write; commit
  writes a seed file, dry run is the default). MET.
- Every mutation audited with actor and timestamp: MET (established;
  provenance stamped server-side).

## Validation serves the field (flag rather than block)

Mixed. Current forms BLOCK on validation (refuse bad-input redirects with
the banner): a concern under 4 characters, a missing revisit trigger, an
em dash all refuse outright. The refusals are now visible (G-55 closed),
but the posture is block-first, and the standard asks for
flag-and-capture-anyway wherever a HOM plausibly meant it. GAP with a
boundary: the em-dash refusal and the structural CHECKs (no revisit
trigger, no record) are founder rules and stay blocking; the length and
format checks are candidates for flag-not-block. DECISION on where the
line sits.

## Sensitivity at capture (required, safe default more restrictive)

Structurally different from the standard's assumption. No in-visit
capture surface asks for a sensitivity tier: condition flags, looks,
deferrals and paused decisions are role-gated tables without per-row
tiers; Record fields acquire sensitivity at import time; client edits are
S1-allowlisted. The one path the standard directly governs (a HOM
capturing a new Record field in the home) does not exist yet; it arrives
with the intake slice. DECISION folded into that build: when field
capture lands, the tier selector is required with the more-restrictive
default, per the standard.

## Import hardening

- Malformed rows: MET (enumerated exception list, hard exit, no partial
  import; evidence above).
- Round-trip of the Household Zero workbook and the sprint's second
  household: DRILL, blocked founder-side on the workbook copy.

## Photos

- Stored private in Postgres behind auth, idempotent, size-capped, MFA
  and field-role gated (`upload/route.ts`). Never in a general object
  store (none exists). MET on privacy of storage.
- Media-release flag checked at capture: GAP. The upload route checks
  role and MFA, never the household's media flag.
- EXIF location stripped at capture: GAP. Nothing strips metadata,
  client-side or server-side; a photo taken in a member's home currently
  retains its GPS tags in the stored base64.

## Cockpit (surveyed separately when its pass starts)

Stranger mode and the briefing exist; the REQ-073 load budget needs a
measured run; the SIGNALS panel arrives with the shadow engine. Not
baselined here; the Cockpit perfection pass opens with its own survey
the way this one opens the spine's.

## The resulting build list, in dependency order

1. Offline capture for the visit-page forms (the biggest gap; the queue
   substrate already exists to carry them).
2. Wizard draft persistence and resume (autosave to the existing
   offline store; crash-resume test in the queue suite's style).
3. Photo capture rules: EXIF strip plus the media-release gate at the
   upload boundary (server-side strip covers every client).
4. The extended airplane drill as one documented acceptance e2e
   (capture, close-flow, sync) once 1 and 2 exist to test.
5. Flag-not-block validation pass behind the founder's line (DECISION
   above).
6. Undo design (smallest honest version: a revert action that writes a
   new audited mutation, never a delete).
7. The two DRILL numbers (close-flow time, briefing load) measured and
   reported in the weekly note once a drill runs.
