#!/usr/bin/env bash
# Round four, session C: the deploy as a gate, not a ritual. Three
# deploy-adjacent sharp edges in two days ran on human attention; every
# other rule of that class became a guard. --yes is dangerous because it
# suppresses the only confirmation; it becomes safe when the checks that
# confirmation would have caught run FIRST and refuse.
#
# Usage:
#   DATABASE_URL=... bash tooling/deploy.sh <expected-main-sha>
#   DATABASE_URL=... bash tooling/deploy.sh --preflight <sha>   # checks only, no deploy
#   bash tooling/deploy.sh --selftest      # prove the refusals fire AND the green paths pass
#
# Fail closed at every step: refuse and exit non-zero on any mismatch,
# never proceed-and-report. Same posture as the audit invariant, for the
# same reason. Covers the mechanical sequence only; DEPLOY.md section 4's
# human checklist still follows.
set -euo pipefail

EXPECTED_PROJECT="wellkept"
# The link file records the project by ID ONLY — Vercel writes projectId and
# orgId, never projectName. Checking a key Vercel does not write made the
# guard read "linked to nothing" and refuse every deploy (2026-07-28). The ID
# is the field that actually exists, and it is exact: no name-resolution call,
# no network, no ambiguity. If the project is ever recreated this must be
# re-pinned — that is the intended tradeoff for an offline, deterministic check.
EXPECTED_PROJECT_ID="prj_15Q69KLCnnRMQQZp8Ou4tORuZBQq"
PROD_HOST="https://wellkept-orcin.vercel.app"

fail() { echo "REFUSED: $1" >&2; exit 1; }

# Read the linked project id, or empty when the link file is absent/unreadable.
linked_project_id() {
  node -e "console.log(require('./.vercel/project.json').projectId ?? '')" 2>/dev/null || echo ""
}

# /api/build-id answers {"id":"<sha>"} — the sha must be extracted before it
# can be compared. Comparing the raw body to a bare sha never matches, so step
# 7 would have refused every deploy it reached.
extract_build_id() {
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).id??'')}catch{console.log('')}})"
}

# Step 2 first by design: an explicit cd to the repo root in this
# script's own invocation, never inherited from a caller's chain (the
# 2026-07-28 stray project came from a cd that persisted into a chained
# deploy).
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--selftest" ]]; then
  # Prove the refusals, red before green (guard-must-fire).
  bash "$0" 0000000000000000000000000000000000000000 2>/dev/null && { echo "SELFTEST FAIL: wrong sha accepted"; exit 1; }
  echo "selftest 1/6: wrong sha refused"
  WK_DEPLOY_TEST_DB_COUNT=999 WK_DEPLOY_TEST_SKIP_MIGRATE=1 bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: count mismatch accepted"; exit 1; }
  echo "selftest 2/6: migration-count mismatch refused (the assertion itself, migrate skipped)"
  WK_DEPLOY_TEST_PROJECT=stray WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: unexpected project accepted"; exit 1; }
  echo "selftest 3/6: unexpected project refused"
  WK_DEPLOY_TEST_LINK=absent WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: missing link accepted"; exit 1; }
  echo "selftest 4/6: absent/wrong project link refused BEFORE deploy"

  # GREEN PATH (round five, G2). Every case above proves a refusal fires. A
  # guard suite that only tests red passes while refusing everything — which
  # is exactly how the projectName and build-id bugs shipped. These two prove
  # the checks ACCEPT what they are supposed to accept.
  WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" --preflight "$(git rev-parse HEAD)" >/dev/null \
    || { echo "SELFTEST FAIL: correct sha + real project link REFUSED (green path broken)"; exit 1; }
  echo "selftest 5/6: correct sha and real project link accepted"

  GREEN=$(printf '{"id":"%s"}' "$(git rev-parse HEAD)" | extract_build_id)
  [[ "$GREEN" == "$(git rev-parse HEAD)" ]] \
    || { echo "SELFTEST FAIL: build-id extraction returned '$GREEN'"; exit 1; }
  echo "selftest 6/6: build-id extracted from its JSON body"

  echo "selftest PASSED: four refusals fire, two green paths accepted"
  exit 0
fi

# --preflight runs every check up to (not including) the deploy, then exits 0.
# Lets the green path be asserted without shipping anything.
PREFLIGHT=""
if [[ "${1:-}" == "--preflight" ]]; then PREFLIGHT=1; shift; fi

SHA="${1:-}"
[[ -n "$SHA" ]] || fail "expected main sha is a required argument"

# 1. The named-sha gate. NAME the sha from the merged PR (the merge commit
# GitHub shows), never derive it from the tree being deployed:
# $(git rev-parse HEAD) compares HEAD to itself and turns this gate into a
# no-op, which the 2026-07-28 0028 deploy demonstrated.
HEAD_SHA=$(git rev-parse HEAD)
[[ "$HEAD_SHA" == "$SHA"* ]] || fail "HEAD is $HEAD_SHA, expected $SHA. Pull and confirm the merge before deploying."

# The connection comes from the environment or, failing that, from
# .neon-connection at the repo root - read HERE, after this script's own cd,
# so a caller's working directory can never resolve it wrong (the cwd-drift
# failure, second occurrence 2026-07-28: $(cat .neon-connection) in the
# caller's shell resolved in apps/web and came through empty). By name,
# never echoed.
if [[ -z "${DATABASE_URL:-}" && -f .neon-connection ]]; then
  DATABASE_URL="$(cat .neon-connection)"; export DATABASE_URL
fi

# Required for the real path (migrate, and the database side of the count).
# Only the selftest hooks — which skip BOTH — may waive it; any real
# invocation, --preflight included, still refuses without it.
if [[ -z "${WK_DEPLOY_TEST_SKIP_MIGRATE:-}" || -z "${WK_DEPLOY_TEST_DB_COUNT:-}" ]]; then
  [[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set and .neon-connection is absent (never echo it)"
fi

# 3. Migrate (before the web deploy, always).
if [[ -z "${WK_DEPLOY_TEST_SKIP_MIGRATE:-}" ]]; then
  pnpm --filter @wellkept/schema db:migrate
fi

# 4. Migration count agrees three ways: disk, journal, database.
DISK=$(ls packages/schema/drizzle/*.sql | wc -l | tr -d ' ')
JOURNAL=$(node -e "console.log(require('./packages/schema/drizzle/meta/_journal.json').entries.length)")
if [[ "${WK_DEPLOY_TEST_DB_COUNT:-}" == "SKIP" ]]; then DB=$DISK; else
DB=${WK_DEPLOY_TEST_DB_COUNT:-$(node -e '
const pg=require("./apps/web/node_modules/pg");
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
c.connect().then(async()=>{const r=await c.query("SELECT count(*)::int n FROM drizzle.__drizzle_migrations");console.log(r.rows[0].n);await c.end();}).catch(e=>{console.error(e.message);process.exit(1);});
')}
fi
[[ "$DISK" == "$JOURNAL" && "$JOURNAL" == "$DB" ]] || fail "migration counts disagree: disk=$DISK journal=$JOURNAL database=$DB"
echo "migrations agree three ways: $DISK"

# 5. Deploy, from the repo root this script cd'd to itself.
if [[ -n "${WK_DEPLOY_TEST_PROJECT:-}" ]]; then
  PROJECT="$WK_DEPLOY_TEST_PROJECT"
else
  # G1 (round five): refuse BEFORE deploying - the failure mode is --yes
  # with an absent or wrong link file CREATING a project, so the check
  # after the deploy catches the stray only after it exists. Before is
  # the guard; the post-hoc read below is proof the guard worked.
  if [[ "${WK_DEPLOY_TEST_LINK:-}" == "absent" ]]; then LINKED=""; else
  LINKED=$(linked_project_id); fi
  [[ "$LINKED" == "$EXPECTED_PROJECT_ID" ]] || fail "repo root is linked to '${LINKED:-nothing}', expected $EXPECTED_PROJECT ($EXPECTED_PROJECT_ID). Refusing before a deploy can create a stray project. Run npx vercel link."
  # The green path stops here: everything a deploy depends on is proven, and
  # nothing has shipped.
  [[ -z "$PREFLIGHT" ]] || { echo "preflight OK: sha, migrations, and project link all verified (nothing deployed)"; exit 0; }
  npx vercel --prod --yes
  # 6. The deployment must have landed on the expected project, by id, not
  # merely succeeded (the stray-project failure a script would otherwise
  # inherit unchanged).
  PROJECT=$(linked_project_id); PROJECT="${PROJECT:-UNLINKED}"
fi
[[ "$PROJECT" == "$EXPECTED_PROJECT_ID" ]] || fail "deploy landed on project '$PROJECT', expected $EXPECTED_PROJECT ($EXPECTED_PROJECT_ID). Investigate before anything else; a stray project may exist."

# 7. Build id: three reads, all must equal the deployed sha (one stale
# read mid-alias-flip is known; three agreeing reads are the bar).
for i in 1 2 3; do
  sleep 5
  RAW=$(curl -fsS "$PROD_HOST/api/build-id")
  GOT=$(printf '%s' "$RAW" | extract_build_id)
  [[ "$GOT" == "$HEAD_SHA" ]] || fail "build-id read $i returned '${GOT:-<unparseable>}' (body: $RAW), expected $HEAD_SHA (re-run to retry; a persisting mismatch is real)"
done
echo "build-id verified x3: $HEAD_SHA"

# 8. Hand off to the mechanical smoke checks.
BASE="$PROD_HOST" bash tooling/smoke-mechanical.sh
echo "deploy.sh complete: $HEAD_SHA live on $EXPECTED_PROJECT. Work DEPLOY.md section 4's human checklist next."
