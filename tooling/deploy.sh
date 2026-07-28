#!/usr/bin/env bash
# Round four, session C: the deploy as a gate, not a ritual. Three
# deploy-adjacent sharp edges in two days ran on human attention; every
# other rule of that class became a guard. --yes is dangerous because it
# suppresses the only confirmation; it becomes safe when the checks that
# confirmation would have caught run FIRST and refuse.
#
# Usage:
#   DATABASE_URL=... bash tooling/deploy.sh <expected-main-sha>
#   bash tooling/deploy.sh --selftest      # prove the refusals fire
#
# Fail closed at every step: refuse and exit non-zero on any mismatch,
# never proceed-and-report. Same posture as the audit invariant, for the
# same reason. Covers the mechanical sequence only; DEPLOY.md section 4's
# human checklist still follows.
set -euo pipefail

EXPECTED_PROJECT="wellkept"
PROD_HOST="https://wellkept-orcin.vercel.app"

fail() { echo "REFUSED: $1" >&2; exit 1; }

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
  echo "selftest 4/6: absent project link refused BEFORE deploy"
  # GREEN paths - a guard suite that only proves its refusals passes while
  # refusing everything (learned live, first happy-path attempt).
  if [[ -f .vercel/project.json ]]; then
    WK_DEPLOY_TEST_STOP_AFTER_LINK=1 WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" "$(git rev-parse HEAD)" >/dev/null 2>&1 || { echo "SELFTEST FAIL: a REAL link was refused"; exit 1; }
    echo "selftest 5/6: real link accepted (green path)"
  else
    echo "selftest 5/6: SKIPPED (no .vercel link in this environment; run on the deploy machine for the full green path)"
  fi
  EX=$(echo '{"id":"abc123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).id??String(d).trim())}catch{console.log(String(d).trim())}})")
  [[ "$EX" == "abc123" ]] || { echo "SELFTEST FAIL: build-id JSON extraction broken"; exit 1; }
  echo "selftest 6/6: build-id extracted from JSON (green path)"
  echo "selftest PASSED: four refusals fire, two green paths accept"
  exit 0
fi

SHA="${1:-}"
[[ -n "$SHA" ]] || fail "expected main sha is a required argument"

# 1. The named-sha gate.
HEAD_SHA=$(git rev-parse HEAD)
[[ "$HEAD_SHA" == "$SHA"* ]] || fail "HEAD is $HEAD_SHA, expected $SHA. Pull and confirm the merge before deploying."

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set (never echo it; set it inline)"

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
  # The link file carries projectId/orgId only (no name) - checked live
  # 2026-07-28 after the first run refused every deploy on a fantasy key.
  if [[ "${WK_DEPLOY_TEST_LINK:-}" == "absent" ]]; then LINKED_ID=""; else
  LINKED_ID=$(node -e "console.log(require('./.vercel/project.json').projectId ?? '')" 2>/dev/null || echo ""); fi
  [[ -n "$LINKED_ID" ]] || fail "repo root has no Vercel link (.vercel/project.json absent or empty). Refusing before --yes can create a stray project. Run npx vercel link and select '$EXPECTED_PROJECT'."
  [[ -n "${WK_DEPLOY_TEST_STOP_AFTER_LINK:-}" ]] && { echo "link check passed (test stop)"; exit 0; }
  npx vercel --prod --yes
  # 6. Proof the guard worked: a stray creation REWRITES the link file
  # with the new project id, so an unchanged projectId means the deploy
  # landed on the project we were linked to.
  PROJECT=$(node -e "console.log(require('./.vercel/project.json').projectId ?? '')" 2>/dev/null || echo "UNLINKED")
fi
if [[ -n "${WK_DEPLOY_TEST_PROJECT:-}" ]]; then EXPECT_ID="$EXPECTED_PROJECT"; else EXPECT_ID="$LINKED_ID"; fi
[[ "$PROJECT" == "$EXPECT_ID" ]] || fail "the Vercel link changed during the deploy ('$PROJECT' vs '$EXPECT_ID') - a stray project was likely created. Investigate before anything else."

# 7. Build id: three reads, all must equal the deployed sha (one stale
# read mid-alias-flip is known; three agreeing reads are the bar).
for i in 1 2 3; do
  sleep 5
  GOT=$(curl -fsS "$PROD_HOST/api/build-id" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).id??String(d).trim())}catch{console.log(String(d).trim())}})")
  [[ "$GOT" == "$HEAD_SHA" ]] || fail "build-id read $i returned $GOT, expected $HEAD_SHA (re-run to retry; a persisting mismatch is real)"
done
echo "build-id verified x3: $HEAD_SHA"

# 8. Hand off to the mechanical smoke checks.
BASE="$PROD_HOST" bash tooling/smoke-mechanical.sh
echo "deploy.sh complete: $HEAD_SHA live on $EXPECTED_PROJECT. Work DEPLOY.md section 4's human checklist next."
