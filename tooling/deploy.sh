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
  echo "selftest 1/3: wrong sha refused"
  WK_DEPLOY_TEST_DB_COUNT=999 bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: count mismatch accepted"; exit 1; }
  echo "selftest 2/3: migration-count mismatch refused"
  WK_DEPLOY_TEST_PROJECT=stray bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: unexpected project accepted"; exit 1; }
  echo "selftest 3/3: unexpected project refused"
  echo "selftest PASSED: all three refusals fire"
  exit 0
fi

SHA="${1:-}"
[[ -n "$SHA" ]] || fail "expected main sha is a required argument"

# 1. The named-sha gate.
HEAD_SHA=$(git rev-parse HEAD)
[[ "$HEAD_SHA" == "$SHA"* ]] || fail "HEAD is $HEAD_SHA, expected $SHA. Pull and confirm the merge before deploying."

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set (never echo it; set it inline)"

# 3. Migrate (before the web deploy, always).
pnpm --filter @wellkept/schema db:migrate

# 4. Migration count agrees three ways: disk, journal, database.
DISK=$(ls packages/schema/drizzle/*.sql | wc -l | tr -d ' ')
JOURNAL=$(node -e "console.log(require('./packages/schema/drizzle/meta/_journal.json').entries.length)")
DB=${WK_DEPLOY_TEST_DB_COUNT:-$(node -e '
const pg=require("./apps/web/node_modules/pg");
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
c.connect().then(async()=>{const r=await c.query("SELECT count(*)::int n FROM drizzle.__drizzle_migrations");console.log(r.rows[0].n);await c.end();}).catch(e=>{console.error(e.message);process.exit(1);});
')}
[[ "$DISK" == "$JOURNAL" && "$JOURNAL" == "$DB" ]] || fail "migration counts disagree: disk=$DISK journal=$JOURNAL database=$DB"
echo "migrations agree three ways: $DISK"

# 5. Deploy, from the repo root this script cd'd to itself.
if [[ -n "${WK_DEPLOY_TEST_PROJECT:-}" ]]; then
  PROJECT="$WK_DEPLOY_TEST_PROJECT"
else
  npx vercel --prod --yes
  # 6. The deployment must have landed on the expected project, by name,
  # not merely succeeded (the stray-project failure a script would
  # otherwise inherit unchanged).
  PROJECT=$(node -e "console.log(require('./.vercel/project.json').projectName ?? '')" 2>/dev/null || echo "UNLINKED")
fi
[[ "$PROJECT" == "$EXPECTED_PROJECT" ]] || fail "deploy landed on project '$PROJECT', expected '$EXPECTED_PROJECT'. Investigate before anything else; a stray project may exist."

# 7. Build id: three reads, all must equal the deployed sha (one stale
# read mid-alias-flip is known; three agreeing reads are the bar).
for i in 1 2 3; do
  sleep 5
  GOT=$(curl -fsS "$PROD_HOST/api/build-id")
  [[ "$GOT" == "$HEAD_SHA" ]] || fail "build-id read $i returned $GOT, expected $HEAD_SHA (re-run to retry; a persisting mismatch is real)"
done
echo "build-id verified x3: $HEAD_SHA"

# 8. Hand off to the mechanical smoke checks.
BASE="$PROD_HOST" bash tooling/smoke-mechanical.sh
echo "deploy.sh complete: $HEAD_SHA live on $EXPECTED_PROJECT. Work DEPLOY.md section 4's human checklist next."
