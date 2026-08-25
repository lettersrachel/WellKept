#!/usr/bin/env bash
# Round four, session C: the deploy as a gate, not a ritual. Three
# deploy-adjacent sharp edges in two days ran on human attention; every
# other rule of that class became a guard. --yes is dangerous because it
# suppresses the only confirmation; it becomes safe when the checks that
# confirmation would have caught run FIRST and refuse.
#
# Usage:
#   DATABASE_URL=... bash tooling/deploy.sh <expected-main-sha>
#   DATABASE_URL=... bash tooling/deploy.sh --preflight <sha>   # READ-ONLY: no migrate, no deploy
#   bash tooling/deploy.sh --selftest      # prove the refusals fire AND the green paths pass
#
# G-63 (2026-08-25): --preflight once RAN the migration, because the
# three-way count check needed migrations applied to count them; a flag
# that reads as a dry run performed the batch's least reversible step.
# Preflight is now structurally read-only: it REPORTS pending
# migrations instead of applying them, and the selftest proves the
# write path never fires under it (a pending migration stays pending
# through a preflight).
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
  # Prove the refusals, red before green (guard-must-fire). Cases that are
  # NOT about the origin/main gate pin it to HEAD via the selftest-only
  # override, so a dev tree with unpushed commits can still prove them.
  bash "$0" 0000000000000000000000000000000000000000 2>/dev/null && { echo "SELFTEST FAIL: wrong sha accepted"; exit 1; }
  echo "selftest 1/12: wrong sha refused"
  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_DB_COUNT=999 WK_DEPLOY_TEST_SKIP_MIGRATE=1 bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: count mismatch accepted"; exit 1; }
  echo "selftest 2/12: migration-count mismatch refused (the assertion itself, migrate skipped)"
  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_PROJECT=stray WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: unexpected project accepted"; exit 1; }
  echo "selftest 3/12: unexpected project refused"
  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_LINK=absent WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" "$(git rev-parse HEAD)" 2>/dev/null && { echo "SELFTEST FAIL: missing link accepted"; exit 1; }
  echo "selftest 4/12: absent/wrong project link refused BEFORE deploy"

  # Round seven, session T: the class case. A commit that EXISTS locally but
  # is not on origin/main must be refused, however the argument was produced.
  # This is the $(git rev-parse HEAD)-of-an-unpushed-tree failure, proven
  # with a dangling commit so the worktree is untouched.
  LOCAL_ONLY=$(git commit-tree "HEAD^{tree}" -p HEAD -m "deploy.sh selftest: local-only commit, never pushed")
  WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" "$LOCAL_ONLY" 2>/dev/null \
    && { echo "SELFTEST FAIL: a local-only sha (not on origin/main) was accepted"; exit 1; }
  echo "selftest 5/12: a sha that exists locally but is not on origin/main refused"

  # GREEN PATH (round five, G2). Every case above proves a refusal fires. A
  # guard suite that only tests red passes while refusing everything — which
  # is exactly how the projectName and build-id bugs shipped. These two prove
  # the checks ACCEPT what they are supposed to accept.
  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP bash "$0" --preflight "$(git rev-parse HEAD)" >/dev/null \
    || { echo "SELFTEST FAIL: correct sha + real project link REFUSED (green path broken)"; exit 1; }
  echo "selftest 6/12: correct sha and real project link accepted"

  GREEN=$(printf '{"id":"%s"}' "$(git rev-parse HEAD)" | extract_build_id)
  [[ "$GREEN" == "$(git rev-parse HEAD)" ]] \
    || { echo "SELFTEST FAIL: build-id extraction returned '$GREEN'"; exit 1; }
  echo "selftest 7/12: build-id extracted from its JSON body"

  # Env presence (2026-07-29): a rm-then-failed-add on WK_KMS_KEY left the
  # project with no key, and a routine deploy would have shipped a build
  # that throws on the vault and TOTP paths. Names only, never values.
  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP \
    WK_DEPLOY_TEST_ENV_LS=$' AUTH_SECRET Encrypted Production\n DATABASE_URL Encrypted Production\n REDIS_URL Encrypted Production\n RESEND_API_KEY Encrypted Production' \
    bash "$0" --preflight "$(git rev-parse HEAD)" >/dev/null 2>&1 \
    && { echo "SELFTEST FAIL: a project missing WK_KMS_KEY was accepted"; exit 1; }
  echo "selftest 8/12: missing required env var refused"

  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=SKIP \
    WK_DEPLOY_TEST_ENV_LS=$' WK_KMS_KEY Encrypted Production\n AUTH_SECRET Encrypted Production\n DATABASE_URL Encrypted Production\n REDIS_URL Encrypted Production\n RESEND_API_KEY Encrypted Production' \
    bash "$0" --preflight "$(git rev-parse HEAD)" >/dev/null \
    || { echo "SELFTEST FAIL: a complete env set was refused (green path broken)"; exit 1; }
  echo "selftest 9/12: complete env set accepted"

  # G-63, proven in both directions with a live sentinel rather than by
  # reading the code: the migrate path must fire in FULL mode and must
  # NEVER fire in preflight, whatever overrides are present.
  SENTINEL=$(mktemp -u)
  PF_OUT=$(WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_MIGRATE_CMD="touch $SENTINEL" WK_DEPLOY_TEST_DB_COUNT=1 \
    bash "$0" --preflight "$(git rev-parse HEAD)" 2>&1) \
    || { echo "SELFTEST FAIL: preflight refused a merely-behind database (pending is a report, not a refusal)"; exit 1; }
  [[ -e "$SENTINEL" ]] && { echo "SELFTEST FAIL: preflight FIRED the migrate path (G-63 regressed)"; exit 1; }
  printf '%s' "$PF_OUT" | grep -q "PENDING" \
    || { echo "SELFTEST FAIL: preflight did not report the pending migrations"; exit 1; }
  echo "selftest 10/12: preflight left a pending migration pending, and said so"

  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_MIGRATE_CMD="touch $SENTINEL" WK_DEPLOY_TEST_DB_COUNT=1 \
    bash "$0" "$(git rev-parse HEAD)" >/dev/null 2>&1 \
    && { echo "SELFTEST FAIL: full mode accepted a count mismatch"; exit 1; }
  [[ -e "$SENTINEL" ]] || { echo "SELFTEST FAIL: full mode never fired the migrate path (the write half is broken)"; exit 1; }
  rm -f "$SENTINEL"
  echo "selftest 11/12: full mode fires the migrate path (then refuses the mismatched count downstream)"

  WK_DEPLOY_TEST_ORIGIN_MAIN=HEAD WK_DEPLOY_TEST_SKIP_MIGRATE=1 WK_DEPLOY_TEST_DB_COUNT=999 \
    bash "$0" --preflight "$(git rev-parse HEAD)" >/dev/null 2>&1 \
    && { echo "SELFTEST FAIL: preflight accepted a database AHEAD of the tree"; exit 1; }
  echo "selftest 12/12: preflight refuses a stale tree (database ahead of disk)"

  echo "selftest PASSED: eight refusals fire, four green paths accepted"
  exit 0
fi

# --preflight runs every check up to (not including) the deploy, then exits 0.
# Lets the green path be asserted without shipping anything.
PREFLIGHT=""
if [[ "${1:-}" == "--preflight" ]]; then PREFLIGHT=1; shift; fi

SHA="${1:-}"
[[ -n "$SHA" ]] || fail "expected main sha is a required argument"

# 1. The named-sha gate, made independent of its argument (round seven T).
# All three deploy failures were arguments computed in the caller's shell
# defeating a correct script; this gate now verifies the named sha against
# origin/main, an external source of truth since branch protection landed.
# A sha that exists only locally (an unpushed HEAD, $(git rev-parse HEAD)
# of a stray tree) cannot satisfy it however the argument was produced.
# Being on origin/main also implies the required checks were green, since
# branch protection refuses the merge without them: the check-status half
# of the brief needs no API call and no token.
#
# WK_DEPLOY_TEST_ORIGIN_MAIN is honored ONLY in selftest mode (both skip
# hooks set), so selftest cases about OTHER refusals can run on a dev tree
# whose HEAD is not yet pushed; a real invocation always compares against
# the real origin/main.
SELFTEST_MODE=""
{ [[ -n "${WK_DEPLOY_TEST_SKIP_MIGRATE:-}" || -n "${WK_DEPLOY_TEST_MIGRATE_CMD:-}" ]] && [[ -n "${WK_DEPLOY_TEST_DB_COUNT:-}" ]]; } && SELFTEST_MODE=1
MAIN_REF="origin/main"
[[ -n "$SELFTEST_MODE" && -n "${WK_DEPLOY_TEST_ORIGIN_MAIN:-}" ]] && MAIN_REF="$WK_DEPLOY_TEST_ORIGIN_MAIN"

FULL_SHA=$(git rev-parse --verify --quiet "${SHA}^{commit}") \
  || fail "sha '$SHA' resolves to no commit here. Pull, then name the merge commit from the merged PR."
if [[ -z "$SELFTEST_MODE" ]]; then
  git fetch origin main --quiet || fail "could not fetch origin/main to verify the named sha"
fi
git merge-base --is-ancestor "$FULL_SHA" "$MAIN_REF" \
  || fail "sha $FULL_SHA is not on $MAIN_REF. Name the merge commit from the merged PR; a locally derived sha cannot pass this gate."
HEAD_SHA=$(git rev-parse HEAD)
[[ "$HEAD_SHA" == "$FULL_SHA" ]] || fail "HEAD is $HEAD_SHA, expected $FULL_SHA. Pull and confirm the merge before deploying."
# The deploy ships the WORKING TREE (vercel uploads the directory, not the
# commit), so a dirty tree deploys unreviewed state under a clean sha.
# Selftest mode skips this: a dev tree proving refusals is dirty by nature.
if [[ -z "$SELFTEST_MODE" ]]; then
  [[ -z "$(git status --porcelain)" ]] || fail "working tree is dirty; the deploy ships the tree, not the sha. Commit or stash first."
fi

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
# Only the selftest hooks may waive it; any real invocation, --preflight
# included, still refuses without it (preflight READS the count).
if [[ -z "$SELFTEST_MODE" ]]; then
  [[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set and .neon-connection is absent (never echo it)"
fi

# 3. Migrate (before the web deploy, always) - NEVER in preflight (G-63:
# preflight is read-only; pending migrations are REPORTED at step 4).
# The preflight branch comes FIRST so no override can reach the write.
if [[ -n "$PREFLIGHT" ]]; then
  : # read-only mode: nothing is applied here
elif [[ -n "$SELFTEST_MODE" && -n "${WK_DEPLOY_TEST_MIGRATE_CMD:-}" ]]; then
  eval "$WK_DEPLOY_TEST_MIGRATE_CMD" # selftest sentinel: proves whether this path fired
elif [[ -z "${WK_DEPLOY_TEST_SKIP_MIGRATE:-}" ]]; then
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
if [[ -n "$PREFLIGHT" ]]; then
  # Read-only mode: the tree must agree with itself, and a database
  # BEHIND the tree is the expected pre-deploy state, reported never
  # applied. A database AHEAD of the tree means this tree is stale.
  [[ "$DISK" == "$JOURNAL" ]] || fail "migration counts disagree in the tree itself: disk=$DISK journal=$JOURNAL"
  if (( DB < DISK )); then
    echo "preflight: $((DISK-DB)) migration(s) PENDING (database $DB, disk $DISK). NOTHING was applied; the full run applies them."
  elif (( DB > DISK )); then
    fail "database has MORE migrations ($DB) than this tree ($DISK); this tree is behind the deployed schema. Pull before deploying."
  else
    echo "migrations agree three ways: $DISK (nothing pending)"
  fi
else
  [[ "$DISK" == "$JOURNAL" && "$JOURNAL" == "$DB" ]] || fail "migration counts disagree: disk=$DISK journal=$JOURNAL database=$DB"
  echo "migrations agree three ways: $DISK"
fi

# 4b. Required env vars EXIST on the production environment, by NAME only
# (values are never read; sensitive vars cannot be read anyway). Added
# 2026-07-29: a rm-then-failed-add left the project with no WK_KMS_KEY,
# and a routine deploy would have shipped a build that throws on the
# vault and TOTP paths while every other check stayed green. The app
# validates the KEY'S SHAPE at boot; this validates its PRESENCE before
# anything ships. Word-bounded match so DATABASE_URL cannot be satisfied
# by DATABASE_URL_UNPOOLED (the inputs doctrine: a plausible bad input).
REQUIRED_ENVS=(WK_KMS_KEY AUTH_SECRET DATABASE_URL REDIS_URL RESEND_API_KEY)
if [[ -n "${WK_DEPLOY_TEST_ENV_LS:-}" ]]; then
  ENV_LS="$WK_DEPLOY_TEST_ENV_LS"
elif [[ -n "$SELFTEST_MODE" ]]; then
  ENV_LS="" # selftest cases about other refusals skip this check
else
  ENV_LS=$(npx vercel env ls production 2>&1) \
    || fail "could not list the project's env vars (vercel env ls production); refusing to ship a build with unknown configuration"
fi
if [[ -n "$ENV_LS" ]]; then
  for v in "${REQUIRED_ENVS[@]}"; do
    printf '%s\n' "$ENV_LS" | grep -qE "(^|[^A-Za-z0-9_])$v([^A-Za-z0-9_]|$)" \
      || fail "required env var $v is MISSING from the production environment; a deploy would ship a build that throws when it is first needed. Add it in the Vercel dashboard, then re-run."
  done
  echo "required env vars present by name: ${REQUIRED_ENVS[*]}"
fi

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
  [[ -z "$PREFLIGHT" ]] || { echo "preflight OK: sha, tree, migration state, env, and project link verified READ-ONLY (nothing deployed, nothing migrated)"; exit 0; }
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
