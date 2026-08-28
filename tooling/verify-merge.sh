#!/usr/bin/env bash
# Verify-then-merge. Refuses unless every condition is PROVEN for the exact
# sha it will merge. Takes the PR number. Never merges on "green".
#
# WHY THIS EXISTS ALONGSIDE BRANCH PROTECTION (CLAUDE.md, Merging). Both
# controls are kept and neither replaces the other. Protection is structural
# and cannot be forgotten; it also cannot check the zero-run suite shape, and
# cannot bind the sha you VERIFIED to the sha you MERGE. This script does both
# and applies only to merges it is used for. That residual is honest, and it
# is an argument for protection, not against the script.
#
# THIS FILE LIVED IN A SCRATCH DIRECTORY UNTIL 28 AUGUST 2026, while CLAUDE.md
# described it as a control that is kept. A control that dies with a container
# is re-created from memory, which is the class of thing this repository turns
# into files on principle. Same shape as the partb-db.sql finding: described
# as existing, unreachable in practice.
#
# Usage:
#   tooling/verify-merge.sh <PR>              verify, then merge
#   tooling/verify-merge.sh <PR> --dry-run    verify only; CANNOT merge
#
# Requires GITHUB_TOKEN in the environment. Never prints it.
set -uo pipefail

fail () { echo "REFUSED: $1"; exit 1; }

PR="${1:-}"
MODE="${2:-merge}"
[[ -n "$PR" ]] || fail "usage: $0 <PR> [--dry-run]"
[[ "$PR" =~ ^[0-9]+$ ]] || fail "PR must be a number (got '$PR')"
case "$MODE" in
  merge|--dry-run) ;;
  *) fail "unknown mode '$MODE' (expected --dry-run or nothing)" ;;
esac
[[ -n "${GITHUB_TOKEN:-}" ]] || fail "GITHUB_TOKEN is not set; refusing rather than failing obscurely mid-check"

# The slug is DERIVED, never hardcoded. A hardcoded owner is wrong the day the
# repository moves to an organization, and GitHub's redirect on the old owner
# path means a stale value keeps WORKING while naming a repo that no longer
# holds it, so the failure would be silent. Deriving it is also what
# tooling/deploy.sh does for the same reason (deploy.sh:341).
ORIGIN_URL=$(git remote get-url origin 2>/dev/null) || fail "no 'origin' remote; cannot derive the repository"
SLUG=$(printf '%s' "$ORIGIN_URL" | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
# The slug must be exactly owner/repo. Testing only for a slash was not
# enough, and the proof run is what showed it: a gitlab origin left the WHOLE
# URL in $SLUG, which contains slashes, so it passed, built a nonsense API
# base, and refused three checks later with "could not resolve a head sha".
# It failed closed, and it failed closed while blaming the PR for a defect in
# the remote, which sends the operator to the wrong place. tooling/deploy.sh
# carries the same slash-only test at :342 and is reported, not changed here.
[[ "$SLUG" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]] \
  || fail "origin is not a GitHub owner/repo URL ('$ORIGIN_URL'); refusing rather than guessing"
API="https://api.github.com/repos/$SLUG"
echo "repository: $SLUG"

H=(-H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json")

# 1. The head, read from the PR itself, not from anything remembered.
HEAD=$(curl -sS "${H[@]}" "$API/pulls/$PR" | python3 -c "
import json,sys
try: print(json.load(sys.stdin)['head']['sha'])
except Exception: print('')
")
[[ ${#HEAD} -eq 40 ]] || fail "could not resolve a head sha for PR $PR (got '${HEAD}')"
echo "head under test: $HEAD"

# 2. The github-actions SUITE must exist AND carry runs. A suite with zero
#    runs is the startup_failure shape: created, never executed.
SUITES=$(curl -sS "${H[@]}" "$API/commits/$HEAD/check-suites")
echo "$SUITES" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ga=[s for s in d.get('check_suites',[]) if s['app']['slug']=='github-actions']
if not ga: sys.exit('no github-actions check suite exists for this head')
s=ga[0]
if s['latest_check_runs_count']==0: sys.exit('the github-actions suite exists but carries ZERO runs (the startup_failure shape)')
if s['status']!='completed': sys.exit(f\"suite not completed (status={s['status']})\")
if s['conclusion']!='success': sys.exit(f\"suite conclusion is {s['conclusion']}\")
print(f\"  suite: completed/success, {s['latest_check_runs_count']} runs\")
" || fail "$(echo "$SUITES" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ga=[s for s in d.get('check_suites',[]) if s['app']['slug']=='github-actions']
print('no github-actions suite' if not ga else f\"suite {ga[0]['status']}/{ga[0]['conclusion']} runs={ga[0]['latest_check_runs_count']}\")")"

# 3. BOTH named jobs must be PRESENT and successful. Presence is asserted by
#    name, never inferred from the absence of a failure. These two names are
#    the same two the branch ruleset requires; if the ruleset's list ever
#    changes, this list changes with it.
RUNS=$(curl -sS "${H[@]}" "$API/commits/$HEAD/check-runs")
echo "$RUNS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
by={r['name']:r for r in d.get('check_runs',[])}
missing=[n for n in ('gates','airplane') if n not in by]
if missing: sys.exit('required job(s) never reported for this head: '+', '.join(missing))
for n in ('gates','airplane'):
    r=by[n]
    if r['status']!='completed': sys.exit(f'{n} is {r[\"status\"]}, not completed')
    if r['conclusion']!='success': sys.exit(f'{n} concluded {r[\"conclusion\"]}')
    print(f'  {n}: completed/success')
" || fail "job check failed (see above)"

# The dry run stops HERE, structurally: the merge call is below this exit and
# cannot be reached. G-63's lesson, applied at birth rather than after an
# incident: a mode advertised as read-only has to be read-only by control
# flow, not by intention.
if [[ "$MODE" == "--dry-run" ]]; then
  echo "DRY RUN: every check passed for $HEAD. Nothing was merged."
  exit 0
fi

# 4. Merge THAT sha. The REST endpoint takes sha and refuses if the head has
#    moved, which closes the read-then-merge race atomically rather than
#    narrowing it.
echo "merging $HEAD ..."
OUT=$(curl -sS -X PUT "${H[@]}" "$API/pulls/$PR/merge" \
  -d "{\"sha\":\"$HEAD\",\"merge_method\":\"merge\"}")
echo "$OUT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if not d.get('merged'): sys.exit('merge refused: '+str(d.get('message')))
print('MERGED', d['sha'][:8])
" || fail "$(echo "$OUT" | head -c 200)"
