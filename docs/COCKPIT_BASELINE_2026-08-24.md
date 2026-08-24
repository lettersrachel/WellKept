---
status: frozen
---
# Cockpit baseline: current state against the WK-DEV-007 section 2 standard

24 August 2026, read-only survey at `42b7f71`, opening the Cockpit
perfection pass the way INPUT_SPINE_BASELINE opened the spine's. The
Cockpit standard is one paragraph with five testable clauses; each is
surveyed against the mobile app (apps/hm-mobile) and the web field
surface (/visit), with evidence. Verdicts: MET, GAP (build work), DRILL
(a measured run decides), DECISION (a founder call precedes the build).

## 1. Briefing loads under the REQ-073 budget on cached data

The cache mechanism exists and is correct: the briefing fetch caches to
AsyncStorage per household and falls back to the cached copy offline,
labeled "cached" in the UI (briefing.ts fetchBriefing, the stale badge
in App.tsx BriefingView). Whether a cached open lands under REQ-073's
2-second line is a DRILL on a real device; nothing static answers it.

Adjacent finding, reported not chased: REQ-073's other half, search
results under 500ms p95 within a household, has NO surface anywhere in
the Cockpit or the web field pages. There is nothing to measure because
there is nothing to search with. Whether the Cockpit needs search
before training is a founder scoping call.

## 2. Stranger mode: one gesture, hides every S2/S3 surface

GAP, and the widest one. No stranger mode exists:

- The briefing API derives `stranger` from the role alone
  (`principal.role === "backup_hm"`, briefing route line 104); the
  mobile Briefing type carries the flag (briefing.ts) and the app never
  renders or acts on it (no occurrence in App.tsx).
- There is no gesture, toggle, or mode anywhere in the app.
- The permission core has no stranger filter at all (no stranger
  handling in packages/permissions), so a backup_hm projection is the
  ordinary staff projection: the 24 August data-layer drill showed a
  backup_hm briefing carrying an s2 CRITICAL value (the allergies
  field) in full.

DECISION before the build: the standard says stranger mode hides every
S2/S3 surface, and the allergies drill shows why that needs a founder
ruling rather than a mechanical filter: a covering stranger is exactly
the person who must know about a strict tree-nut allergy. The choices
are (a) hide every S2 as written, (b) a narrow reviewed
safety-exception list that stays visible in stranger mode, or (c) a
per-field stranger-visible marker set at capture. The Stranger Test
entity (coverage quality gate) is related but distinct; it measures
whether the record would carry a stranger, not what a stranger may see.
Once ruled, the build is: a real stranger filter in the permission core
(proven both directions), the one-gesture toggle, and the mode applied
to every Cockpit surface, not only the briefing.

## 3. The day's route, open loops, and signals in one screen

Three parts, three states:

- Open loops: GAP with a sharp edge. The briefing API already sends
  conditionFlags, overdueDeferrals, and overduePausedDecisions (route
  lines 96-108); the mobile Briefing type omits all three and the app
  drops them on the floor (briefing.ts interface; BriefingView renders
  flags, changed, specials, radar, lastYear, dots only). The web /visit
  page shows all of it; a HOM working from the phone does not see open
  loops the web already surfaces. Smallest build on the list, pure
  client-side parity.
- The day's route: DECISION-shaped blank. Scheduling is Jobber's under
  ADR-004; the app holds no visit schedule, so a "day's route" can only
  list assigned households (the current picker, App.tsx pickRow) with
  no order. Whether the route view reads from a founder-entered day
  plan, a Jobber export, or stays a plain household list is a call, not
  a default.
- Signals: arrives with the shadow_log session. The gate code is merged
  (surfacesBeyondShadow: promotion flag AND the A0 cap, which throws
  above the cap); the panel stays empty until the founder's per-trigger
  promotion flags exist, which is the design working, not a gap.

## 4. Every action completes or explains itself, no dead taps

Largely MET on the surveyed paths, with a bound: sign-in wraps every
action in a busy/error runner (App.tsx SignInScreen run()); the
close-flow submit surfaces errors and the queue's three states, and
conflicts are listed with names, never dropped (CloseFlowScreen,
visit-sync); photo capture failures surface. The web side is guarded
(refusal-visibility, fifteen guards); the mobile side has no equivalent
guard, so "no dead taps" across every Pressable is a DRILL: the
founding-HOM walkthrough is the instrument that finds any remaining
silent tap, which is exactly what the standard designed it for.

## 5. The founding-HOM walkthrough script

GAP, writable. Does not exist anywhere in docs/. It should be authored
after the open-loops parity lands (clause 3) so the script walks the
real screen, and per the standard it doubles as the February training
acceptance test.

## The resulting build list, in dependency order

1. Mobile open-loops parity: render conditionFlags, overdueDeferrals,
   and overduePausedDecisions in the mobile briefing (the API already
   sends them). Pure client build, no migration, no decision needed.
2. The stranger-mode ruling (DECISION above), then the stranger filter
   in the permission core, the one-gesture toggle, and both-directions
   proofs.
3. The day's-route ruling (DECISION above), then whichever view it
   authorizes.
4. The SIGNALS panel, with the shadow_log migration session (its own
   session; the gate code is already merged and proven).
5. The walkthrough script, after 1, doubling as training acceptance.
6. DRILL numbers, measured on a device and reported in the weekly
   note: cached briefing open time against the 2s line; the no-dead-
   taps walkthrough; and the close-flow interaction time shared with
   the spine's DRILL list.
