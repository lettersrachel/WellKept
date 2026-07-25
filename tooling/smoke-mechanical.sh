#!/usr/bin/env bash
# The mechanical smoke checks (DEPLOY §4 items 1, 4, 12) — the ones a script
# can prove without a browser. Fails non-zero on the first failed check;
# never echoes DATABASE_URL or any secret.
#
#   BASE=https://wellkept-orcin.vercel.app [DATABASE_URL=...] bash tooling/smoke-mechanical.sh
#
# Check 12 needs DATABASE_URL; without it the check is SKIPPED with a warning
# (a missing app_setting key is a missing knob — run it with the URL before
# calling the checklist done). With the URL it inserts the intended values
# where absent, per the checklist's own instruction.
set -u
BASE="${BASE:?Set BASE to the deployed origin, e.g. https://wellkept-orcin.vercel.app}"
fail=0

say()  { printf '  %-4s %s\n' "$1" "$2"; }
need() { if [ "$1" = "0" ]; then say PASS "$2"; else say FAIL "$2"; fail=1; fi; }

echo "smoke-mechanical against $BASE"

# 1. Health: {"ok":true,"db":"up"}
body="$(curl -sS --max-time 15 "$BASE/api/health" || true)"
echo "$body" | grep -q '"ok":true' && echo "$body" | grep -q '"db":"up"'
need $? "check 1: /api/health reports ok + db up"

# 4. Both dev-gated surfaces 404 in production.
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$BASE/dev/last-email" || true)"
[ "$code" = "404" ]; need $? "check 4a: /dev/last-email -> 404 (got $code)"
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -X POST -H 'content-type: application/json' -d '{}' "$BASE/api/dev/trigger-pass" || true)"
[ "$code" = "404" ]; need $? "check 4b: POST /api/dev/trigger-pass -> 404 (got $code)"

# 12. app_setting knobs exist with intended values (insert if absent).
# The node block prints per-key DETAIL lines only; the single PASS/FAIL
# verdict for check 12 comes from `need` below — one verdict per check.
if [ -n "${DATABASE_URL:-}" ]; then
  ( cd "$(dirname "$0")/../apps/web" && node --input-type=module - <<'EOF'
import pg from "pg";
const WANT = {
  photo_retention: { days: 90 },
  rule_health: { actRateFloor: 0.25, minHouseholds: 3, minUsers: 2 },
};
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
let bad = 0;
for (const [key, want] of Object.entries(WANT)) {
  const { rows: [row] } = await c.query("SELECT value FROM app_setting WHERE key=$1", [key]);
  if (!row) {
    await c.query("INSERT INTO app_setting (key, value, updated_at) VALUES ($1, $2, now())", [key, JSON.stringify(want)]);
    // REPAIRED, not silently PASS: the operator should know the knob was
    // missing and the script created it — that is a finding worth reading.
    console.log(`         ${key}: REPAIRED — was absent, inserted intended value`);
  } else {
    const missing = Object.keys(want).filter((k) => !(k in row.value));
    if (missing.length) { console.log(`         ${key}: exists but lacks ${missing.join(", ")}`); bad = 1; }
    else console.log(`         ${key}: present (${JSON.stringify(row.value)})`);
  }
}
await c.end();
process.exit(bad);
EOF
  )
  need $? "check 12: app_setting knobs (detail above; REPAIRED counts as pass but read it)"
else
  say SKIP "check 12: DATABASE_URL not set — knobs NOT verified; re-run with it before calling the checklist done"
fi

echo
if [ "$fail" = "0" ]; then echo "mechanical checks: ALL PASS (manual checks 2-3, 5-11, 13-14 remain)"; else echo "mechanical checks: FAILURE — stop here; the failed check is the session's finding"; fi
exit "$fail"
